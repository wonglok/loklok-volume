import {
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Raycaster,
  Vector2,
} from "three";
import { Scene } from "three";
import { WebGLRenderer } from "three";
import { Vector3 } from "three";
import { PlaneBufferGeometry } from "three/src/Three";

const visibleHeightAtZDepth = (depth, camera) => {
  // compensate for cameras not positioned at z=0
  const cameraOffset = camera.position.z;
  if (depth < cameraOffset) depth -= cameraOffset;
  else depth += cameraOffset;

  // vertical fov in radians
  const vFOV = (camera.fov * Math.PI) / 180;

  // Math.abs to ensure the result is always positive
  return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
};

const visibleWidthAtZDepth = (depth, camera) => {
  const height = visibleHeightAtZDepth(depth, camera);
  return height * camera.aspect;
};

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

    let vp = new Vector3(0, 0, 0);
    let mouse = new Vector3(0, 0, 0);
    let rect = renderer.domElement.getBoundingClientRect();
    onResize(() => {
      rect = renderer.domElement.getBoundingClientRect();
    });

    let raycaster = new Raycaster();

    renderer.domElement.addEventListener("mousemove", (evt) => {
      let height =
        visibleHeightAtZDepth(camera.position.length(), camera) * 0.5;
      let width = visibleWidthAtZDepth(camera.position.length(), camera) * 0.5;

      vp.x = width;
      vp.y = height;
      vp.z = camera.position.length();

      mouse.setX(((evt.clientX - rect.width * 0.5) / rect.width) * width);
      mouse.setY(((rect.height * 0.5 - evt.clientY) / rect.height) * height);
    });
    renderer.domElement.addEventListener(
      "touchstart",
      (ev) => {
        ev.preventDefault();
      },
      { passive: false }
    );

    renderer.domElement.addEventListener(
      "touchmove",
      (evt) => {
        evt.preventDefault();
        let height =
          visibleHeightAtZDepth(camera.position.length(), camera) * 0.5;
        let width =
          visibleWidthAtZDepth(camera.position.length(), camera) * 0.5;

        vp.x = width;
        vp.y = height;
        vp.z = camera.position.length();

        mouse.setX(
          ((evt.touches[0].clientX - rect.width * 0.5) / rect.width) * width
        );
        mouse.setY(
          ((rect.height * 0.5 - evt.touches[0].clientY) / rect.height) * height
        );
      },
      { passive: false }
    );

    // const geometry = new BoxGeometry();
    // const material = new MeshBasicMaterial({ color: 0x00ff00 });
    // const cube = new Mesh(geometry, material);
    // scene.add(cube);
    let clicker = new PlaneBufferGeometry(1000.0, 1000.0);
    let clickerMesh = new Mesh(clicker, new MeshBasicMaterial());
    let screen = new Vector3();
    let mosuer = new Vector2();
    onLoop(() => {
      let mouser = mosuer.copy(mouse);
      mouser.x /= vp.x;
      mouser.y /= vp.y;
      raycaster.setFromCamera(mouser, camera);
      let res = raycaster.intersectObjects([clickerMesh]);

      if (res && res[0]) {
        screen.copy(res[0].point);
      }
    });

    mini.set("viewport", vp);
    mini.set("mouse", mouse);
    mini.set("screen", screen);
    mini.set("camera", camera);
    mini.set("scene", scene);
    mini.set("renderer", renderer);
  }

  clean() {
    console.log("cleaning");
  }
}
