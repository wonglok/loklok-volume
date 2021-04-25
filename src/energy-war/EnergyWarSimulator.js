// import { Geometry } from "three/examples/jsm/deprecated/Geometry";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer";
import {
  Color,
  DirectionalLight,
  HalfFloatType,
  MeshStandardMaterial,
  PointLight,
} from "three";
//
import { Clock } from "three";
import { Points } from "three";
import { ShaderMaterial } from "three";
import { BufferGeometry } from "three";
import { BufferAttribute } from "three";
import { Vector3 } from "three";
import { Mesh } from "three";
import { SphereBufferGeometry } from "three";
import { MeshNormalMaterial } from "three";
import { MathUtils } from "three";
import { BoxBufferGeometry } from "three";

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

export class EnergyWarSimulator {
  constructor({ ...mini }, name = "EnergySimulator") {
    this.mini = {
      ...mini,
    };

    this.mini.set(name, this);

    this.balls = [
      {
        type: "mouse-sphere",
        radius: 1.5,
      },
      {
        type: "static-sphere",
        position: new Vector3(0.9, 1.8, 0.0),
        radius: 1.3,
      },
      {
        type: "static-sphere",
        position: new Vector3(3.0, -2.0, 0.0),
        radius: 1.8,
      },
      {
        type: "static-sphere",
        position: new Vector3(-1.5, -4.0, 0.0),
        radius: 1.4,
      },
      {
        type: "static-box",
        position: new Vector3(0.0, -6.0, 0.0),
        boxSize: new Vector3(5.0, 0.15, 5.0),
      },
      {
        type: "static-box",
        position: new Vector3(-0.9, 0.0, 0.0),
        boxSize: new Vector3(1.0, 0.1, 1.0),
      },
    ];

    this.SIZE = 256;

    this.setupSimulator();
    this.particles();
    // this.interaction();
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

    let mouseNow = new Vector3().copy(mouse);
    let mouseLast = new Vector3().copy(mouse);

    this.mini.onLoop(() => {
      mouseLast.copy(mouseNow);
      mouseNow.copy(mouse);
    });

    let SIZE = this.SIZE;
    this.tick = 0;
    this.clock = new Clock();
    this.gpuCompute = new GPUComputationRenderer(SIZE, SIZE, renderer);
    if (/iPad|iPhone|iPod/.test(navigator.platform)) {
      this.gpuCompute.setDataType(HalfFloatType);
    }

    const iPad =
      navigator.userAgent.match(/(iPad)/) /* iOS pre 13 */ ||
      (navigator.platform === "MacIntel" &&
        navigator.maxTouchPoints > 1); /* iPad OS 13 */

    if (iPad) {
      this.gpuCompute.setDataType(HalfFloatType);
    }

    let collisionCode = ``;

    for (let i = 0; i < this.balls.length; i++) {
      let ball = this.balls[i];
      if (ball.type === "mouse-sphere") {
        collisionCode += `collisionMouseSphere(
          life,
          pos,
          vel,
          ${ball.radius.toFixed(3)}
        );`;
      }

      if (ball.type === "static-sphere") {
        collisionCode += `collisionStaticSphere(
          life,
          pos,
          vel,
          vec3(
            ${ball.position.x.toFixed(3)},
            ${ball.position.y.toFixed(3)},
            ${ball.position.z.toFixed(3)}
          ),
          ${ball.radius.toFixed(3)}
        );`;
      }

      if (ball.type === "static-box") {
        collisionCode += `collisionStaticBox(
          life,
          pos,
          vel,
          vec3(
            ${ball.position.x.toFixed(3)},
            ${ball.position.y.toFixed(3)},
            ${ball.position.z.toFixed(3)}
          ),
          vec3(
            ${ball.boxSize.x.toFixed(3)},
            ${ball.boxSize.y.toFixed(3)},
            ${ball.boxSize.z.toFixed(3)}
          )
        );`;
      }
    }

    this.sharedShaderCodes = {
      //
      header: ({ type = "position" }) => /* glsl */ `
        #include <common>

        precision highp float;
        uniform highp sampler2D nowPosTex;
        uniform highp sampler2D lastPosTex;
        uniform float dT;
        uniform float eT;

        uniform vec3 mouseNow;
        uniform vec3 mouseLast;

        ${Ballify}

        float sdBox( vec3 p, vec3 b ) {
          vec3 q = abs(p) - b;
          return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
        }

        void collisionStaticSphere (float life, inout vec4 particlePos, inout vec3 particleVel, vec3 colliderSpherePosition, float sphereRadius) {
          vec3 dif = (colliderSpherePosition) - particlePos.xyz;
          if( length( dif ) < sphereRadius ){
            particleVel -= normalize(dif) * dT * 1.0;
          }
        }

        // void collisionMouseSphere (float life, inout vec4 particlePos, inout vec3 particleVel, float sphereRadius) {
        //   vec3 dif = (mouseNow) - particlePos.xyz;
        //   if( length( dif ) < sphereRadius ){
        //     particleVel -= normalize(dif) * dT * 1.0;
        //     vec3 mouseForce = mouseNow - mouseLast;
        //     particleVel += mouseForce * dT * 2.0;
        //   }
        // }

        // holdarea
        void collisionMouseSphere (float life, inout vec4 particlePos, inout vec3 particleVel, float sphereRadius) {
          vec3 dif = (mouseNow) - particlePos.xyz;
          if( length( dif ) - sphereRadius < 0.0 ){
            particleVel -= normalize(dif) * dT * 1.0;
            vec3 mouseForce = mouseNow - mouseLast;
            particleVel += mouseForce * dT * 2.0;
          } else if (length( dif ) - sphereRadius < sphereRadius * 0.5) {
            particleVel += normalize(dif) * dT * 1.0;
            vec3 mouseForce = mouseNow - mouseLast;
            particleVel += mouseForce * dT * 2.0;
          }
        }

        void collisionStaticBox (float life, inout vec4 particlePos, inout vec3 particleVel, vec3 colliderBoxPosition, vec3 boxSize) {
          vec3 p = (colliderBoxPosition) - particlePos.xyz;

          if(sdBox(p, boxSize) < 0.0){
            float EPSILON_A = 0.05;

            vec3 boxNormal = normalize(vec3(
              sdBox(vec3(p.x + EPSILON_A, p.y, p.z),  boxSize) - sdBox(vec3(p.x - EPSILON_A, p.y, p.z), boxSize),
              sdBox(vec3(p.x, p.y + EPSILON_A, p.z),  boxSize) - sdBox(vec3(p.x, p.y - EPSILON_A, p.z), boxSize),
              sdBox(vec3(p.x, p.y, p.z  + EPSILON_A), boxSize) - sdBox(vec3(p.x, p.y, p.z - EPSILON_A), boxSize)
            ));

            particleVel -= boxNormal * dT * 1.0;
          }
        }

        void handleCollision (inout vec4 pos, inout vec3 vel, inout float life) {
          ${collisionCode}
        }
      `,

      mainBody: ({ type = "position" }) => /* glsl */ `
        vec2 uv = gl_FragCoord.xy / resolution.xy;

        vec4 pos = texture2D(nowPosTex, uv);
        vec4 oPos = texture2D(lastPosTex, uv);

        //

        float life = pos.w;

        vec3 vel = pos.xyz - oPos.xyz;

        handleCollision(pos, vel, life);

        life -= .01 * ( rand( uv ) + 0.1 );

        if( life > 1. ){
          vel = vec3( 0. );
          pos.xyz = vec3(
            -0.5 + rand(uv + 0.1),
            -0.5 + rand(uv + 0.2),
            -0.5 + rand(uv + 0.3)
          );

          pos.xyz = ballify(pos.xyz, 1.5);
          pos.y += 5.0;
          life = .99;
        }

        float bottomLimit = -8.0 + rand(uv + 0.1);

        if( life < 0. || pos.y <= bottomLimit ){
          vel = vec3( 0. );
          pos.xyz = vec3(
            -0.5 + rand(uv + 0.1),
            -0.5 + rand(uv + 0.2),
            -0.5 + rand(uv + 0.3)
          );
          pos.xyz = ballify(pos.xyz, 1.5);
          pos.y += 5.0;
          life = 1.1;
        }

        // gravity
        vel += vec3( 0.0 , -.00253 , 0. );

        // wind
        vel += vec3( 0.001 * life, 0.0, 0.0 );

        vel *= .96; // dampening

        vec3 p = pos.xyz + vel;

        gl_FragColor = vec4(p , life);
      `,

      //
    };

    this.metaShaderCode = /* glsl */ `
    ${this.sharedShaderCodes.header({ type: "meta" })}

    void main(void) {
      ${this.sharedShaderCodes.mainBody({ type: "meta" })}
    }
    `;

    this.shaderCode = /* glsl */ `
      ${this.sharedShaderCodes.header({ type: "position" })}
      void main(void) {
        ${this.sharedShaderCodes.mainBody({ type: "position" })}
      }
      `;

    // scene;

    let geoBall = new SphereBufferGeometry(1, 80, 80);
    let geoBox = new BoxBufferGeometry(1, 1, 1);
    let matNormal = new MeshNormalMaterial({ opacity: 0.5, transparent: true });
    let matStd = new MeshStandardMaterial({
      opacity: 1,
      transparent: true,
      color: new Color("#888"),
    });
    let white = new Color("#fff");
    let dirLight = new DirectionalLight(white, 1);
    scene.add(dirLight);
    dirLight.position.x = 5;
    dirLight.position.y = 5;
    dirLight.position.z = 5;

    let gray = new Color("#bababa");
    let ptLight = new PointLight(gray, 1, 15);
    ptLight.position.x = 0;
    ptLight.position.y = 0;
    ptLight.position.z = 0;

    this.balls.forEach((entry, idx) => {
      if (entry.type === "mouse-sphere") {
        let entryMesh = new Mesh(geoBall, matNormal);
        entryMesh.attach(ptLight);
        scene.add(entryMesh);

        this.mini.onLoop(() => {
          entryMesh.position.copy(mouseNow);
          entryMesh.scale.set(entry.radius, entry.radius, entry.radius);
        });
      }

      if (entry.type === "static-sphere") {
        let entryMesh = new Mesh(geoBall, matStd);
        scene.add(entryMesh);

        this.mini.onLoop(() => {
          entryMesh.scale.set(entry.radius, entry.radius, entry.radius);
          entryMesh.position.copy(entry.position);
        });
      }

      if (entry.type === "static-box") {
        let entryMesh = new Mesh(geoBox, matStd);
        scene.add(entryMesh);

        this.mini.onLoop(() => {
          entryMesh.scale.set(
            entry.boxSize.x * 2,
            entry.boxSize.y * 2,
            entry.boxSize.z * 2
          );
          entryMesh.position.set(
            entry.position.x,
            entry.position.y,
            entry.position.z
          );
        });
      }
    });

    this.filter0 = this.gpuCompute.createShaderMaterial(this.shaderCode, {
      mouseNow: {
        value: mouseNow,
      },
      mouseLast: {
        value: mouseLast,
      },

      nowPosTex: { value: null },
      lastPosTex: { value: null },

      nowMetaTex: { value: null },
      lastMetaTex: { value: null },
      dT: { value: 0 },
      eT: { value: 0 },
    });

    this.filter1 = this.gpuCompute.createShaderMaterial(this.metaShaderCode, {
      mouseNow: {
        value: mouseNow,
      },
      mouseLast: {
        value: mouseLast,
      },

      nowPosTex: { value: null },
      lastPosTex: { value: null },

      nowMetaTex: { value: null },
      lastMetaTex: { value: null },
      dT: { value: 0 },
      eT: { value: 0 },
    });

    this.rttMeta0 = this.gpuCompute.createRenderTarget();
    this.rttMeta1 = this.gpuCompute.createRenderTarget();
    this.rttMeta2 = this.gpuCompute.createRenderTarget();

    this.rttPos0 = this.gpuCompute.createRenderTarget();
    this.rttPos1 = this.gpuCompute.createRenderTarget();
    this.rttPos2 = this.gpuCompute.createRenderTarget();

    this.loopRTTPos = [this.rttPos0, this.rttPos1, this.rttPos2];
    this.loopRTTMeta = [this.rttMeta0, this.rttMeta1, this.rttMeta2];

    let prepInitTexture = () => {
      var tex = this.gpuCompute.createTexture();
      let idx = 0;
      let data = tex.image.data;
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          data[idx * 4 + 0] = Math.random() - 0.5;
          data[idx * 4 + 1] = Math.random() - 0.5;
          data[idx * 4 + 2] = Math.random() - 0.5;
          data[idx * 4 + 3] = 0.0;
          idx++;
        }
      }

