// import { Geometry } from "three/examples/jsm/deprecated/Geometry";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer";
import { HalfFloatType } from "three";
import { Clock } from "three/src/Three";
import { Sprite } from "three/src/Three";
import { SpriteMaterial } from "three/src/Three";
import { Vector4 } from "three/src/Three";
import { MathUtils } from "three/src/Three";
import { Points } from "three/src/Three";
import { Vector3 } from "three/src/Three";
import { PlaneBufferGeometry } from "three/src/Three";
import { ShaderMaterial } from "three/src/Three";
import { BufferGeometry } from "three/src/Three";
import { BufferAttribute } from "three/src/Three";

export class Simulator {
  constructor(
    { onLoop, onResize, getRect, onClean, ...mini },
    name = "Simulator"
  ) {
    this.mini = {
      onLoop,
      onResize,
      getRect,
      onClean,
      ...mini,
    };

    this.mini.set(name, this);

    this.SIZE = 512;

    this.setupSimulator();
    this.particles();
  }

  async setupSimulator() {
    let renderer = await this.mini.get("renderer");

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
          data[idx * 4 + 3] = Math.random() * 2.0;
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

      void main(void) {
        vec2 uv = gl_FragCoord.xy / resolution.xy;

        vec4 initPosition = texture2D(initTexture, uv);
        vec4 nowPosition = texture2D(nowPosTex, uv);
        vec4 lastPosition = texture2D(lastPosTex, uv);
        vec4 velocity = nowPosition - lastPosition;

        vec4 latest = nowPosition;

        velocity.y = 1.0 * dT;
        latest.xyz += velocity.xyz;

        latest.w += rand(uv + velocity.y) * dT;

        if (latest.w >= 1.0) {
          latest.xyz = initPosition.xyz;
          latest.w = 0.0;
        }

        gl_FragColor = vec4(latest.xyz, latest.w);
      }
    `;

    this.filter0 = this.gpuCompute.createShaderMaterial(this.shaderCode, {
      initTexture: { value: initTexture },
      nowPosTex: { value: null },
      lastPosTex: { value: null },
      dT: { value: null },
      eT: { value: null },
    });

    this.rtt0 = this.gpuCompute.createRenderTarget();
    this.rtt1 = this.gpuCompute.createRenderTarget();
    this.rtt2 = this.gpuCompute.createRenderTarget();

    this.loopRTT = [this.rtt0, this.rtt1, this.rtt2];

    this.gpuCompute.renderTexture(initTexture, this.loopRTT[0]);
    this.gpuCompute.renderTexture(initTexture, this.loopRTT[1]);
    this.gpuCompute.renderTexture(initTexture, this.loopRTT[2]);

    this.compute();
    this.compute();
    this.compute();
  }

  async particles() {
    let scene = await this.mini.get("scene");
    let camera = await this.mini.get("camera");

    let sceneUI = await this.mini.get("sceneUI");
    let cameraUI = await this.mini.get("cameraUI");

    let geoPt = new BufferGeometry();
    let uv = [];
    for (let y = 0; y < this.SIZE; y++) {
      for (let x = 0; x < this.SIZE; x++) {
        uv.push(y / this.SIZE, x / this.SIZE, 0.0);
      }
    }
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
          vec3 pos = texture2D(nowPosTex, position.xy).xyz;
          pos *= 100.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = 1.0;
        }
      `,
      fragmentShader: /* glsl */ `
        void main (void) {
          gl_FragColor = vec4(1.0);
        }
      `,
    });
    let particles = new Points(geoPt, matPt);
    particles.frustumCulled = false;
    scene.add(particles);

    this.mini.onLoop(() => {
      this.compute();
      let outdata = this.loopRTT[2];
      matPt.uniforms.nowPosTex.value = outdata.texture;
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
