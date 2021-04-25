import { useEffect, useRef } from "react";
import { Mini } from "../shared/Mini";
import { Base } from "../shared/Base";
// import { VolumeControls } from "../shared/VolumeControls";
import { SceneControls } from "../shared/SceneControls";

import { Faces } from "./Faces";
import { Env } from "./Env";
import { Color } from "three";
import { PostProcessing } from "../shared/PostProcessing";

export const FacesCanvas = () => {
  const ref = useRef(null);
  //
  useEffect(() => {
    let mini = new Mini({ name: "base", domElement: ref.current, window });
    let mods = [
      new Base(mini),
      new Faces(mini),
      new Env(mini),
      new PostProcessing(mini),
      // new VolumeControls(mini),
      new SceneControls(mini),
    ];

    mini.ready.scene.then((scene) => {
      scene.background = new Color("#121212");
    });
    mini.ready.SceneControls.then((mod) => {
      mod.controls.enableRotate = true;

      //
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
      mini.get("composer"),
    ]).then(([renderer, camera, scene, composer]) => {
      camera.position.y = 5;
      camera.position.z = 15;
      workDisplay = () => {
        // renderer.render(scene, camera);
        composer.render();
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

  return (
    <div className="w-full h-full" ref={ref}>
      {/* <div className="absolute bottom-0 left-0 bg-white p-2 text-xs">
        <a
          href="https://cineshader.com/view/3sySRK"
          target="blank"
          className="underline"
        >
          Faces Fade in by LokLok ⤴️
        </a>
      </div> */}
      <div className="absolute top-0 right-0 bg-white p-2 text-xs">
        <a href="/" className="underline">
          Home
        </a>
      </div>
    </div>
  );
};

if (module.hot) {
  module.hot.dispose(() => {
    window.location.reload();
  });
}
