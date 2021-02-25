// import { Geometry } from "three/examples/jsm/deprecated/Geometry";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer";
import { HalfFloatType } from "three";
import { Clock } from "three";
import { Points } from "three";
import { ShaderMaterial } from "three";
import { BufferGeometry } from "three";
import { BufferAttribute } from "three";
import { Vector3 } from "three";
import { Mesh } from "three";
import { SphereBufferGeometry } from "three";
import { MeshNormalMaterial } from "three";
import { MathUtils } from "three/src/Three";

export const Ballify = /* glsl */ `
#define M_PI 3.1415926535897932384626433832795

float atan2(in float y, in float x) {
  bool xgty = (abs(x) > abs(y));
  return mix(M_PI / 2.0 - atan(x,y), atan(y,x), float(xgty));
}

vec3 fromBall(float r, float az, float el) {
  return vec3(
    r * cos(el) * cos(az),
    r * cos(el) * sin(az),
    r * sin(el)
  );
}
void toBall(vec3 pos, out float az, out float el) {
  az = atan2(pos.y, pos.x);
  el = atan2(pos.z, sqrt(pos.x * pos.x + pos.y * pos.y));
}

// float az = 0.0;
// float el = 0.0;
// vec3 noiser = vec3(lastVel);
// toBall(noiser, az, el);
// lastVel.xyz = fromBall(1.0, az, el);

vec3 ballify (vec3 pos, float r) {
  float az = atan2(pos.y, pos.x);
  float el = atan2(pos.z, sqrt(pos.x * pos.x + pos.y * pos.y));
  return vec3(
    r * cos(el) * cos(az),
    r * cos(el) * sin(az),
    r * sin(el)
  );
}
`;
export class Simulator {
  constructor({ ...mini }, name = "Simulator") {
    this.mini = {
      ...mini,
    };

    this.mini.set(name, this);

    this.balls = [
      {
        position: new Vector3(0.0, 0.0, 0.0),
        radius: 1.5,
      },
      {
        position: new Vector3(0.5, 0.0, 0.0),
        radius: 0.35,
      },
      {
        position: new Vector3(2.0, -2.0, 0.0),
        radius: 1.4,
      },
      {
        position: new Vector3(-1.5, -4.0, 0.0),
        radius: 1.4,
      },
    ];

    this.SIZE = 256;

    this.setupSimulator();
    this.particles();
    this.interaction();
  }
  async interaction() {
    let mouse = await this.mini.get("mouse");
    let camera = await this.mini.get("camera");

    window.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      camera.position.z += ev.deltaY * 0.01;
    });

    this.mini.onLoop(() => {
      camera.position.x = MathUtils.lerp(camera.position.x, mouse.x, 0.5);
      camera.lookAt(0.0, 0.0, 0.0);
    });
  }

  async setupSimulator() {
    let mouse = await this.mini.get("mouse");
    let renderer = await this.mini.get("renderer");
    let scene = await this.mini.get("scene");

    let SIZE = this.SIZE;
    this.tick = 0;
    this.clock = new Clock();
    this.gpuCompute = new GPUComputationRenderer(SIZE, SIZE, renderer);
    if (/iPad|iPhone|iPod/.test(navigator.platform)) {
      this.gpuCompute.setDataType(HalfFloatType);
    }

    let eachBallCode = ``;

    for (let i = 0; i < this.balls.length; i++) {
      let ball = this.balls[i];
      eachBallCode += `collision(pos, vel,
        vec3(${ball.position.x.toFixed(3)}, ${ball.position.y.toFixed(
        3
      )}, ${ball.position.z.toFixed(3)}),
        ${ball.radius.toFixed(3)},

        ${i === 0.0}
      );`;
    }

    this.shaderCode = /* glsl */ `
      #include <common>

      precision highp float;
      uniform sampler2D nowPosTex;
      uniform sampler2D lastPosTex;
      uniform float dT;
      uniform float eT;

      uniform sampler2D collidersPositionTex;
      uniform sampler2D collidersRadiusTex;

      uniform mat4 sceneModelViewMatrix;

      uniform vec3 mouseNow;
      uniform vec3 mouseLast;

      ${Ballify}

      void collision (inout vec4 position, inout vec3 velocity, vec3 colliderPosition, float radius, bool isMouse) {
        vec3 dif = (colliderPosition) - position.xyz;
        if (isMouse) {
          dif = (mouseNow) - position.xyz;;
        }
        vec3 mouseForce = mouseNow - mouseLast;
        float extraForce = 2.0;
        if( length( dif ) < radius ){
          velocity -= normalize(dif) * dT * 1.0;
          if (isMouse) {
            velocity += mouseForce * dT * extraForce;
          }
        }
      }

      void main(void) {
        vec2 uv = gl_FragCoord.xy / resolution.xy;

        vec4 pos = texture2D(nowPosTex, uv);
        vec4 oPos = texture2D(lastPosTex, uv);

        float life = pos.w;

        vec3 vel = pos.xyz - oPos.xyz;

        life -= .01 * ( rand( uv ) + 0.1 );

        if( life > 1. ){
          vel = vec3( 0. );
          pos.xyz = vec3(
            -0.5 + rand(uv + 0.1),
            -0.5 + rand(uv + 0.2),
            -0.5 + rand(uv + 0.3)
          );

          pos.xyz *= 0.5;
          pos.xyz = ballify(pos.xyz, 0.3);
          pos.y += 2.0;
          life = .99;
        }

        float bottomLimit = -7.0 + rand(uv + 0.1);

        if( life < 0. || pos.y <= bottomLimit ){
          vel = vec3( 0. );
          pos.xyz = vec3(
            -0.5 + rand(uv + 0.1),
            -0.5 + rand(uv + 0.2),
            -0.5 + rand(uv + 0.3)
          );
          pos.xyz *= 0.5;
          pos.xyz = ballify(pos.xyz, 0.3);
          pos.y += 2.0;
          life = 1.1;
        }

        // gravity
        vel += vec3( 0.0 , -.003 , 0. );

        // wind
        vel += vec3( 0.001 * life, 0.0, 0.0 );

        ${eachBallCode}

        vel *= .96; // dampening

        vec3 p = pos.xyz + vel;
        gl_FragColor = vec4( p , life );

      }
      `;

    // scene;

    let geoBall = new SphereBufferGeometry(1, 80, 80);
    let matBall = new MeshNormalMaterial();
    this.balls.forEach((ball, idx) => {
      let ballMesh = new Mesh(geoBall, matBall);
      scene.add(ballMesh);

      this.mini.onLoop(() => {
        ballMesh.scale.set(ball.radius, ball.radius, ball.radius);
        ballMesh.position.copy(ball.position);

        if (idx === 0.0) {
          ball.position.copy(mouseNow);
          ballMesh.position.copy(mouseNow);
        }
      });
    });

    let mouseNow = new Vector3().copy(mouse);
    let mouseLast = new Vector3().copy(mouse);

    this.mini.onLoop(() => {
      mouseLast.copy(mouseNow);
      mouseNow.copy(mouse);
    });

    this.filter0 = this.gpuCompute.createShaderMaterial(this.shaderCode, {
      mouseNow: {
        value: mouseNow,
      },
      mouseLast: {
        value: mouseLast,
      },
      //
      collidersPosition: {
        value: null,
      },
      collidersRadius: {
        value: null,
      },

      //
      nowPosTex: { value: null },
      lastPosTex: { value: null },
      dT: { value: 0 },
      eT: { value: 0 },
    });

    this.rtt0 = this.gpuCompute.createRenderTarget();
    this.rtt1 = this.gpuCompute.createRenderTarget();
    this.rtt2 = this.gpuCompute.createRenderTarget();

    this.loopRTT = [this.rtt0, this.rtt1, this.rtt2];

    let prepInitTexture = () => {
      var initTexture = this.gpuCompute.createTexture();
      let idx = 0;
      let data = initTexture.image.data;
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          data[idx * 4 + 0] = Math.random() - 0.5;
          data[idx * 4 + 1] = Math.random() - 0.5;
          data[idx * 4 + 2] = Math.random() - 0.5;
          data[idx * 4 + 3] = 0.0;
          idx++;
        }
      }

      this.gpuCompute.renderTexture(initTexture, this.loopRTT[0]);
      this.gpuCompute.renderTexture(initTexture, this.loopRTT[1]);
      this.gpuCompute.renderTexture(initTexture, this.loopRTT[2]);
    };

    prepInitTexture();
  }

  async particles() {
    let scene = await this.mini.get("scene");

    // let camera = await this.mini.get("camera");
    // let sceneUI = await this.mini.get("sceneUI");
    // let cameraUI = await this.mini.get("cameraUI");

    let geoPt = new BufferGeometry();
    let uv = [];
    for (let y = 0; y < this.SIZE; y++) {
      for (let x = 0; x < this.SIZE; x++) {
        uv.push(y / this.SIZE, x / this.SIZE, 0.0);
      }
    }

    geoPt.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 3));
    geoPt.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(uv), 3)
    );
    let matPt = new ShaderMaterial({
      uniforms: {
        nowPosTex: {
          value: null,
        },
      },
      vertexShader: /* glsl */ `
          uniform sampler2D nowPosTex;
          void main (void) {
            vec3 pos = texture2D(nowPosTex, uv.xy).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = 1.0;
          }
          `,
      fragmentShader: /* glsl */ `
          void main (void) {
            gl_FragColor = vec4(0.7, 0.7, 1.0, 1.0);
          }
          `,
    });
    let particles = new Points(geoPt, matPt);
    particles.frustumCulled = false;
    scene.add(particles);

    this.mini.onLoop(() => {
      if (this.filter0) {
        this.compute();
        let outdata = this.loopRTT[2];
        matPt.uniforms.nowPosTex.value = outdata.texture;
      }
    });
  }

  compute() {
    if (this.tick % 3 === 0) {
      this.loopRTT = [this.rtt0, this.rtt1, this.rtt2];
    } else if (this.tick % 3 === 1) {
      this.loopRTT = [this.rtt2, this.rtt0, this.rtt1];
    } else if (this.tick % 3 === 2) {
      this.loopRTT = [this.rtt1, this.rtt2, this.rtt0];
    }

    this.filter0.uniforms.nowPosTex.value = this.loopRTT[0].texture;
    this.filter0.uniforms.lastPosTex.value = this.loopRTT[1].texture;
    this.filter0.uniforms.dT.value = this.clock.getDelta();
    this.filter0.uniforms.eT.value = this.clock.getElapsedTime();

    this.gpuCompute.doRenderTarget(this.filter0, this.loopRTT[2]);

    this.tick++;
  }

  clean() {
    console.log("cleanup Simulator");
  }
}

/*

    // Originally sourced from https://www.shadertoy.com/view/ldfSWs
    // Thank you Iñigo :)

    vec3 calcNormal(vec3 pos, float eps) {
      const vec3 v1 = vec3( 1.0,-1.0,-1.0);
      const vec3 v2 = vec3(-1.0,-1.0, 1.0);
      const vec3 v3 = vec3(-1.0, 1.0,-1.0);
      const vec3 v4 = vec3( 1.0, 1.0, 1.0);

      return normalize( v1 * map( pos + v1*eps ).x +
      v2 * map( pos + v2*eps ).x +
      v3 * map( pos + v3*eps ).x +
      v4 * map( pos + v4*eps ).x );
    }

    vec3 calcNormal(vec3 pos) {
      return calcNormal(pos, 0.002);
    }

    */
