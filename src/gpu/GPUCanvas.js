import { useEffect, useRef } from "react";
import { Mini } from "../shared/Mini";
import { Base } from "../shared/Base";
import { Simulator } from "./Simulator";
// import { SceneControls } from "../shared/SceneControls";

export const GPUCanvas = () => {
  const ref = useRef(null);
  //
  useEffect(() => {
    let mini = new Mini({ name: "base", domElement: ref.current, window });
    let mods = [new Base(mini), new Simulator(mini)];

    //, new SceneControls(mini)

    let rAFID = 0;

    let workDisplay = () => {};
    Promise.all([
      mini.get("renderer"),
      mini.get("camera"),
      mini.get("scene"),
      mini.get("sceneUI"),
      mini.get("cameraUI"),
    ]).then(([renderer, camera, scene, sceneUI, cameraUI]) => {
      camera.position.z = 15;
      renderer.autoClear = false;
      workDisplay = () => {
        renderer.clear(true, true, true);
        renderer.render(scene, camera);
        renderer.render(sceneUI, cameraUI);
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
