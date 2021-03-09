const createContext = require("pex-context");

export class Pex {
  constructor({ onLoop, onResize, getRect, onClean, ...mini }) {
    this.mini = mini;
    this.rect = getRect();
    this.ctx = createContext({
      pixelRatio: 2,
      width: this.rect.width,
      height: this.rect.height,
    });

    onResize(() => {
      this.rect = getRect();
      this.ctx.set({
        pixelRatio: 2,
        width: this.rect.width,
        height: this.rect.height,
      });
    });

    mini.domElement.appendChild(this.ctx.gl.canvas);
    this.mini.set("ctx", this.ctx);
  }

  clean() {
    console.log("cleaning");
  }
}
