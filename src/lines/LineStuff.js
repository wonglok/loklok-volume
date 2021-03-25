import {
  BoxBufferGeometry,
  //
  // InstancedMesh,
  // PlaneBufferGeometry,
  // CylinderBufferGeometry,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  SphereBufferGeometry,
  TorusKnotBufferGeometry,
  Vector3,
} from "three";
import anime from "animejs/lib/anime.es.js";

export class LineStuff {
  constructor(mini, config = {}) {
    this.mini = mini;
    return this.setup(config);
  }
  async setup({ position = new Vector3(), delay = 0.0, shape = "sphere" }) {
    let onScene = (cb) => this.mini.get("scene").then((e) => cb(e));
    let unitSize = 0.05;
    let height = 3;
    let pGeo = new BoxBufferGeometry(unitSize, height, unitSize, 2, 2, 2);

    let baseGeometry = new SphereBufferGeometry(3, 64, 64);
    if (shape === "torus") {
      baseGeometry = new TorusKnotBufferGeometry(2, 0.25, 500, 127, 4);
    }
    if (shape === "box") {
      baseGeometry = new BoxBufferGeometry(5, 5, 5, 50, 50, 50);
    }

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
      side: DoubleSide,
      vertexShader: require("./shaders/vlines.vert.js"),
      fragmentShader: require("./shaders/vlines.frag.js"),
    });

    let iMesh = new Mesh(iGeo, iMat);
    iMesh.frustumCulled = false;

    iMesh.position.copy(position);

    onScene((scene) => {
      scene.add(iMesh);
    });

    let runner = () => {
      progress.value = 0.0;
      anime({
        targets: [progress],
        value: 1,
        easing: "easeOutSine", //"easeOutQuad",
        duration: 2000,
        complete: () => {
          setTimeout(() => {
            runner();
          }, 1500);
        },
      });
    };

    setTimeout(() => {
      runner();
    }, delay);

    this.mini.onLoop(() => {});

    return this;
  }
}
