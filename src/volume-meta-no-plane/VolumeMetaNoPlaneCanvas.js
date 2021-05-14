import { useEffect, useRef } from "react";
import { Mini } from "../shared/Mini";
import { Base } from "../shared/Base";
// import { SDFTexture } from "./SDFTexture";
import { VolumeVisualiser } from "./VolumeVisualiser";
import { SceneControls } from "../slicer/SceneControls";
import { VolumeControls } from "./VolumeControls";

export const VolumeMetaNoPlaneCanvas = () => {
  const ref = useRef(null);
  useEffect(() => {
    let mini = new Mini({ name: "base", domElement: ref.current, window });
    let mods = [
      new Base(mini),
      new SceneControls(mini),
      new VolumeControls(mini),
      // new SDFTexture(mini),
      new VolumeVisualiser(mini),
    ];

    let rAFID = 0;

    // let renderer = false;
    // let camera = false;
    // let scene = false;

    // mini.get("renderer").then((v) => (renderer = v));
    // mini.get("camera").then((v) => (camera = v));
    // mini.get("scene").then((v) => (scene = v));

    let workDisplay = () => {};
    Promise.all([
      mini.get("renderer"),
      mini.get("camera"),
      mini.get("scene"),
      mini.get("VolumeVisualiser"),
      // mini.get("SDFTexture"),
    ]).then(([renderer, camera, scene, vol]) => {
      camera.position.z = 50;

      workDisplay = () => {
        // if (sdf.compute) {
        //   sdf.compute();
        // }

        if (vol.compute) {
          vol.compute();
        }

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
