import {
  BoxBufferGeometry,
  //
  // InstancedMesh,
  // PlaneBufferGeometry,
  // CylinderBufferGeometry,
  FrontSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  SphereBufferGeometry,
  Vector3,
} from "three";
import anime from "animejs/lib/anime.es.js";
// import { resample } from "@thi.ng/geom-resample";

export class LineStuff {
  constructor(
    mini,
    {
      name = "fall",
      position = new Vector3(),
      delay = 0.0,
      baseGeometry = new SphereBufferGeometry(3, 64, 64),
    }
  ) {
    this.mini = mini;
    return this.setup({
      name,
      position,
      delay,
      baseGeometry,
    });
  }
  async setup({ name, position, delay, baseGeometry }) {
    let onScene = (cb) => this.mini.get("scene").then((e) => cb(e));
    let unitSize = 0.075;
    let height = 4;
    let pGeo = new BoxBufferGeometry(unitSize, height, unitSize, 1, 1, 1);

    let iGeo = new InstancedBufferGeometry();
    iGeo.copy(pGeo);

    let count = baseGeometry.attributes.position.array.length / 3;
    iGeo.instanceCount = count;

    iGeo.setAttribute(
      "offsets",
      new InstancedBufferAttribute(
        new Float32Array([...baseGeometry.attributes.position.array]),
        3
      )
    );

    iGeo.setAttribute(
      "rand3",
      new InstancedBufferAttribute(
        new Float32Array(
          [...baseGeometry.attributes.position.array].map((e) => Math.random())
        ),
        3
      )
    );

    let progress = { value: 0 };
    let iMat = new ShaderMaterial({
      uniforms: {
        unitSize: { value: unitSize },
        initHeight: { value: height },
        progress,
      },
      depthTest: false,
      transparent: true,
      side: FrontSide,
      vertexShader: require("./shaders/vlines.vert.js"),
      fragmentShader: require("./shaders/vlines.frag.js"),
    });

    let iMesh = new Mesh(iGeo, iMat);
    iMesh.frustumCulled = false;

    iMesh.position.copy(position);
    this.mesh = iMesh;

    onScene((scene) => {
      scene.add(iMesh);
    });

    let current = false;
    let runner = ({ done = () => {}, delay = 0 }) => {
      progress.value = 0.0;
      current = anime({
        targets: [progress],
        value: 1,
        easing: "easeOutSine", //"easeOutQuad",
        duration: 2000,
        delay,
        complete: () => {
          done();
        },
      });
    };

    this.run = runner;
    this.hide = () => {
      if (current) {
        current.pause();
      }
      progress.value = 0.0;
    };

    this.mini.set(name, this);

    return this;
  }
}
