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

    this.PT_RADIUS = 150.0;
    this.PT_INSET = 2.0;

    this.uResolution = new Vector2(this.WIDTH, this.HEIGHT);

    this.WIDTH = window.innerWidth;
    this.HEIGHT = window.innerHeight;
    this.rttDepth = new WebGLRenderTarget(this.WIDTH, this.HEIGHT);
    this.rttAdd = new WebGLRenderTarget(this.WIDTH, this.HEIGHT);

    this.mini.onResize(() => {
      this.WIDTH = window.innerWidth;
      this.HEIGHT = window.innerHeight;
      this.rttDepth.setSize(this.WIDTH, this.HEIGHT);
      this.rttAdd.setSize(this.WIDTH, this.HEIGHT);
    });

    this.setup();
  }

  async setup() {
    let geoPt = new BufferGeometry();
    let dataPos = [];

    for (let i = 0; i < 1500; i++) {
      dataPos.push(
        MathUtils.randFloatSpread(50.0),
        MathUtils.randFloatSpread(50.0),
        MathUtils.randFloatSpread(10.0) + 5.0
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
        void main() {
          vec2 toCenter = (gl_PointCoord.xy - 0.5) * 2.0;
          float isVisible = step(-1.0 + EPS, -length(toCenter));
          if(isVisible < 0.5) discard;
          gl_FragColor = vec4(vec2(0.0), gl_FragCoord.z, vDepth);
        }
      `,
    });

    let matPtAdd = new ShaderMaterial({
      transparent: true,
      blending: AdditiveBlending,
      uniforms: {
        uInset: { value: this.PT_INSET },
        uDepth: { value: this.rttDepth.texture },
        uResolution: { value: this.uResolution },
        radius: { value: this.PT_RADIUS },
      },
      vertexShader: /* glsl */ `
        varying float vDepth;
        varying float vHalfSize;
        uniform float radius;

        void main (void) {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
          vDepth = -mvPosition.z;
          gl_PointSize = position.z / length( mvPosition.xyz ) * radius;
          vHalfSize = gl_PointSize * 0.5;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vHalfSize;
        varying float vDepth;
        uniform vec2 uResolution;
        uniform float uInset;
        uniform float radius;
        uniform sampler2D uDepth;

        const float EPS = 0.001;
        void main() {
          vec2 toCenter = (gl_PointCoord.xy - 0.5) * 2.0;
          float isVisible = step(-1.0 + EPS, -length(toCenter));
          if(isVisible < 0.5) discard;

          float centerZ = texture2D( uDepth, gl_FragCoord.xy  / uResolution ).a;
          float zLength = sqrt(1.0 - toCenter.x * toCenter.x - toCenter.y * toCenter.y) * vHalfSize;
          float z = centerZ - vDepth + zLength + 2.0;

          // isVisible *= step(EPS, z);
          // toCenter.xy *= z * (1.0 + uInset);
          gl_FragColor = vec4(toCenter * 0.5 + 0.5, z, z / zLength );// * isVisible;
        }
      `,
    });

    this.renderMat = new ShaderMaterial({
      transparent: true,
      uniforms: {
        uInset: { value: this.PT_INSET },
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
        precision highp float;
        uniform float uInset;
        uniform vec2 uResolution;
        uniform sampler2D uDepth;
        uniform sampler2D uAdditive;
        uniform sampler2D uSphereMap;

        varying vec2 vUv;

        // #define saturate(a) clamp( a, 0.0, 1.0 )
        // #define whiteCompliment(a) ( 1.0 - saturate( a ) )

        vec3 blendOverlay(vec3 base, vec3 blend) {
            return mix(1.0 - 2.0 * (1.0 - base) * (1.0 - blend), 2.0 * base * blend, step(base, vec3(0.5)));
        }
        float uWashout = 0.5;

        void main (void) {
          vec4 merged = texture2D( uAdditive, vUv );
          float alpha = smoothstep(0.0, 1.0, merged.w);
          if(alpha < 0.001) discard;

          // debug
          vec4 inner = texture2D( uAdditive, vUv );
          inner.xyz = normalize(inner.xyz);
          vec4 base = texture2D( uSphereMap, (inner.xy) / inner.z  );

          vec4 outer = texture2D( uAdditive, vUv );
          outer.xy /= -outer.z * (1.0 + uInset);
          outer.z = sqrt(1.0 - outer.x * outer.x - outer.y * outer.y);
          outer.xyz = normalize(outer.xyz);
          vec4 blend = texture2D( uSphereMap, outer.xy * 0.5 + 0.5 );

          gl_FragColor.rgb = blendOverlay(base.rgb, blend.rgb);
          gl_FragColor.a = alpha;

        }
      `,
    });
    this.quadRender = new Quad({ material: this.renderMat });

    let bubbles = new Points(geoPt, matPtDpeth);
    scene.add(bubbles);

    this.previewShader = new MeshBasicMaterial({ map: this.rttAdd.texture });
    this.quadPreview = new Quad({ material: this.previewShader });

    camera.position.z = 15;
    this.mini.onLoop(() => {
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
