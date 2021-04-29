import ReactDom from "react-dom";
import {
  AmbientLight,
  CatmullRomCurve3,
  Color,
  CubeRefractionMapping,
  DirectionalLight,
  DoubleSide,
  Mesh,
  MeshMatcapMaterial,
  MeshNormalMaterial,
  MeshStandardMaterial,
  Object3D,
  PMREMGenerator,
  Quaternion,
  SphereGeometry,
  TextureLoader,
  Vector3,
} from "three";
import { DeviceOrientationControls } from "three/examples/jsm/controls/DeviceOrientationControls";
// import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import anime from "animejs/lib/anime.es.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { useEffect, useRef } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

export class RequestGameControl {
  constructor(mini) {
    this.mini = mini;

    var isMobile = false; //initiate as false
    // device detection
    if (
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(
        navigator.userAgent
      ) ||
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw-(n|u)|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(-|_)|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-(m|p|t)|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c(-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac( |-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c(-|0|1)|47|mc|nd|ri)|sgh-|shar|sie(-|m)|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl-|tdg-|tel(i|m)|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(
        navigator.userAgent.substr(0, 4)
      )
    ) {
      isMobile = true;
    }

    let after = () => {
      return this.setupTimelineSlider();
    };
    if (isMobile) {
      this.promise = this.setupMobile();
    } else {
      this.promise = this.setupDesk();
    }

    this.mini.get("game-started").then(() => {
      after();
    });
  }
  async setupPopup() {
    return new Promise((resolve) => {
      let dom = this.mini.domElement;
      let insert = document.createElement("div");
      dom.appendChild(insert);
      ReactDom.render(
        <div className=" absolute top-0 left-0 h-full w-full bg-white bg-opacity-70 z-30">
          <div className="h-full w-full flex justify-center items-center">
            <button
              onClick={() => {
                insert.style.display = "none";
                resolve();
              }}
              className={"px-6 py-3 border-yellow-700 border bg-white m-3"}
            >
              Start the theme Ride.
            </button>
          </div>
        </div>,
        insert
      );
    });
  }

  async setupDesk() {
    let camera = await this.mini.ready.camera;
    let scene = await this.mini.ready.scene;
    camera.position.x = 0;
    camera.position.y = 40;
    camera.position.z = 0;
    await this.setupPopup();
    camera.lookAt(
      camera.position.x,
      40 + camera.position.y,
      -1 + camera.position.z
    );

    scene.add(camera);

    let renderer = await this.mini.ready.renderer;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.y += camera.position.y;
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableRotate = true;
    controls.enableZoom = false;

    this.mini.onLoop(() => {
      controls.update();
    });
    this.mini.set("controls", controls);
    this.mini.set("game-started", true);
  }
  async setupMobile() {
    let camera = await this.mini.ready.camera;
    camera.position.x = 0;
    camera.position.y = 40;
    camera.position.z = 0;
    await this.setupPopup();

    let controls = new DeviceOrientationControls(camera);
    this.mini.onLoop(() => {
      controls.update();
    });
    this.mini.set(controls);
    this.mini.set("controls", controls);
    this.mini.set("game-started", true);
  }

  async setupTimelineSlider() {
    let controls = await this.mini.ready.controls;

    let pointDatabase = [
      {
        location: [0, 40, 0 * 150],
      },
      {
        location: [-40, 40, -1 * 150],
      },
      {
        location: [40, 40, -2 * 150],
      },
      {
        location: [-40, 40, -3 * 150],
      },
      {
        location: [40, 40, -4 * 150],
      },
      {
        location: [-40, 40, -5 * 150],
      },
    ];

    let points = pointDatabase.map((p) => {
      return new Vector3().fromArray(p.location);
    });

    let curve = new CatmullRomCurve3(points, false);

    let camdir = new Vector3();
    let goToPt = ({ progress }) => {
      this.mini.get("camera").then((camera) => {
        curve.getPointAt(progress, camera.position);
        camera.getWorldDirection(camdir);
        if (controls.target) {
          controls.target.set(
            camera.position.x + camdir.x,
            camera.position.y + camdir.y,
            camera.position.z + camdir.z
          );
        }
      });
    };

    let intv = 0;
    let sess = 0;
    let run = () => {
      clearTimeout(sess);
      sess = setTimeout(() => {
        clearInterval(intv);
        intv = setInterval(() => {
          let progress = (window.performance.now() * 0.00001 * 2) % 1;
          goToPt({ progress });
        }, 1000 / 60);
      }, 100);
    };
    run();

    let rangerSlider = () => {
      let dom = this.mini.domElement;
      let insert = document.createElement("div");
      dom.appendChild(insert);

      function SliderUI() {
        return (
          <div className=" absolute bottom-0 left-0 bg-blue-800 bg-opacity-70 rounded-tr-2xl w-full px-10 py-4">
            <div className="h-full w-full flex justify-center items-center">
              <Slider
                defaultValue={0}
                handleStyle={{
                  width: `30px`,
                  height: "30px",
                  top: `${-30 + 30 * 0.5 + 10}px`,
                }}
                onChange={(e) => {
                  let localProgress = e / 100;
                  goToPt({ progress: localProgress });
                }}
                onAfterChange={(e) => {
                  run();
                }}
                min={0}
                max={100}
                step={0.01}
              />
            </div>
          </div>
        );
      }

      ReactDom.render(<SliderUI></SliderUI>, insert);
    };

    rangerSlider();
  }
}

let loadFBX = (url) => {
  return new Promise((resolve) => {
    new FBXLoader().load(url, (model) => {
      console.log(model);
      resolve(model);
    });
  });
};

let loadMatCap = (url) => {
  return new Promise((resolve) => {
    new TextureLoader().load(url, (textutre) => {
      let matcap = new MeshMatcapMaterial({
        matcap: textutre,
        side: DoubleSide,
      });
      resolve(matcap);
    });
  });
};

export class SpaceWalk {
  constructor(mini) {
    this.mini = mini;
    this.promise = this.setup();
  }
  async setup() {
    let renderer = await this.mini.ready.renderer;
    let scene = await this.mini.ready.scene;
    let fbx = await loadFBX("/gamemap/space-walk.fbx");
    let silver = await loadMatCap("/matcap/silver.png");
    fbx.traverse((item) => {
      if (item.isMesh) {
        // console.log(item.name)
        item.material = new MeshStandardMaterial({
          color: new Color("#ffffff"),
          metalness: 0.9,
          roughness: 0.1,
        });

        if (
          item.name === "Mesh018" ||
          item.name === "Mesh013" ||
          item.name === "Mesh017"
        ) {
          item.material = silver;
        }

        // item.material = new MeshStandardMaterial({
        //   color: new Color("#ff0000"),
        //   metalness: 0.9,
        //   roughness: 0.1,
        // });

        item.material.side = DoubleSide;
        item.material.transparent = true;
      }
    });
    let o3d = new Object3D();
    let scale = 0.5;
    o3d.position.y = 242.6 * scale;
    fbx.scale.x = scale;
    fbx.scale.y = scale;
    fbx.scale.z = scale;

    let ambLight = new AmbientLight(new Color("#ffffff"), 1);
    scene.add(ambLight);
    let directional = new DirectionalLight(new Color("#ffffff"), 1);
    directional.position.x = 10;
    directional.position.y = 10;
    scene.add(directional);

    let url = `/hdr/photo_studio_01.jpg`;
    const pmremGenerator = new PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    let loader = new TextureLoader();
    // loader.setDataType(UnsignedByteType);
    loader.load(url, (texture) => {
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      scene.environment = envMap;
    });

    o3d.add(fbx);
    scene.add(o3d);
  }
}

export class Bubbles {
  constructor(mini) {
    this.mini = mini;
    this.promise = this.setup();
  }
  async setup() {
    let onLoop = this.mini.onLoop;
    let scene = await this.mini.ready.scene;

    console.log(this.mini);

    let makeBall = ({ position }) => {
      let geo = new SphereGeometry(1, 32, 32);
      let mat = new MeshNormalMaterial();
      let mesh = new Mesh(geo, mat);
      scene.add(mesh);

      mesh.position.fromArray(position);
      let vel = new Vector3(getRand(), getRand(), getRand());
      let temp = new Vector3();
      onLoop(() => {
        let time = window.performance.now();
        mesh.position.add(
          temp.copy(vel).multiplyScalar(Math.sin(time * 0.00081))
        );
      });
    };

    let getRand = () => Math.random() - 0.5;
    let distribution = 2;

    for (let i = 0; i < 25; i++) {
      makeBall({
        position: [
          distribution * getRand(),
          distribution * getRand() + 30,
          -50,
        ],
      });
    }

    //
  }
}

export class EyeMovie {
  constructor(mini) {
    this.mini = mini;

    this.promise = this.setup();
  }
  async setup() {
    let space = new SpaceWalk(this.mini);
    let bubbles = new Bubbles(this.mini);
    let pop = new RequestGameControl(this.mini);
    //

    return this;
  }
}
