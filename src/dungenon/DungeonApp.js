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
  RepeatWrapping,
  SphereGeometry,
  TextureLoader,
  Vector3,
} from "three";
import { DeviceOrientationControls } from "three/examples/jsm/controls/DeviceOrientationControls";
// import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import anime from "animejs/lib/anime.es.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { useEffect, useRef, useState } from "react";
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
            <div className={" flex flex-col justify-center items-center "}>
              <img
                className={" w-36 object-contain object-center lg:hidden"}
                src={require("./img/hold-phone-vertically.png").default}
                alt="hold phone up right"
              />
              <div className="p-3 lg:hidden">
                <b>Please Hold Your Phone Up.</b>
              </div>

              <div className={"hidden lg:block"}>
                Drag the mouse to look around.
              </div>

              <button
                onClick={() => {
                  let res = {
                    hide: () => {
                      insert.style.display = "none";
                      res.hide = () => {};
                    },
                  };
                  resolve(res);
                }}
                className={"px-6 py-3 border-yellow-700 border bg-white m-3"}
              >
                Start the theme Ride.
              </button>
            </div>
          </div>
        </div>,
        insert
      );
    });
  }

  async setupDesk() {
    let camera = await this.mini.ready.camera;
    let scene = await this.mini.ready.scene;

    let wayPts = this.getWayPts();
    camera.position.fromArray(wayPts[0].location);

    camera.lookAt(
      camera.position.x,
      40 + camera.position.y,
      -1 * camera.position.z
    );

    let { hide } = await this.setupPopup();
    hide();

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
    let { hide } = await this.setupPopup();

    let controls = new DeviceOrientationControls(camera);
    controls.addEventListener("change", () => {
      hide();
    });
    this.mini.onLoop(() => {
      controls.update();
    });
    this.mini.set(controls);
    this.mini.set("controls", controls);
    this.mini.set("game-started", true);
  }

  getWayPts() {
    this.wayPts = this.wayPts || [
      {
        location: [0, 300, -8 * 150],
      },
      {
        location: [0, 300, -2 * 150],
      },
      {
        location: [0, 55, 0 * 150],
      },
      {
        location: [0, 55, 0 * 150],
      },
      {
        location: [-40, 55, 1 * 150],
      },
      {
        location: [40, 55, 2 * 150],
      },
      {
        location: [-40, 55, 3 * 150],
      },
      {
        location: [40, 55, 4 * 150],
      },
      {
        location: [-40, 55, 5 * 150],
      },
      {
        location: [-40, 55, 6 * 150],
      },
      {
        location: [0, 55, 10 * 150],
      },
    ];
    return this.wayPts;
  }

  async setupTimelineSlider() {
    let controls = await this.mini.ready.controls;

    let pointDatabase = this.getWayPts();

    this.mini.set("init-pos", pointDatabase[0].location);

    let points = pointDatabase.map((p) => {
      return new Vector3().fromArray(p.location);
    });

    /*
    let initPosPromise = this.mini.ready["init-pos"];
    initPosPromise.then((e) => {
      console.log(e);
    });
    */

    let curve = new CatmullRomCurve3(points, false);

    let camdir = new Vector3();
    let camera = await this.mini.ready.camera;
    let goToPt = ({ progress }) => {
      curve.getPointAt(progress, camera.position);
      camera.getWorldDirection(camdir);
      if (controls.target) {
        controls.target.set(
          camera.position.x + camdir.x,
          camera.position.y + camdir.y,
          camera.position.z + camdir.z
        );
      }
    };

    let time = 0;
    let mode = "auto";
    this.mini.onLoop(() => {
      if (mode === "auto") {
        time += (1000 / 60) * 0.00002;
        if (time >= 1) {
          time = 1;
        }
        goToPt({ progress: time });
      } else {
        goToPt({ progress: time });
      }
    });
    let self = this;
    let rangerSlider = () => {
      let dom = this.mini.domElement;
      let insert = document.createElement("div");
      dom.appendChild(insert);

      function SliderUI() {
        let ref = useRef();

        useEffect(() => {
          let intv = setInterval(() => {
            ref.current.state.value = time * 100.0;
            if (ref.current.state.value > 100) {
              mode = "stop";
              ref.current.state.value = 100;
            }
            ref.current.setState(ref.current.state);
          }, 50);
          return () => {
            clearInterval(intv);
          };
        }, []);

        return (
          <div className=" absolute bottom-0 left-0 bg-gray-800 bg-opacity-70 w-full px-10 py-4">
            <div className="h-full w-full flex justify-center items-center">
              <Slider
                ref={ref}
                defaultValue={0}
                handleStyle={{
                  border: "none",
                  width: `30px`,
                  height: "30px",
                  top: `${-30 + 30 * 0.5 + 10}px`,
                }}
                trackStyle={{
                  backgroundColor: "white",
                }}
                onBeforeChange={(e) => {
                  time = e / 100;
                  mode = "drag";
                }}
                onChange={(e) => {
                  time = e / 100;
                  mode = "drag";
                }}
                onAfterChange={() => {
                  mode = "auto";
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

let loadGLTF = (url) => {
  return new Promise((resolve) => {
    new GLTFLoader().load(url, (model) => {
      console.log(model);
      resolve(model);
    });
  });
};

let loadMatCap = (url) => {
  return new Promise((resolve) => {
    let texture = new TextureLoader().load(url, (textutre) => {});

    let matcap = new MeshMatcapMaterial({
      matcap: texture,
      side: DoubleSide,
    });

    resolve(matcap);
  });
};

let loadTextureMaterial = (url) => {
  return new Promise((resolve) => {
    let texture = new TextureLoader().load(url, (textutre) => {
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(5, 5);
    });

    let matcap = new MeshStandardMaterial({
      map: texture,
      metalness: 0.5,
      roughness: 0.5,
      side: DoubleSide,
    });

    resolve(matcap);
  });
};

export class Dungeon {
  constructor(mini) {
    this.mini = mini;
    this.promise = this.setup();
  }
  async setup() {
    let renderer = await this.mini.ready.renderer;
    let scene = await this.mini.ready.scene;
    let gltf = await loadGLTF("/gamemap/dungeos-3.glb");

    let silver = await loadMatCap("/matcap/silver.jpg");
    let brick = await loadMatCap("/matcap/brick.jpg");
    // let cyanCyber = await loadMatCap("/matcap/cyan-green-cyber.jpg");
    // let muddy = await loadMatCap("/matcap/muddy.jpg");

    let floorWood = await loadTextureMaterial("/texture/floor-wood.jpg");
    floorWood.metalness = 0.1;
    floorWood.roughness = 0.9;
    let metalRoof = await loadTextureMaterial("/texture/metal-roof.jpg");
    let stone = await loadTextureMaterial("/texture/stone.jpg");

    let muddyMetalRoof = await loadTextureMaterial(
      "/texture/muddy-metal-roof.jpg"
    );
    muddyMetalRoof.color = new Color("#555555");

    gltf.scene.traverse((item) => {
      if (item.isMesh) {
        // console.log(item.name)
        // item.material.vertexColor = true;
        item.material = new MeshStandardMaterial({
          color: new Color("#ffffff"),
          metalness: 0.8,
          roughness: 0.3,
          // vertexColors: true,
        });

        console.log(item.name);

        if (item.name.indexOf("floor") !== -1) {
          item.material = floorWood;
        }
        if (item.name.indexOf("arch") !== -1) {
          item.material = metalRoof;
        }
        if (item.name.indexOf("door") !== -1) {
          item.material = brick;
        }
        if (item.name.indexOf("roof") !== -1) {
          item.material = muddyMetalRoof;
        }
        if (item.name.indexOf("wall") !== -1) {
          item.material = muddyMetalRoof;
        }
        if (item.name.indexOf("pill") !== -1) {
          item.material = muddyMetalRoof;
        }
        if (item.name.indexOf("lamp") !== -1) {
          item.material = silver;
        }
        if (item.name.indexOf("stair") !== -1) {
          item.material = stone;
        }
        if (item.name.indexOf("fire") !== -1) {
          item.visible = false;
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
    let scale = 100.0;
    // o3d.position.y = 242.6 * scale;
    gltf.scene.scale.x = scale;
    gltf.scene.scale.y = scale;
    gltf.scene.scale.z = scale;

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

    o3d.add(gltf.scene);
    scene.add(o3d);

    this.mini.set("dungeonready", true);

    return this;
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
  }
}

export class DungeonApp {
  constructor(mini) {
    this.mini = mini;
    this.promise = this.setup();
  }

  async setup() {
    // let space = new SpaceWalk(this.mini);
    let dungeon = new Dungeon(this.mini);
    let bubbles = new Bubbles(this.mini);
    let pop = new RequestGameControl(this.mini);

    // this.mini.ready["dungeon-loaded"];

    return this;
  }
}
