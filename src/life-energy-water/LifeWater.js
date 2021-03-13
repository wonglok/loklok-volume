import createContext from "pex-context";
import createCamera from "pex-cam/perspective";
import { Clock } from "three";
import createOrbiter from "pex-cam/orbiter";

// import mat4 from "pex-math/mat4";
// import vec3 from "pex-math/vec3";

const quadPositions = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

const quadTexCoords = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

const quadFaces = [
  [0, 1, 2],
  [0, 2, 3],
];

export class LifeWater {
  constructor(mini) {
    this.mini = mini;
    this.rect = mini.getRect();
    this.ctx = createContext({
      pixelRatio: 2,
      width: this.rect.width,
      height: this.rect.height,
    });
    mini.set("ctx", this.ctx);
    mini.onClean(() => {
      this.ctx.dispose();
      console.log("cleanup ctx");
    });

    mini.onResize(() => {
      this.rect = mini.getRect();
      this.ctx.set({
        pixelRatio: 2,
        width: this.rect.width,
        height: this.rect.height,
      });
    });

    mini.domElement.appendChild(this.ctx.gl.canvas);

    //
    this.setup();
  }
  setup() {
    let { ctx, mini } = this;

    let make2DTexture = ({
      name,
      width,
      height,
      data,
      format = ctx.PixelFormat.RGBA16F,
    }) => {
      let conf = {
        width: width,
        height: height,
        pixelFormat: format,
        encoding: ctx.Encoding.Linear,
        // flipY: true,
      };
      if (data) {
        conf.data = data;
      }

      let texture = ctx.texture2D(conf);

      console.log("texture-2d", name, width, height);

      let passWithClear = ctx.pass({
        clearColor: [0, 0, 0, 0],
        color: [texture],
      });

      let passWithoutClear = ctx.pass({
        color: [texture],
      });

      let viewport = [0, 0, width, height];

      return {
        name,
        texture,
        width,
        height,
        passWithClear,
        passWithoutClear,
        viewport,
      };
    };

    let make3DTexture = ({
      name,
      size,
      slicesPerRow,
      slot = 0,
      isIndex = false,
      format = false,
      // makeParticleUV = false,
      debugCanvas2D = false,
    }) => {
      // make 3D texture
      // var size = SIZE;
      // var slicesPerRow = COLS;

      var numRows = Math.floor((size + slicesPerRow - 1) / slicesPerRow);
      var pixels = new Uint8Array(size * slicesPerRow * size * numRows * 4);
      var pixelsAcross = slicesPerRow * size;

      // let r0 = () => Math.random() * 2.0 - 1.0;

      for (var slice = 0; slice < size; ++slice) {
        var row = Math.floor(slice / slicesPerRow);
        var xOff = (slice % slicesPerRow) * size;
        var yOff = row * size;
        for (var y = 0; y < size; ++y) {
          for (var x = 0; x < size; ++x) {
            var offset = ((yOff + y) * pixelsAcross + xOff + x) * 4;

            if (isIndex) {
              pixels[offset + 0] = (x / size) * 255;
              pixels[offset + 1] = (y / size) * 255;
              pixels[offset + 2] = (slice / size) * 255;
              pixels[offset + 3] = 255;
            } else {
              pixels[offset + 0] = (x / size) * 255;
              pixels[offset + 1] = (y / size) * 255;
              pixels[offset + 2] = (slice / size) * 255;
              pixels[offset + 3] = 255;
            }
          }
        }
      }

      let texSizeX = size * slicesPerRow;
      let texSizeY = size * numRows;

      // put this in a 2d canvas for debugging
      var dataCavans = document.createElement("canvas");
      dataCavans.width = texSizeX;
      dataCavans.height = texSizeY;
      var ctx2d = dataCavans.getContext("2d");
      var imageData = ctx2d.getImageData(
        0,
        0,
        dataCavans.width,
        dataCavans.height
      );
      var numBytes = dataCavans.width * dataCavans.height * 4;
      for (var ii = 0; ii < numBytes; ++ii) {
        imageData.data[ii] = pixels[ii];
      }

      ctx2d.putImageData(imageData, 0, 0);

      dataCavans.style.position = "absolute";
      dataCavans.style.top = dataCavans.height * slot + "px";
      dataCavans.style.left = 0 + "px";
      dataCavans.style.maxWidth = "calc(100% - 300px)";

      if (debugCanvas2D) {
        this.mini.domElement.appendChild(dataCavans);
      }

      let res = false;
      if (format) {
        res = make2DTexture({
          name,
          width: texSizeX,
          height: texSizeY,
          format,
        });
      } else {
        res = make2DTexture({
          name,
          width: texSizeX,
          height: texSizeY,
          data: pixels,
          format: ctx.PixelFormat.RGBA8,
        });
      }

      return {
        ...res,

        size,
        slicesPerRow,
        numRows,

        canvas: dataCavans,
        // width: texSizeX,
        // height: texSizeY,

        pixels,
      };
    };

    let makeUV2 = ({ width, height }) => {
      let uv2 = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          uv2.push(y / height, x / width);
        }
      }

