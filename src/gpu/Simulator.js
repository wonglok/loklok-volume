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

const visibleHeightAtZDepth = (depth, camera) => {
  // compensate for cameras not positioned at z=0
  const cameraOffset = camera.position.z;
  if (depth < cameraOffset) depth -= cameraOffset;
  else depth += cameraOffset;

  // vertical fov in radians
  const vFOV = (camera.fov * Math.PI) / 180;

  // Math.abs to ensure the result is always positive
  return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
};

const visibleWidthAtZDepth = (depth, camera) => {
  const height = visibleHeightAtZDepth(depth, camera);
  return height * camera.aspect;
};

export class Simulator {
  constructor({ ...mini }, name = "Simulator") {
    this.mini = {
      ...mini,
    };

    this.mini.set(name, this);

    this.balls = [
      {
        init: new Vector3(0.0, -3.0, 0.0),
        position: new Vector3(0.0, -3.0, 0.0),
        positionLast: new Vector3(0.0, -3.0, 0.0),
        radius: 1,
      },

      {
        init: new Vector3(2.5, -4.0, 0.0),
        position: new Vector3(2.5, -4.0, 0.0),
        positionLast: new Vector3(2.5, -4.0, 0.0),
        radius: 1.4,
      },
    ];

    this.SIZE = 128;

    this.setupSimulator();
    this.particles();
    this.interaction();
  }
  async interaction() {
    let camera = await this.mini.get("camera");
    let renderer = await this.mini.get("renderer");
    let mouse = new Vector3(1000000, 10000000, 0);
    let rect = renderer.domElement.getBoundingClientRect();
    this.mini.onResize(() => {
      rect = renderer.domElement.getBoundingClientRect();
    });
    renderer.domElement.addEventListener("mousemove", (evt) => {
      let height = visibleHeightAtZDepth(camera.position.z, camera) * 0.5;
      let width = visibleWidthAtZDepth(camera.position.z, camera) * 0.5;
      mouse.setX(((evt.clientX - rect.width * 0.5) / rect.width) * width);
      mouse.setY(((rect.height * 0.5 - evt.clientY) / rect.height) * height);
    });
    renderer.domElement.addEventListener(
      "touchstart",
      (ev) => {
        ev.preventDefault();
      },
      { passive: false }
    );
    renderer.domElement.addEventListener(
      "touchmove",
      (evt) => {
        evt.preventDefault();
        let height = visibleHeightAtZDepth(camera.position.z, camera) * 0.5;
        let width = visibleWidthAtZDepth(camera.position.z, camera) * 0.5;
        mouse.setX(
          ((evt.touches[0].clientX - rect.width * 0.5) / rect.width) * width
        );
        mouse.setY(
          ((rect.height * 0.5 - evt.touches[0].clientY) / rect.height) * height
        );
      },
      { passive: false }
    );
    this.mini.onLoop(() => {
      this.balls[0].positionLast.copy(this.balls[0].position);
      this.balls[0].position.copy(mouse);
    });
  }
  async setupSimulator() {
    let scope = this;
    let renderer = await this.mini.get("renderer");
    let scene = await this.mini.get("scene");

    let SIZE = this.SIZE;
    this.tick = 0;
    this.clock = new Clock();
    this.gpuCompute = new GPUComputationRenderer(SIZE, SIZE, renderer);
    if (/iPad|iPhone|iPod/.test(navigator.platform)) {
      this.gpuCompute.setDataType(HalfFloatType);
    }

    var initTexture = this.gpuCompute.createTexture();
    let prepInitTexture = () => {
      let idx = 0;
      let data = initTexture.image.data;
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          data[idx * 4 + 0] = Math.random() - 0.5;
          data[idx * 4 + 1] = Math.random() - 0.5;
          data[idx * 4 + 2] = Math.random() - 0.5;
          data[idx * 4 + 3] = Math.random() * 0.5;
          idx++;
        }
      }
    };
    prepInitTexture();

    this.shaderCode = /* glsl */ `
      #include <common>

      precision highp float;
      uniform sampler2D initTexture;
      uniform sampler2D nowPosTex;
      uniform sampler2D lastPosTex;
      uniform float dT;
      uniform float eT;

      const int colliders = COLLIDERS;
      uniform vec3[colliders] collidersPosition;
      uniform vec3[colliders] collidersPositionLast;
      uniform float[colliders] collidersRadius;

      void main(void) {
        vec2 uv = gl_FragCoord.xy / resolution.xy;

        vec4 initPosition = texture2D(initTexture, uv);
        vec4 pos = texture2D(nowPosTex, uv);
        vec4 oPos = texture2D(lastPosTex, uv);

        float life = pos.w;
        vec3 vel = pos.xyz - oPos.xyz;

        life -= .01 * ( rand( uv ) + .1 );

        if( life > 1. ){
          vel = vec3( 0. );
          pos.xyz = vec3(
            -0.5 + rand(uv + 0.1),
            -0.5 + rand(uv + 0.2),
            -0.5 + rand(uv + 0.3)
          );
          life = .99;
        }

        if( life < 0. ){
          vel = vec3( 0. );
          pos.xyz = vec3(
            -0.5 + rand(uv + 0.1),
            -0.5 + rand(uv + 0.2),
            -0.5 + rand(uv + 0.3)
          );
          life = 1.1;
        }

        // gravity
        vel += vec3( 0. , -.002 , 0. );

        // wind
        vel += vec3( 0.001 * life, 0.0, 0.0 );

        for( int i = 0; i < colliders; i++ ){
          vec3 colliderPos = collidersPosition[i];
          vec3 colliderPosLast = collidersPositionLast[i];
          float radius = collidersRadius[i];

          vec3 dif = colliderPos - pos.xyz;
          vec3 ballVel = colliderPos - colliderPosLast;
          float extraForce = 2.0;
          if( length( dif ) < radius ){
            vel -= normalize(dif) * dT * 1.0;
            vel += ballVel * dT * extraForce;
          }
        }

        vel *= .96; // dampening

        vec3 p = pos.xyz + vel;
        gl_FragColor = vec4( p , life );

      }
      `;

    // scene;

    let geoBall = new SphereBufferGeometry(1, 80, 80);
    let matBall = new MeshNormalMaterial();
    this.balls.forEach((ball) => {
      let ballMesh = new Mesh(geoBall, matBall);
      scene.add(ballMesh);

      this.mini.onLoop(() => {
        ballMesh.scale.set(ball.radius, ball.radius, ball.radius);
        ballMesh.position.copy(ball.position);
      });
    });

    this.filter0 = this.gpuCompute.createShaderMaterial(this.shaderCode, {
      //
      collidersPosition: {
        type: "v3v",
        get value() {
          return scope.balls.map((b) => b.position);
        },
      },
      collidersPositionLast: {
        type: "v3v",
        get value() {
          return scope.balls.map((b) => b.positionLast);
        },
      },
      collidersRadius: {
        get value() {
          return scope.balls.map((b) => b.radius);
        },
      },

      //
      initTexture: { value: initTexture },
      nowPosTex: { value: null },
      lastPosTex: { value: null },
      dT: { value: 0 },
      eT: { value: 0 },
    });

    this.filter0.defines = {
      resolution: `vec2(${SIZE.toFixed(1)}, ${SIZE.toFixed(1)})`,
      get COLLIDERS() {
        return `${scope.filter0.uniforms.collidersPosition.value.length.toFixed(
          0
        )}`;
      },
    };

    this.rtt0 = this.gpuCompute.createRenderTarget();
    this.rtt1 = this.gpuCompute.createRenderTarget();
    this.rtt2 = this.gpuCompute.createRenderTarget();

    this.loopRTT = [this.rtt0, this.rtt1, this.rtt2];

    this.gpuCompute.renderTexture(initTexture, this.loopRTT[0]);
    this.gpuCompute.renderTexture(initTexture, this.loopRTT[1]);
    this.gpuCompute.renderTexture(initTexture, this.loopRTT[2]);
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
        uv.push(y / this.SIZE, x / this.SIZE);
      }
    }
    geoPt.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
    geoPt.setAttribute("position", geoPt.attributes.uv.clone());
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
