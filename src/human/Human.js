import {
  Clock,
  DataTexture,
  Group,
  Matrix4,
  Mesh,
  PlaneGeometry,
  RawShaderMaterial,
  RGBAFormat,
  TextureLoader,
  Vector2,
  Vector4,
} from "three";

import { Pose } from "@mediapipe/pose/pose";
import { Camera } from "@mediapipe/camera_utils/camera_utils.js";

export class Human {
  constructor(mini) {
    this.mini = mini;

    this.setup();
  }
  async setup() {
    let scene = await this.mini.get("scene");
    let renderer = await this.mini.get("renderer");
    let camera = await this.mini.get("camera");
    let humanV = await fetch(require("./shader/human.vert").default).then((e) =>
      e.text()
    );
    let humanF = await fetch(require("./shader/human.frag").default).then((e) =>
      e.text()
    );
    let dolly = new Group();
    scene.add(dolly);

    camera.position.z = 4;
    dolly.add(camera);
    let poseData = [];
    for (let i = 0; i < 33; i++) {
      poseData.push(new Vector4());
    }
    let geometry = new PlaneGeometry(2.0, 2.0);
    let material = new RawShaderMaterial({
      uniforms: {
        matcap: {
          value: new TextureLoader().load(
            require("./img/matcap_plastic.jpg").default
          ),
        },
        poseData: {
          value: poseData,
        },
        resolution: {
          value: new Vector2(
            renderer.domElement.width,
            renderer.domElement.height
          ),
        },
        cameraWorldMatrix: { value: camera.matrixWorld },
        cameraProjectionMatrixInverse: {
          value: new Matrix4().copy(camera.projectionMatrixInverse),
        },
      },
      vertexShader: humanV,
      fragmentShader: humanF,
    });
    let mesh = new Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);

    this.mini.onResize(() => {
      let canvas = renderer.domElement;
      renderer.setSize(canvas.width, canvas.height);
      camera.aspect = canvas.width / canvas.height;
      camera.updateProjectionMatrix();

      material.uniforms.resolution.value.set(canvas.width, canvas.height);
      material.uniforms.cameraProjectionMatrixInverse.value.copy(
        camera.projectionMatrixInverse
      );
    });

    const pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      },
    });
    pose.setOptions({
      upperBodyOnly: false,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    let temp4 = new Vector4();
    let onResults = (results) => {
      if (results && results.poseLandmarks) {
        results.poseLandmarks.forEach((pt, idx) => {
          temp4.set(pt.x * 2.0 - 1.0, pt.y - 1.5, pt.z, 1.0);
          poseData[idx].lerp(temp4, 0.2);
        });
      }
    };

    pose.onResults(onResults);
    let videoHTML = /* html */ `
      <video playsinline class="input_video"></video>
    `;

    let div = document.createElement("div");
    div.style.position = "absolute";
    div.style.top = "0px";
    div.style.left = "0px";
    div.style.overflow = "hidden";
    div.innerHTML = videoHTML;
    renderer.domElement.parentElement.appendChild(div);

    const videoElement = document.getElementsByClassName("input_video")[0];
    const webCamera = new Camera(videoElement, {
      onFrame: async () => {
        await pose.send({ image: videoElement });
      },
      width: 1280 / 2,
      height: 720 / 2,
    });
    webCamera.start();
  }
  clean() {}
}
