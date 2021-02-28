import { Mesh } from "three";
import { WebGLRenderTarget } from "three";
import { ArrayCamera } from "three";
import { MeshBasicMaterial } from "three";
import { DoubleSide } from "three";
import { MeshNormalMaterial } from "three";
// import { Plane } from "three";
// import { TorusKnotBufferGeometry } from "three";
// import { ShaderMaterial } from "three";
// import { DirectionalLight } from "three";
import { Scene } from "three";
import { PerspectiveCamera } from "three";
import { Vector4 } from "three";
import { PlaneBufferGeometry } from "three";
import { SphereBufferGeometry } from "three";

export class SDFTexture {
  constructor(
    { onLoop, onResize, getRect, onClean, ...mini },
    name = "SDFTexture"
  ) {
    this.mini = {
      onLoop,
      onResize,
      getRect,
      onClean,
      ...mini,
    };

    this.mini.set(name, this);

    const AMOUNT = 16;
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
        subcamera.position.z = depth * 3.0;

        // subcamera.lookAt(0, 0, 0);
        subcamera.updateMatrixWorld();

        cameras.push(subcamera);

        ii++;
      }
    }

    this.renderScene = new Scene();
    // this.renderScene.background = new Color("#ffffff");
    this.renderCamera = new ArrayCamera(cameras);
    this.renderTarget = new WebGLRenderTarget(SCREEN_WIDTH, SCREEN_HEIGHT);

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
    this.makePreviewPlane();
  }

  async makePreviewPlane() {
    const scene = await this.mini.get("scene");
    // const camera = await this.mini.get("camera");
    // const renderer = await this.mini.get("renderer");

    const geometryPlane = new PlaneBufferGeometry(50, 50);
    const materialPlane = new MeshBasicMaterial({
      color: 0xffffff,
      map: this.renderTarget.texture,
    });

    const mesh = new Mesh(geometryPlane, materialPlane);
    mesh.position.x = 50;
    mesh.position.z = 1.0;
    scene.add(mesh);
  }

  makeMesh() {
    let materialTestObject = new MeshNormalMaterial({
      side: DoubleSide,
      transparent: true,
    });

    const geometryTestObject = new SphereBufferGeometry(0.5, 80, 80);

    const mesh = new Mesh(geometryTestObject, materialTestObject);
    mesh.frustumCulled = false;
    this.renderScene.add(mesh);

    this.mini.onLoop(() => {
      mesh.rotation.x += 0.005;
      mesh.rotation.z += 0.01;
    });
  }

  clean() {
    console.log("SDFTexture Cleanup");
  }
}
