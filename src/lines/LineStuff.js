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
} from "three";
import anime from "animejs/lib/anime.es.js";

export class LineStuff {
  constructor(mini) {
    this.mini = mini;
    return this.setup();
  }
  async setup() {
    let unitSize = 0.05;
    let height = 10;
    // let pGeo = new CylinderBufferGeometry(0.1, 0.1, height, 6, 3, false);
    let pGeo = new BoxBufferGeometry(unitSize, height, unitSize, 2, 2, 2);
    let sGeo = new SphereBufferGeometry(3, 64, 64);

    let iGeo = new InstancedBufferGeometry();
    iGeo.copy(pGeo);

    let count = sGeo.attributes.position.array.length / 3;
    iGeo.instanceCount = count;

    iGeo.setAttribute(
      "offsets",
      new InstancedBufferAttribute(
        new Float32Array([...sGeo.attributes.position.array]),
        3
      )
    );

    iGeo.setAttribute(
      "rand3",
      new InstancedBufferAttribute(
        new Float32Array(
          [...sGeo.attributes.position.array].map((e) => Math.random())
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

    this.mini.i.scene.then((scene) => {
      scene.add(iMesh);
    });

    let runner = () => {
      progress.value = 0.0;
      anime({
        targets: [progress],
        value: 1,
        easing: "easeOutSine", //"easeOutQuad",
        duration: 1500,
        complete: () => {
          setTimeout(() => {
            runner();
          }, 500);
        },
      });
    };
    runner();

    // //-----------
    // //
    // let bGeo = new BoxBufferGeometry(0.1, 0.1, 0.1, 2, 2, 2);
    // let stopGeo = new InstancedBufferGeometry();
    // stopGeo.copy(bGeo);
    // stopGeo.instanceCount = count;

    // stopGeo.setAttribute(
    //   "offsets",
    //   new InstancedBufferAttribute(
    //     new Float32Array([...sGeo.attributes.position.array]),
    //     3
    //   )
    // );

    // stopGeo.setAttribute(
    //   "rand3",
    //   new InstancedBufferAttribute(
    //     new Float32Array(
    //       [...sGeo.attributes.position.array].map((e) => Math.random())
    //     ),
    //     3
    //   )
    // );

    // let stopMat = new ShaderMaterial({
    //   uniforms: {
    //     progress,
    //   },
    //   depthTest: false,
    //   transparent: true,
    //   side: DoubleSide,
    //   vertexShader: require("./shaders/stopBox.vert.js"),
    //   fragmentShader: require("./shaders/stopBox.frag.js"),
    // });

    // let stopMesh = new Mesh(stopGeo, stopMat);
    // stopMesh.frustumCulled = false;
    // this.mini.i.scene.then((scene) => {
    //   scene.add(stopMesh);
    // });

    // //
    // //-----------

    this.mini.onLoop(() => {});

    return this;
  }
}