      return {
        uv2: ctx.vertexBuffer(uv2),
        count: uv2.length / 2,
      };
    };

    let makeUV3 = ({ size, slicesPerRow }) => {
      let uv3 = [];
      // var numRows = Math.floor((size + slicesPerRow - 1) / slicesPerRow);
      var pixelsAcross = slicesPerRow * size;

      for (var slice = 0; slice < size; slice++) {
        var row = Math.floor(slice / slicesPerRow);
        var xOff = (slice % slicesPerRow) * size;
        var yOff = row * size;
        for (var y = 0; y < size; y++) {
          for (var x = 0; x < size; x++) {
            for (let repeat = 0; repeat < 5; repeat++) {
              var offset = ((yOff + y) * pixelsAcross + xOff + x) * 4;
              uv3[offset + 0] = x / size;
              uv3[offset + 1] = y / size;
              uv3[offset + 2] = slice / size;
            }
          }
        }
      }

      return {
        uv3: ctx.vertexBuffer(uv3),
        count: uv3.length / 3,
      };
    };

    const camera = createCamera({
      fov: Math.PI * 0.5,
      aspect: this.rect.width / this.rect.height,
      position: [0, 0.0, 10],
      target: [0, 0, 0],
      near: 0.1,
      far: 500,
    });
    const debugCamera = createCamera({
      fov: Math.PI * 0.5,
      aspect: 1,
      position: [0, 0.0, 10],
      target: [0, 0, 0],
      near: 0.1,
      far: 500,
    });
    mini.onResize(() => {
      this.rect = mini.getRect();
      camera.set({
        aspect: this.rect.width / this.rect.height,
      });
    });

    createOrbiter({ camera: camera, distance: 5, element: this.ctx.gl.canvas });
    createOrbiter({
      camera: debugCamera,
      distance: 5,
      element: this.ctx.gl.canvas,
    });

    let clock = new Clock();
    this.dT = 0;
    this.eT = 0;
    mini.onLoop(() => {
      this.dT = clock.getDelta();
      this.eT = clock.getElapsedTime();
    });

    const clearScreenCmd = {
      name: "clearScreen",
      pass: ctx.pass({
        clearColor: [0.0, 0.0, 0.0, 1],
      }),
    };

    const debugDataTexture2DCmd = {
      name: "debugDataTexture2DCmd",
      pipeline: ctx.pipeline({
        blend: true,
        vert: require("./shaders/screen-image.vert"),
        frag: require("./shaders/screen-image.frag"),
      }),
      attributes: {
        aPosition: ctx.vertexBuffer(quadPositions),
        aTexCoord0: ctx.vertexBuffer(quadTexCoords),
      },
      indices: ctx.indexBuffer(quadFaces),
      uniforms: {
        uTexture: null,
      },
    };
    const schema32 = make3DTexture({
      name: "schema32",
      size: 32,
      slicesPerRow: 32,
      // slot: 2,
      // debugCanvas2D: true,
    });

    const debug32UV3 = makeUV3({
      size: schema32.size,
      slicesPerRow: schema32.slicesPerRow,
    });

    const debugDataTexture3DCmd = {
      name: "debugDataTexture3DCmd",
      pipeline: ctx.pipeline({
        blend: true,
        vert: require("./shaders/debug-tex3d.vert"),
        frag: require("./shaders/debug-tex3d.frag"),
        primitive: ctx.Primitive.Points,
      }),
      attributes: {
        uv3: debug32UV3.uv3,
      },
      count: debug32UV3.count,
      uniforms: {
        uProjectionMatrix: debugCamera.projectionMatrix,
        uViewMatrix: debugCamera.viewMatrix,
        tex3dSrc: null,
        size: schema32.size,
        numRows: schema32.numRows,
        slicesPerRow: schema32.slicesPerRow,
      },
    };

    const debugTexture2D = ({ inputTexture, slot }) => {
      ctx.submit(debugDataTexture2DCmd, {
        uniforms: {
          uTexture: inputTexture,
        },
        viewport: [350 * slot, 0, 350, 350],
      });
    };

    const debugTexture3Ds32 = ({ inputTexture, slot }) => {
      ctx.submit(debugDataTexture3DCmd, {
        uniforms: {
          tex3dSrc: inputTexture,
        },
        viewport: [350 * slot, 0, 350, 350],
      });
    };

    const pParticlePos = make3DTexture({
      name: "pParticlePos",
      size: 32,
      slicesPerRow: 32,
      factor: 1,
    });

    const inBound = make3DTexture({
      name: "inBound",
      size: 32,
      slicesPerRow: 32,
      format: ctx.PixelFormat.RGBA16F,
    });

    const temp1 = make3DTexture({
      name: "temp1",
      size: 32,
      slicesPerRow: 32,
      format: ctx.PixelFormat.RGBA16F,
    });

    const gpuIO = {
      pipeline: ctx.pipeline({
        vert: require("./shaders/draw-to-marker.vert"),
        frag: require("./shaders/draw-to-marker.frag"),
        blend: true,
      }),
      attributes: {
        aPosition: ctx.vertexBuffer(quadPositions),
        aUV: ctx.vertexBuffer(quadTexCoords),
      },
      indices: ctx.indexBuffer(quadFaces),
      uniforms: {
        gridRes3: [schema32.size, schema32.size, schema32.size],

        tex3dInput0: schema32.texture,
        tex3dInput1: schema32.texture,
        tex3dInput2: schema32.texture,

        tex3DIndex: schema32.texture,
        size: schema32.size,
        numRows: schema32.numRows,
        slicesPerRow: schema32.slicesPerRow,

        dT: 1 / 60,
        eT: 0,
      },
    };

    //
    let tick = 0;
    mini.onLoop(() => {
      ctx.submit(clearScreenCmd);

      //
      ctx.submit(gpuIO, {
        uniforms: {
          dT: this.dT,
          eT: this.eT,

          // input:
          tex3dInput0: pParticlePos.texture,

          // code
          code: 0,
        },
        // output to
        pass: inBound.passWithClear,
        viewport: inBound.viewport,
      });

      //
      ctx.submit(gpuIO, {
        uniforms: {
          dT: this.dT,
          eT: this.eT,

          // input:
          tex3dInput0: inBound.texture,

          // code
          code: 1,
        },
        // output to
        pass: temp1.passWithClear,
        viewport: temp1.viewport,
      });

      //
      ctx.submit(gpuIO, {
        uniforms: {
          dT: this.dT,
          eT: this.eT,

          // input:
          tex3dInput0: temp1.texture,

          // code
          code: 2,
        },
        // output to
        pass: pParticlePos.passWithClear,
        viewport: pParticlePos.viewport,
      });

      debugTexture3Ds32({ inputTexture: pParticlePos.texture, slot: 0 });

      tick++;
    });
  }
}