      this.gpuCompute.renderTexture(tex, this.loopRTTPos[0]);
      this.gpuCompute.renderTexture(tex, this.loopRTTPos[1]);
      this.gpuCompute.renderTexture(tex, this.loopRTTPos[2]);

      this.gpuCompute.renderTexture(tex, this.loopRTTMeta[0]);
      this.gpuCompute.renderTexture(tex, this.loopRTTMeta[1]);
      this.gpuCompute.renderTexture(tex, this.loopRTTMeta[2]);
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
        nowMetaTex: {
          value: null,
        },
        lastPosTex: {
          value: null,
        },
        lastMetaTex: {
          value: null,
        },
      },
      vertexShader: /* glsl */ `
        uniform sampler2D nowPosTex;
        varying vec2 vUv;

        //
        void main (void) {
          vec3 pos = texture2D(nowPosTex, uv.xy).xyz;
          vUv = uv.xy;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = 1.0;
        }
      `,
      fragmentShader: /* glsl */ `
        void main (void) {
          vec3 delta = vec3(1.0, 1.0, 1.0);

          gl_FragColor = vec4(delta.x, delta.y, delta.z, 1.0);
        }
      `,
    });

    let particles = new Points(geoPt, matPt);
    particles.frustumCulled = false;
    scene.add(particles);

    this.mini.onLoop(() => {
      if (this.filter0) {
        this.compute();

        // link to render
        let outdataPos = this.loopRTTPos[2];
        matPt.uniforms.nowPosTex.value = outdataPos.texture;

        let outdataMeta = this.loopRTTMeta[2];
        matPt.uniforms.nowMetaTex.value = outdataMeta.texture;
      }
    });
  }

  compute() {
    if (this.tick % 3 === 0) {
      this.loopRTTPos = [this.rttPos0, this.rttPos1, this.rttPos2];
    } else if (this.tick % 3 === 1) {
      this.loopRTTPos = [this.rttPos2, this.rttPos0, this.rttPos1];
    } else if (this.tick % 3 === 2) {
      this.loopRTTPos = [this.rttPos1, this.rttPos2, this.rttPos0];
    }

    if (this.tick % 3 === 0) {
      this.loopRTTMeta = [this.rttMeta0, this.rttMeta1, this.rttMeta2];
    } else if (this.tick % 3 === 1) {
      this.loopRTTMeta = [this.rttMeta2, this.rttMeta0, this.rttMeta1];
    } else if (this.tick % 3 === 2) {
      this.loopRTTMeta = [this.rttMeta1, this.rttMeta2, this.rttMeta0];
    }

    this.filter0.uniforms.nowPosTex.value = this.loopRTTPos[0].texture;
    this.filter0.uniforms.nowMetaTex.value = this.loopRTTMeta[0].texture;
    this.filter0.uniforms.lastPosTex.value = this.loopRTTPos[1].texture;
    this.filter0.uniforms.lastMetaTex.value = this.loopRTTMeta[1].texture;
    this.filter0.uniforms.dT.value = this.clock.getDelta();
    this.filter0.uniforms.eT.value = this.clock.getElapsedTime();

    this.filter1.uniforms.nowPosTex.value = this.loopRTTPos[0].texture;
    this.filter1.uniforms.nowMetaTex.value = this.loopRTTMeta[0].texture;
    this.filter1.uniforms.lastPosTex.value = this.loopRTTPos[1].texture;
    this.filter1.uniforms.lastMetaTex.value = this.loopRTTMeta[1].texture;
    this.filter1.uniforms.dT.value = this.clock.getDelta();
    this.filter1.uniforms.eT.value = this.clock.getElapsedTime();

    this.gpuCompute.doRenderTarget(this.filter0, this.loopRTTPos[2]);
    this.gpuCompute.doRenderTarget(this.filter1, this.loopRTTMeta[2]);

    this.tick++;
  }

  clean() {
    console.log("cleanup Simulator");
  }
}
