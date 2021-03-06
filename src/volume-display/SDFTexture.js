import { Clock, Mesh, RawShaderMaterial, RepeatWrapping } from "three";
import { WebGLRenderTarget } from "three";
import { ArrayCamera } from "three";
import { MeshBasicMaterial } from "three";
// import { Plane } from "three";
// import { TorusKnotBufferGeometry } from "three";
// import { ShaderMaterial } from "three";
// import { DirectionalLight } from "three";
import { Scene } from "three";
import { PerspectiveCamera } from "three";
import { Vector4 } from "three";
import { PlaneBufferGeometry } from "three";

export class SDFTexture {
  constructor({ ...mini }, name = "SDFTexture") {
    this.mini = mini;

    this.mini.set(name, this);

    const AMOUNT = 8;

    const SIZE = AMOUNT * AMOUNT;
    const ASPECT_RATIO = 1.0;

    const SCREEN_WIDTH = SIZE * AMOUNT;
    const SCREEN_HEIGHT = SIZE * AMOUNT;

    const WIDTH = SCREEN_WIDTH / AMOUNT;
    const HEIGHT = SCREEN_HEIGHT / AMOUNT;

    this.info = {
      SLICE_SIZE_PX: SIZE,
      SLICE_PER_ROW: AMOUNT,
      NUM_ROW: AMOUNT,
    };

    const cameras = [];
    let ii = 0;
    for (let y = 0; y < AMOUNT; y++) {
      for (let x = 0; x < AMOUNT; x++) {
        let depth = (ii / (AMOUNT * AMOUNT)) * 2.0 - 1.0;
        const subcamera = new PerspectiveCamera(40, ASPECT_RATIO, 0.5, 10000);
        subcamera.viewport = new Vector4(
          Math.floor(x * WIDTH),
          Math.floor(y * HEIGHT),
          Math.ceil(WIDTH),
          Math.ceil(HEIGHT)
        );

        // subcamera.position.x = x / AMOUNT - 0.5;
        // subcamera.position.y = 0.5 - y / AMOUNT;
        // subcamera.position.multiplyScalar(2);
        subcamera.position.z = depth;

        // subcamera.lookAt(0, 0, 0);
        subcamera.updateMatrixWorld();

        cameras.push(subcamera);

        ii++;
      }
    }

    this.renderScene = new Scene();
    // this.renderScene.background = new Color("#ffffff");
    this.renderCamera = new ArrayCamera(cameras);
    this.renderTarget = new WebGLRenderTarget(SCREEN_WIDTH, SCREEN_HEIGHT, {
      wrapS: RepeatWrapping,
      wrapT: RepeatWrapping,
    });

    this.renderPreview = () => {};

    Promise.all([mini.get("renderer")]).then(([renderer]) => {
      renderer.localClippingEnabled = true;
      this.compute = () => {
        if (renderer) {
          renderer.setRenderTarget(this.renderTarget);
          renderer.setClearColor(0xffffff, 0);
          renderer.clear(true, true, true);
          renderer.render(this.renderScene, this.renderCamera);
          renderer.setRenderTarget(null);
        }
      };
    });

    this.makeMesh();

    if (window.innerWidth > 500) {
      this.makePreviewTexturePlane();
    }
  }

  async makePreviewTexturePlane() {
    const scene = await this.mini.get("scene");
    // const camera = await this.mini.get("camera");
    // const renderer = await this.mini.get("renderer");

    const geometryPlane = new PlaneBufferGeometry(25, 25);
    const materialPlane = new MeshBasicMaterial({
      color: 0xffffff,
      map: this.renderTarget.texture,
    });

    const mesh = new Mesh(geometryPlane, materialPlane);
    // right
    mesh.position.x = 25;
    mesh.position.z = 1.0;
    scene.add(mesh);
  }

  async makeMesh() {
    let vertexShader = await fetch(
      require("./shader/sdf-render.vert").default
    ).then((e) => e.text());
    let fragmentShader = await fetch(
      require("./shader/sdf-render.frag").default
    ).then((e) => e.text());

    let materialTestObject = new RawShaderMaterial({
      transparent: true,
      uniforms: {
        eT: { value: 0 },
      },
      vertexShader,
      fragmentShader,
    });

    const geometryTestObject = new PlaneBufferGeometry(2, 2);

    const mesh = new Mesh(geometryTestObject, materialTestObject);
    mesh.frustumCulled = false;
    this.renderScene.add(mesh);
    let clock = new Clock();
    this.mini.onLoop(() => {
      materialTestObject.uniforms.eT.value = clock.getElapsedTime();
    });
  }

  clean() {
    console.log("SDFTexture Cleanup");
  }
}
