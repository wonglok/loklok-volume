import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export class SceneControls {
  constructor({ onLoop, onResize, getRect, onClean, ...mini }) {
    this.mini = {
      onLoop,
      onResize,
      getRect,
      onClean,
      ...mini,
    };
    this.setupControls();
  }
  async setupControls() {
    let camera = await this.mini.get("camera");
    let renderer = await this.mini.get("renderer");
    let controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    this.mini.onLoop(() => {
      controls.update();
    });
  }
}
