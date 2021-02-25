import { useEffect, useRef } from "react";
import { Mini } from "../shared/Mini";
import { Base } from "../shared/Base";
import { SDFVoxel } from "./SDFVoxel";
import { SceneControls } from "./SceneControls";

export const VoxelCanvas = () => {
  const ref = useRef(null);
  //
  useEffect(() => {
    let mini = new Mini({ name: "base", domElement: ref.current, window });
    let mods = [new Base(mini), new SDFVoxel(mini), new SceneControls(mini)];

    let rAFID = 0;

    let workDisplay = () => {};
    Promise.all([
      mini.get("renderer"),
      mini.get("camera"),
      mini.get("scene"),
    ]).then(([renderer, camera, scene]) => {
      camera.position.z = 50;
      workDisplay = () => {
        renderer.render(scene, camera);
      };
    });

    let rAF = () => {
      rAFID = requestAnimationFrame(rAF);
      mini.work();
      workDisplay();
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
