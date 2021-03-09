import { useEffect, useRef } from "react";
import { Mini } from "../shared/Mini";
// import { VolumeControls } from "../shared/VolumeControls";
import { LifeEnergy } from "./LifeEnergy";

export const LifeCanvas = () => {
  const ref = useRef(null);
  //
  useEffect(() => {
    let mini = new Mini({ name: "base", domElement: ref.current, window });
    let mods = [
      //
      new LifeEnergy(mini),
    ];

    mini.get("ctx").then((ctx) => {
      ctx.frame(() => {
        mini.work();
      });
    });

    let cleaner = () => {
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
      <div className="absolute bottom-0 left-0 bg-white p-2 text-xs">
        {/* <a
          href="https://cineshader.com/view/3sySRK"
          target="blank"
          className="underline"
        >
          Meta Ball By Edan Kwan Cine Shader ⤴️
        </a> */}
      </div>
      <div className="absolute top-0 right-0 bg-white p-2 text-xs">
        <a href="/" className="underline">
          樂樂到此一遊
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
