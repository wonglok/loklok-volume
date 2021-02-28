import { useEffect, useRef } from "react";
import { Mini } from "../shared/Mini";
import { Base } from "../shared/Base";
// import { VolumeControls } from "../shared/VolumeControls";
import { SceneControls } from "../shared/SceneControls";

import { Simulator } from "./Simulator";

export const GPUCanvas = () => {
  const ref = useRef(null);
  //
  useEffect(() => {
    let mini = new Mini({ name: "base", domElement: ref.current, window });
    let mods = [
      new Base(mini),
      new Simulator(mini),
      // new VolumeControls(mini),
      new SceneControls(mini),
    ];

    mini.get("SceneControls").then((mod) => {
      mod.controls.enableRotate = false;
      // window.addEventListener("touchstart", () => {
      //   mod.controls.enabled = false;
      // });
    });
    //, new SceneControls(mini)

    let rAFID = 0;

    let workDisplay = () => {};
    Promise.all([
      mini.get("renderer"),
      mini.get("camera"),
      mini.get("scene"),
    ]).then(([renderer, camera, scene]) => {
      camera.position.z = 15;
      workDisplay = () => {
        renderer.render(scene, camera);
      };
    });

    let rAF = () => {
      rAFID = requestAnimationFrame(rAF);
      workDisplay();
      mini.work();
    };
    rAFID = requestAnimationFrame(rAF);

    let cleaner = () => {
      cancelAnimationFrame(rAFID);
      mini.clean();
      mods.forEach((m) => {
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

  return <div className="w-full h-full" ref={ref}></div>;
};

if (module.hot) {
  module.hot.dispose(() => {
    window.location.reload();
  });
}
