import { PerspectiveCamera } from "three";
import { Scene } from "three";
import { WebGLRenderer } from "three";

export class Base {
  constructor({ onLoop, onResize, getRect, onClean, ...mini }) {
    this.mini = mini;
    this.rect = getRect();
    onResize(() => {
      this.rect = getRect();
    });
    const scene = new Scene();
    // scene.background = new Color("#bababa");
    const camera = new PerspectiveCamera(
      75,
      this.rect.width / this.rect.height,
      0.1,
      1000000
    );

    let sceneUI = new Scene();
    let cameraUI = camera.clone();

    mini.set("sceneUI", sceneUI);
    mini.set("cameraUI", cameraUI);

    onResize(() => {
      camera.aspect = this.rect.width / this.rect.height;
      camera.updateProjectionMatrix();
      cameraUI.aspect = this.rect.width / this.rect.height;
      cameraUI.updateProjectionMatrix();
    });

    const renderer = new WebGLRenderer();
    renderer.setSize(this.rect.width, this.rect.height);
    renderer.setPixelRatio(window.devicePixelRatio || 1.0);
    onResize(() => {
      this.rect = getRect();
      renderer.setSize(this.rect.width, this.rect.height);
      renderer.setPixelRatio(window.devicePixelRatio || 1.0);
    });

    mini.domElement.appendChild(renderer.domElement);
    onClean(() => {
      renderer.domElement.remove();
    });

    // const geometry = new BoxGeometry();
    // const material = new MeshBasicMaterial({ color: 0x00ff00 });
    // const cube = new Mesh(geometry, material);
    // scene.add(cube);

    mini.set("camera", camera);
    mini.set("scene", scene);
    mini.set("renderer", renderer);
  }

  clean() {
    console.log("cleaning");
  }
}
