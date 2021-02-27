import { useEffect, useRef } from "react";
import { Mini } from "../shared/Mini";
import { Base } from "../shared/Base";
import { Bubbles } from "./Bubbles";
import { SceneControls } from "../shared/SceneControls";

export const BubbleCanvas = () => {
  const ref = useRef(null);
  //
  useEffect(() => {
    let mini = new Mini({ name: "base", domElement: ref.current, window });
    let mods = [new Base(mini), new Bubbles(mini), new SceneControls(mini)];

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

  return (
    <div className="w-full h-full relative" ref={ref}>
      <div className="absolute bottom-0 left-0 bg-white p-2 text-xs">
        <a
          href="https://web.archive.org/web/20201201113021/http://blog.edankwan.com/post/fake-and-cheap-3d-metaball"
          target="blank"
          className="underline"
        >
          Credit to Edan Kwan Blog ⤴️
        </a>
      </div>
      <div className="absolute top-0 right-0 bg-white p-2 text-xs">
        (Working Progress)
      </div>
    </div>
  );
};

if (module.hot) {
  module.hot.dispose(() => {
    window.location.reload();
  });
}
