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
  WebGLRenderTarget,
  SphereBufferGeometry,
  Vector3,
} from "three";
import anime from "animejs/lib/anime.es.js";

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
    let height = 10;
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

    let alpha_faces = 0.2;
    if ( name.indexOf('text_mesh') !== -1) {
      alpha_faces = 1.0;
    }
    let progress_faces = { value: 0};

    let texture = new WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight
    ).texture;

    let iMeshFace = new Mesh(baseGeometry, new ShaderMaterial({
      uniforms: {
        envMap: { value: texture },
        uReso: { value: alpha_faces },
        progress_faces,
      },
      depthTest: false,
      transparent: true,
      side: FrontSide,
      vertexShader: require("./shaders/vfaces.vert.js"),
      fragmentShader: require("./shaders/vfaces.frag.js"),
    }
    ));
    iMeshFace.frustumCulled = false;
    iMeshFace.position.copy(position);

    onScene((scene) => {
      scene.add(iMesh);
      scene.add(iMeshFace);
    });

    let current_lines = false;
    let current_faces = false;
    let runner = ({ done = () => {}, delay = 0 }) => {
      progress.value = 0.0;
      current_lines = anime({
        targets: [progress],
        value: 1.0,
        easing: "easeOutSine", //"easeOutQuad",
        duration: 2000,
        delay,
        complete: () => {
          current_faces = anime({
            targets: [progress_faces],
            value: 1.0,
            easing: "easeOutSine", //"easeOutQuad",
            duration: 3000,
            delay,
            complete: () => {
              done();
            },
          });
          done();
        },
      });
    };

    this.run = runner;
    this.hide = () => {
      if (current_lines) {
        current_lines.pause();
      }
      if (current_faces) {
        current_faces.pause();
      }
      progress.value = 0.0;
      progress_faces.value = 0.0;
    };

    this.mini.set(name, this);

    return this;
  }
}
