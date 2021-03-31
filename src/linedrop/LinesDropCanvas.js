import { useEffect, useRef } from "react";
import { Mini } from "../shared/Mini";
import { Base } from "../shared/Base";
import { LineStuff } from "./LineStuff";
import { SceneControls } from "../shared/SceneControls";
import {
  BoxBufferGeometry,
  PlaneBufferGeometry,
  SphereBufferGeometry,
  Vector3,
} from "three";

//
// import { SceneControls } from "../shared/SceneControls";

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

    let parts = [
      //
      new Base(mini),
      //
      new LineStuff(mini, {
        name: "floor",
        baseGeometry: floor,
        position: new Vector3(0.0, -2.5, 0.0),
      }),
      new LineStuff(mini, {
        //,
        name: "item1",
        baseGeometry: sphere,
        position: new Vector3(0.0, 0.0, 0.0),
      }),
      new LineStuff(mini, {
        //
        name: "item2",
        baseGeometry: sphere,
        position: new Vector3(7.0, 0.0, 0.0),
      }),
      new LineStuff(mini, {
        //
        name: "item3",
        baseGeometry: box,
        position: new Vector3(-7.0, 0.0, 0.0),
      }),
      new SceneControls(mini),
    ];

    //, new SceneControls(mini)
    let play = () => {
      Promise.all([
        mini.i.floor,
        mini.i.item1,
        mini.i.item2,
        mini.i.item3,
        //
      ]).then(([floor, item1, item2, item3]) => {
        floor.hide();
        item1.hide();
        item2.hide();
        item3.hide();

        floor.run({});

        item1.run({ delay: 1500 });
        item2.run({ delay: 2000 });
        item3.run({ delay: 2500 });
      });
    };
    play();

    replayBtn.current.style.cursor = "pointer";
    replayBtn.current.addEventListener("click", () => {
      play();
    });

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
      parts.forEach((m) => {
        if (m.clean) {
          m.clean();
        }
      });
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
