import { useEffect, useRef } from "react";
import { Mini } from "../shared/Mini";
import { Base } from "../shared/Base";
import { SurfaceSim } from "./SurfaceSim";
import { SceneControls } from "../shared/SceneControls";

//
// import { SceneControls } from "../shared/SceneControls";

export const SurfaceCanvas = () => {
  const ref = useRef(null);
  //
  useEffect(() => {
    let mini = new Mini({ name: "base", domElement: ref.current, window });
    let mods = [new Base(mini), new SurfaceSim(mini), new SceneControls(mini)];

    //, new SceneControls(mini)

    let rAFID = 0;

    let rAF = () => {
      rAFID = requestAnimationFrame(rAF);
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
