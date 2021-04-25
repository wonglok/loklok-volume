import {
  AmbientLight,
  BoxBufferGeometry,
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  MeshStandardMaterial,
  ShaderMaterial,
  Vector3,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

export class Faces {
  constructor(mini) {
    this.mini = mini;
    return this.setup();
  }
  async setup() {
    let { onLoop, ready } = this.mini;
    let appScene = await ready.scene;
    let appCam = await ready.camera;

    appCam.lookAt(0, 0, 0);
    appScene.add(new AmbientLight(new Color("#ffffff"), 1));
    appScene.add(new DirectionalLight(new Color("#ffffff"), 0.5));

    new GLTFLoader().load("/model/pointing/pointing.glb", (model) => {
      console.log(model);
      let okMesh = model.scene.getObjectByName("Group17248");
      let okGeometry = okMesh.geometry;

      okGeometry.rotateX(Math.PI * -0.5);

      let proc = new GeoProcessor({ geometry: okGeometry });
      proc.promise
        .then(({ geometry, dropGeo }) => {
          let anim = new FaceAnimation({ geometry, dropGeo, mini: this.mini });

          return anim.promise;
        })
        .then(({ geometry, material, mesh, dropMesh }) => {
          //
          // dropMesh.rotation.x = Math.PI * 0.5;
          // dropMesh.rotation.z = Math.PI * 0.5;
          dropMesh.scale.set(500, 500, 500);
          appScene.add(dropMesh);

          // mesh.rotation.x = Math.PI * 0.5;
          // mesh.rotation.z = Math.PI * 0.5;
          mesh.scale.set(500, 500, 500);
          appScene.add(mesh);
        });
    });
  }
}

export class FaceAnimation {
  constructor({ geometry, dropGeo, mini }) {
    this.mini = mini;
    this.geometry = geometry;
    this.dropGeo = dropGeo;
    this.promise = this.setup();
  }
  async setup() {
    let material = new MeshStandardMaterial({
      transparent: true,
      color: new Color("#ffffff"),
      metalness: 0.9,
      roughness: 0.3,
    });

    let progressShared = { value: 0 };
    let speed = 1.0;
    this.mini.onLoop(() => {
      let time = window.performance.now() * 0.0001 * speed;
      let tt = time % 1;

      progressShared.value = tt;
    });

    material.onBeforeCompile = (node) => {
      node.uniforms.time = { value: 0 };
      node.uniforms.progress = progressShared;

      node.uniforms.bMin = { value: this.geometry.boundingBox.min };
      node.uniforms.bMax = { value: this.geometry.boundingBox.max };

      this.mini.onLoop(() => {
        node.uniforms.time.value += 1000 / 60 / 1000;
      });
      node.uniforms["density"] = { value: 1.5 };
      node.uniforms["colorSatuation"] = { value: 0.3 };

      if (!material.map) {
        node.vertexShader = node.vertexShader.replace(
          `#include <clipping_planes_pars_vertex>`,
          `#include <clipping_planes_pars_vertex>
          varying vec2 vUv;
        `
        );

        node.vertexShader = node.vertexShader.replace(
          `#include <fog_vertex>`,
          `#include <fog_vertex>
          vUv = uv;
        `
        );
      }

      node.vertexShader = node.vertexShader.replace(
        `#include <clipping_planes_pars_vertex>`,
        `#include <clipping_planes_pars_vertex>


        uniform vec3 bMin;
        uniform vec3 bMax;

        uniform vec3 delay;

        uniform float time;
        uniform float progress;
        varying float vOpacity;
        `
      );

      node.vertexShader = node.vertexShader.replace(
        `#include <project_vertex>`,
        /* glsl */ `

      vec4 mvPosition = vec4(transformed, 1.0 );

      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif

      mvPosition = modelViewMatrix * mvPosition;

      gl_Position = projectionMatrix * vec4(mvPosition.xyz * 1.0, mvPosition.w);

      float yTotal = (bMax.y - bMin.y);
      float yPercent = position.y / yTotal;
      float transition = (progress);
      float bodyPercent = (yPercent * 0.5 + 0.5);
      float slick = transition - bodyPercent;

      if (slick < 0.0) {
        gl_Position = vec4(vec3(0.0), 0.0);
      } else if (slick < 0.1) {
        float slickP = pow(slick * 10.0, 0.8);
        vOpacity = slick * 10.0;
      } else {
        vOpacity = 1.0;
      }
    `
      );

      node.fragmentShader = node.fragmentShader.replace(
        `#include <clipping_planes_pars_fragment>`,
        /* glsl */ `
        #include <clipping_planes_pars_fragment>

        varying float vOpacity;
        uniform float time;

        float avg3 (vec3 v3color) {
          return (v3color.r + v3color.g + v3color.b) / 3.0;
        }
      `
      );

      node.fragmentShader = node.fragmentShader.replace(
        `gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,
        /* glsl */ `
// float transition = smoothstep(0.0, 1.0, abs(sin((vScan.x) + time)));
        gl_FragColor = vec4(outgoingLight, diffuseColor.a * vOpacity);
        `
      );
    };

    //

    material.needsUpdate = true;

    let geometry = this.geometry;
    let mesh = new Mesh(geometry, material);

    this.material = material;
    this.geometry = geometry;
    this.mesh = mesh;

    this.dropMaterial = new ShaderMaterial({
      transparent: true,
      uniforms: {
        progress: progressShared,
      },
      vertexShader: /* glsl */ `

        #include <common>

        attribute vec3 offset;
        uniform vec3 bMin;
        uniform vec3 bMax;
        uniform float progress;

        varying float vOpacity;
        varying vec3 vColor;
        void main (void) {
          float yTotal = (bMax.y - bMin.y);
          float yPercent = offset.y / yTotal;
          float transition = (progress);
          float bodyPercent = (yPercent * 0.5 + 0.5);
          float slick = transition - bodyPercent;

          vec3 offset2 = offset;
          vec3 box = position;

          if (slick >= 0.1) {
            vOpacity = 0.0;
          } else if (slick < 0.1) {
            float slickP = pow(slick * 10.0, 0.8);

            box.y = mix(box.y + 0.001, box.y, slickP);
            box.y = mix(box.y * 100.0, box.y, slickP);

            vOpacity = slick * 5.0;
          }

          vec3 nPos = box + offset2;
          vec4 mvPosition = modelViewMatrix * vec4(nPos, 1.0);

          vColor = vec3(
            0.2 + rand(0.1 + mvPosition.xx),
            0.2 + rand(0.2 + mvPosition.yy),
            0.2 + rand(0.3 + mvPosition.zz)
          );

          gl_Position = projectionMatrix * mvPosition;

          // if (slick < 0.0) {
          //   gl_Position = vec4(0.0);
          // }
        }
      `,

      //
      fragmentShader: /* glsl */ `
        varying vec3 vColor;

        varying float vOpacity;

        void main (void) {
        gl_FragColor = vec4(vColor.rgb, (vOpacity));
        }
      `,
    });

    this.dropMaterial.uniforms.bMin = { value: this.geometry.boundingBox.min };
    this.dropMaterial.uniforms.bMax = { value: this.geometry.boundingBox.max };

    this.dropMesh = new Mesh(this.dropGeo, this.dropMaterial);

    return this;
  }
}

export class GeoProcessor {
  constructor({ geometry }) {
    this.geometry = geometry;
    this.promise = this.setup();
  }
  async setup() {
    let geometry = this.geometry;
    geometry.computeBoundingBox();

    //- -------

    let dropGeo = (this.dropGeo = new InstancedBufferGeometry());
    dropGeo.copy(new BoxBufferGeometry(0.0001, 0.0001, 0.0001));

    let points = [];
    let origPosAttr = geometry.attributes.position;
    geometry.index.array.forEach((ptIDX) => {
      let x = origPosAttr.getX(ptIDX);
      let y = origPosAttr.getY(ptIDX);
      let z = origPosAttr.getZ(ptIDX);
      //
      points.push(new Vector3(x, y, z));
    });

    let offsetData = [];
    points.forEach((pt) => {
      offsetData.push(pt.x, pt.y, pt.z);
    });
    dropGeo.setAttribute(
      "offset",
      new InstancedBufferAttribute(new Float32Array(offsetData), 3)
    );
    dropGeo.instanceCount = points.length;
    //

    return this;
  }
}
