import {
  BackSide,
  BoxBufferGeometry,
  Clock,
  Mesh,
  RawShaderMaterial,
  Scene,

  // Camera,
  // MeshBasicMaterial,
  // PlaneBufferGeometry,
  // WebGLRenderTarget,
} from "three";

export class VolumeBox {
  constructor(mini) {
    this.mini = mini;
    this.mini.set("VolumeBox", this);
    this.setup();
  }
  async setup() {
    let camera = await this.mini.get("camera");
    let renderer = await this.mini.get("renderer");
    let vertexShader = await fetch(
      require("./shader/volumebox.vert").default
    ).then((s) => s.text());
    let fragmentShader = await fetch(
      require("./shader/volumebox.frag").default
    ).then((s) => s.text());

    let geoBox = new BoxBufferGeometry(1, 1, 1, 10, 10, 10);
    let STEPS = 20;
    let matBox = new RawShaderMaterial({
      side: BackSide,
      transparent: true,
      uniforms: {
        eT: { value: 0 },
        steps: { value: STEPS },
        threshold: {
          value: 1.0,
        },
      },
      vertexShader,
      fragmentShader: fragmentShader.replace(
        `#define STEPS 100`,
        `#define STEPS ${STEPS.toFixed(0)}`
      ),
    });

    let meshBox = new Mesh(geoBox, matBox);
    meshBox.scale.set(2, 2, 2);

    // let rttSmall = new WebGLRenderTarget(
    //   window.innerWidth * 1.0,
    //   window.innerHeight * 1.0
    // );
    let sceneSmall = new Scene();
    // let cameraSmall = new Camera();
    // let plane = new Mesh(
    //   new PlaneBufferGeometry(2, 2),
    //   new MeshBasicMaterial({ map: rttSmall.texture })
    // );
    sceneSmall.add(meshBox);

    let clock = new Clock();
    this.mini.onLoop(() => {
      matBox.uniforms.eT.value = clock.getElapsedTime();
      // renderer.setRenderTarget(rttSmall);
      renderer.render(sceneSmall, camera);
      // renderer.setRenderTarget(null);
      // renderer.render(plane, cameraSmall);
    });
  }
  clean() {}
}
