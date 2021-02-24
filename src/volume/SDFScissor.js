import { Color, Mesh } from "three";
import { WebGLRenderTarget } from "three";
import { ArrayCamera } from "three";
import { MeshBasicMaterial } from "three";
import { DoubleSide } from "three";
import { TorusKnotBufferGeometry } from "three";
import { MeshNormalMaterial } from "three";
import { OrthographicCamera } from "three";
import { ShaderMaterial } from "three";
import { Scene } from "three";
import { DirectionalLight } from "three";
import { PerspectiveCamera } from "three";
import { Vector4 } from "three";
import { PlaneBufferGeometry } from "three";
import { BoxBufferGeometry } from "three";

export class SDFTexture {
  constructor(
    { onLoop, onResize, getRect, onClean, get, ...mini },
    name = "SDFTexture"
  ) {
    this.mini = {
      get,
      onLoop,
      onResize,
      getRect,
      onClean,
      ...mini,
    };

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

    this.renderTarget = new WebGLRenderTarget(SCREEN_WIDTH, SCREEN_HEIGHT);

    this.compute = () => {};

    let scenes = [];

    for (let y = 0; y < AMOUNT; y++) {
      for (let x = 0; x < AMOUNT; x++) {
        console.log(x, y);
        let scene = new Scene();
        let geoBox = new BoxBufferGeometry(2.5, 2.5, 2.5);
        let matBox = new MeshNormalMaterial({});
        let box = new Mesh(geoBox, matBox);
        scene.add(box);

        scene.userData.camera = new PerspectiveCamera(
          35,
          ASPECT_RATIO,
          0.1,
          100
        );
        scene.userData.camera.position.z = 10;

        scene.userData.viewport = {
          x: x * WIDTH,
          y: y * HEIGHT,
          width: WIDTH,
          height: HEIGHT,
        };
        scenes.push(scene);
      }
    }

    Promise.all([get("renderer")]).then(([renderer]) => {
      this.compute = () => {
        renderer.setRenderTarget(this.renderTarget);
        renderer.setClearColor(0xffffff);
        renderer.setScissorTest(false);
        renderer.clear();

        renderer.setClearColor(0xe0e0e0);
        renderer.setScissorTest(true);

        scenes.forEach((scene) => {
          // so something moves
          scene.children[0].rotation.y = Date.now() * 0.001;

          // set the viewport
          const width = scene.userData.viewport.width;
          const height = scene.userData.viewport.height;
          const x = scene.userData.viewport.x;
          const y = scene.userData.viewport.y;

          renderer.setViewport(x, y, width, height);
          renderer.setScissor(x, y, width, height);

          const camera = scene.userData.camera;
          renderer.render(scene, camera);
        });
        renderer.setRenderTarget(null);

        // console.log(renderer);
      };
    });
  }

  clean() {
    console.log("SDFTexture Cleanup");
  }
}
