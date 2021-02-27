import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  MathUtils,
  MeshBasicMaterial,
  NormalBlending,
  Points,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  WebGLRenderTarget,
} from "three";
import { Quad } from "../shared/Quad";

// https://github.com/edankwan/Icicle-Bubbles/blob/master/src/glsl/particles.frag

export class Bubbles {
  constructor(mini) {
    this.mini = mini;
    this.WIDTH = window.innerWidth;
    this.HEIGHT = window.innerHeight;
    this.PT_RADIUS = 50.0;
    this.uResolution = new Vector2(this.WIDTH, this.HEIGHT);

    this.rttDepth = new WebGLRenderTarget(this.WIDTH, this.HEIGHT);
    this.rttAdd = new WebGLRenderTarget(this.WIDTH, this.HEIGHT);

    this.setup();
  }

  async setup() {
    let geoPt = new BufferGeometry();
    let dataPos = [];
    for (let i = 0; i < 1500; i++) {
      dataPos.push(
        MathUtils.randFloatSpread(100.0),
        MathUtils.randFloatSpread(100.0),
        MathUtils.randFloatSpread(10.0)
      );
    }
    geoPt.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(dataPos), 3)
    );

    let scene = await this.mini.get("scene");
    let renderer = await this.mini.get("renderer");
    let camera = await this.mini.get("camera");

    let matPtDpeth = new ShaderMaterial({
      transparent: true,
      blending: NormalBlending,
      uniforms: {
        radius: { value: this.PT_RADIUS },
      },
      vertexShader: /* glsl */ `
        precision highp float;
        varying float vDepth;
        uniform float radius;

        void main (void) {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = radius;
          vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
          vDepth = -mvPosition.z;
        }

      `,
      fragmentShader: /* glsl */ `

        varying float vDepth;

        const float EPS = 0.001;

        vec4 pack1K ( float depth ) {
          depth /= 1000.0;
          const vec4 bitSh = vec4( 256.0 * 256.0 * 256.0, 256.0 * 256.0, 256.0, 1.0 );
          const vec4 bitMsk = vec4( 0.0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0 );
          vec4 res = fract( depth * bitSh );
          res -= res.xxyz * bitMsk;
          return res;
        }

        float unpack1K ( vec4 color ) {
          const vec4 bitSh = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );
          return dot( color, bitSh ) * 1000.0;
        }

        void main() {
          vec2 toCenter = (gl_PointCoord.xy - 0.5) * 2.0;
          float isVisible = step(-1.0 + EPS, -length(toCenter));
          if(isVisible < 0.5) discard;

          gl_FragColor = vec4(vDepth, vDepth, gl_FragCoord.z, vDepth);
        }

      `,
    });

    let matPtAdd = new ShaderMaterial({
      transparent: true,
      blending: AdditiveBlending,
      uniforms: {
        uDepthTexture: { value: this.rttDepth.texture },
        uResolution: { value: this.uResolution },
        radius: { value: this.PT_RADIUS },
      },
      vertexShader: /* glsl */ `
        varying float vDepth;
        uniform float radius;

        void main (void) {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = radius;
          vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
          vDepth = -mvPosition.z;
        }

      `,
      fragmentShader: /* glsl */ `

        varying float vDepth;
        uniform vec2 uResolution;
        uniform float radius;
        uniform sampler2D uDepthTexture;

        vec4 pack1K ( float depth ) {
          depth /= 1000.0;
          const vec4 bitSh = vec4( 256.0 * 256.0 * 256.0, 256.0 * 256.0, 256.0, 1.0 );
          const vec4 bitMsk = vec4( 0.0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0 );
          vec4 res = fract( depth * bitSh );
          res -= res.xxyz * bitMsk;
          return res;
        }

        float unpack1K ( vec4 color ) {
          const vec4 bitSh = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );
          return dot( color, bitSh ) * 1000.0;
        }

        void main() {
          if(length(gl_PointCoord.xy - 0.5) > 0.5) discard;

          vec2 toCenter = (gl_PointCoord.xy - 0.5) * 2.0;
          float z = sqrt(1.0 - toCenter.x * toCenter.x - toCenter.y * toCenter.y) * radius * 0.5;

          vec4 depth = texture2D(uDepthTexture, gl_FragCoord.xy / uResolution );
          float dz = depth.b - vDepth + z;

          // toCenter.xy *= dz * (1.0);
          gl_FragColor = vec4((toCenter * 0.5 + 0.5) / dz, dz, 1.0 );
        }
      `,
    });

    this.renderMat = new ShaderMaterial({
      transparent: true,
      uniforms: {
        uDepth: { value: this.rttDepth.texture },
        uAdditive: { value: this.rttAdd.texture },
        uResolution: { value: this.uResolution },
        uSphereMap: {
          value: new TextureLoader().load(
            require("./img/matcap_plastic.jpg").default
          ),
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main (void) {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vUv = uv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec2 uResolution;
        uniform sampler2D uDepth;
        uniform sampler2D uAdditive;
        uniform sampler2D uSphereMap;
        varying vec2 vUv;

        void main (void) {
          vec4 merged = texture2D( uAdditive, vUv );

          float alpha = smoothstep(0.0, 1.0, merged.w);
          if(alpha < 0.001) discard;

          merged.xy = merged.xy / merged.z;

          vec4 color = texture2D( uSphereMap, (merged.xy * 0.5 + 0.5) );

          gl_FragColor = vec4(color.rgb, alpha);
        }
      `,
    });
    this.quadRender = new Quad({ material: this.renderMat });

    let bubbles = new Points(geoPt, matPtDpeth);
    scene.add(bubbles);

    this.previewShader = new MeshBasicMaterial({ map: this.rttAdd.texture });
    this.quadPreview = new Quad({ material: this.previewShader });

    camera.position.z = 150;
    this.mini.onLoop(() => {
      // bubbles.rotation.y += 0.001;
      // bubbles.rotation.x += 0.001;

      renderer.setRenderTarget(this.rttDepth);
      renderer.clear();
      bubbles.material = matPtDpeth;
      renderer.render(scene, camera);

      renderer.setRenderTarget(this.rttAdd);
      renderer.clear();
      bubbles.material = matPtAdd;
      renderer.render(scene, camera);

      renderer.setRenderTarget(null);
      renderer.clear();
      this.quadRender.render({ renderer });

      // debug
      // renderer.setRenderTarget(null);
      // renderer.clear();
      // this.quadPreview.render({ renderer });
    });
  }

  clean() {
    //
  }
}
