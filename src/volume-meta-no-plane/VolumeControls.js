import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export class VolumeControls {
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
    let camera = await this.mini.get("VolumeCamera");
    let renderer = await this.mini.get("renderer");
    let controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    this.mini.onLoop(() => {
      controls.update();
    });
    this.mini.set("VolumeControls", controls);
  }
}
