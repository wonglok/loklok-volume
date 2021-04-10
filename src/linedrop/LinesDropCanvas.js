import { useEffect, useRef } from "react";
import { Mini } from "../shared/Mini";
import { Base } from "../shared/Base";
import { LineStuff } from "./LineStuff";
import { SceneControls } from "../shared/SceneControls";
import {
  BoxBufferGeometry,
  BufferAttribute,
  BufferGeometry,
  Matrix4,
  PlaneBufferGeometry,
  SphereBufferGeometry,
  Vector3,
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
// import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils";
// import { SimplifyModifier } from "three/examples/jsm/modifiers/SimplifyModifier.js";

import { resample, simplify } from "@thi.ng/geom-resample";
//
// import { SceneControls } from "../shared/SceneControls";
function combineBuffer(model, bufferName) {
  let count = 0;

  model.traverse(function (child) {
    if (child.isMesh) {
      const buffer = child.geometry.attributes[bufferName];

      count += buffer.array.length;
    }
  });

  const combined = new Float32Array(count);

  let offset = 0;

  model.traverse(function (child) {
    if (child.isMesh) {
      let wordPos = new Vector3();
      child.getWorldPosition(wordPos);
      console.log(wordPos);

      const buffer = child.geometry.attributes[bufferName];

      for (let li = 0; li < buffer.array.length; li += 3) {
        buffer.array[li + 0] += wordPos.x;
        buffer.array[li + 1] += wordPos.y;
        buffer.array[li + 2] += wordPos.z;
      }
      combined.set(buffer.array, offset);
      offset += buffer.array.length;
    }
  });

  return new BufferAttribute(combined, 3);
}

export const LinesDropCanvas = () => {
  const ref = useRef(null);
  const replayBtn = useRef(null);
  //
  useEffect(() => {
    let mini = new Mini({ name: "base", domElement: ref.current, window });

    let sphere = new SphereBufferGeometry(2.5, 45, 45);
    let box = new BoxBufferGeometry(5, 5, 5, 30, 30, 30);
    let floor = new PlaneBufferGeometry(50, 50, 150, 150);
    floor.rotateX(-0.5 * Math.PI);

    let getDraco = (url) => {
      return new Promise((resolve, reject) => {
        let loader = new DRACOLoader();
        loader.setDecoderConfig({ type: "js" });
        loader.setDecoderPath("/draco");
        loader.load(url, resolve, () => {}, reject);
      });
    };

    let getGLTF = (url) => {
      return new Promise((resolve, reject) => {
        let loader = new GLTFLoader();
        loader.load(url, resolve, () => {}, reject);
      });
    };

    let getFBX = (url) => {
      return new Promise((resolve, reject) => {
        let loader = new FBXLoader();
        loader.load(url, resolve, () => {}, reject);
      });
    };

    getGLTF("/model/ok/ok.glb").then((model) => {
      let parts = [
        //
        new Base(mini),
        //
        new LineStuff(mini, {
          name: "floor",
          baseGeometry: floor,
          position: new Vector3(0.0, -2.5, 0.0),
        }),
        // new LineStuff(mini, {
        //   //,
        //   name: "item1",
        //   baseGeometry: sphere,
        //   position: new Vector3(0.0, 0.0, 0.0),
        // }),
        // new LineStuff(mini, {
        //   //
        //   name: "item2",
        //   baseGeometry: sphere,
        //   position: new Vector3(7.0, 0.0, 0.0),
        // }),
        // new LineStuff(mini, {
        //   //
        //   name: "item3",
        //   baseGeometry: box,
        //   position: new Vector3(-7.0, 0.0, 0.0),
        // }),
        new SceneControls(mini),
      ];

      //
      let scene = model.scene ? model.scene : model;
      scene.traverse((e) => {
        if (e.geometry) {
          e.geometry.scale(500, 500, 500);
          // e.geometry.rotateX(Math.PI * -1.0);
          e.geometry.rotateZ(Math.PI * -1.5);
          e.geometry.translate(0, 0, -5);

          let oldData = e.geometry.attributes.position.array;

          let vtData = [];
          for (let v3 = 0; v3 < oldData.length; v3 += 3) {
            vtData.push([oldData[v3 + 0], oldData[v3 + 1], oldData[v3 + 2]]);
          }

          vtData = simplify(vtData, 0, true);

          // vtData = resample(vtData, { dist: 0.1 }, true);

          let geo = new BufferGeometry();
          geo.setAttribute(
            "position",
            new BufferAttribute(new Float32Array([].concat(...vtData)), 3)
          );

          geo.rotateX(Math.PI * 0.5);

          // geo.scale(1, 1, 1);

          parts.push(
            new LineStuff(mini, {
              //
              name: "combined",
              baseGeometry: geo,
              position: new Vector3(0.0, 0.0, 7.0),
            })
          );
        }
      });

      //, new SceneControls(mini)
      let play = () => {
        let ready = mini.ready;
        Promise.all([
          ready.floor,
          // ready.item1,
          // ready.item2,
          // ready.item3,

          ready.combined,
          //
        ]).then(
          ([
            //
            floor,
            // item1,
            // item2,
            // item3,

            combined,
          ]) => {
            floor.hide();
            // item1.hide();
            // item2.hide();
            // item3.hide();
            combined.hide();

            floor.run({});
            combined.run({ delay: 1500 });

            mini.onLoop(() => {
              let movement = Math.sin(window.performance.now() * 0.001 * 3);
              combined.mesh.position.y = movement * 0.1;
              combined.mesh.rotation.y = movement * 0.1;
            });

            // item1.run({ delay: 1500 });
            // item2.run({ delay: 2000 });
            // item3.run({ delay: 2500 });
          }
        );
      };
      play();

      replayBtn.current.style.cursor = "pointer";
      replayBtn.current.addEventListener("click", () => {
        play();
      });

      mini.onClean(() => {
        parts.forEach((m) => {
          if (m.clean) {
            m.clean();
          }
        });
      });
    });

    //loader

    let rAFID = 0;

    let workDisplay = () => {};
    Promise.all([
      mini.get("renderer"),
      mini.get("camera"),
      mini.get("scene"),
    ]).then(
      ([
        //
        renderer,
        camera,
        scene,
      ]) => {
        camera.position.x = -5;
        camera.position.y = 5;
        camera.position.z = 15;
        renderer.autoClear = false;
        workDisplay = () => {
          renderer.clear();
          renderer.render(scene, camera);
        };
      }
    );

    let rAF = () => {
      rAFID = requestAnimationFrame(rAF);
      workDisplay();
      mini.work();
    };
    rAFID = requestAnimationFrame(rAF);

    let cleaner = () => {
      cancelAnimationFrame(rAFID);
      mini.clean();
    };

    if (module.hot) {
      module.hot.dispose(() => {
        cleaner();
      });
    }

    return cleaner;
  }, []);

  return (
    <div className="w-full h-full" ref={ref}>
      <span
        className="bg-white p-3 m-3 inline-block absolute top-0 left-0 text-xs"
        ref={replayBtn}
      >
        Replay
      </span>
    </div>
  );
};

if (module.hot) {
  module.hot.dispose(() => {
    window.location.reload();
  });
}
