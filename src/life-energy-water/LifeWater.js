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
//
// let makeQuadProgram = ({ name, computeFrag, uniforms = {} }) => {
//   const quadComputeCmd = {
//     name: "quadComputeCmd",
//     pipeline: ctx.pipeline({
//       vert: require("./shader/screen-image.vert"),
//       frag: computeFrag,
//     }),
//     attributes: {
//       aPosition: {
//         buffer: ctx.vertexBuffer(quadPositions),
//       },
//       aUV: {
//         buffer: ctx.vertexBuffer(quadTexCoords),
//       },
//     },
//     indices: {
//       buffer: ctx.indexBuffer(quadFaces),
//     },
//     uniforms: {
//       dT: 0,
//       eT: 0,
//       ...uniforms,
//     },
//   };

//   Database[name] = Database[name] || {};
//   Database[name].cmd = quadComputeCmd;
//   Database[name].update = ({ dT = 0, eT = 0, uniforms = {} }) => {
//     quadComputeCmd.uniforms = {
//       ...quadComputeCmd.uniforms,
//       dT,
//       eT,
//       ...uniforms,
//     };
//   };
// };

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

      let renderToTextureCmd = {
        pass: ctx.pass({
          clearColor: [0, 0, 0, 0],
          color: [texture],
        }),
        viewport: [0, 0, width, height],
      };

      return {
        name,
        texture,
        width,
        height,
        renderToTextureCmd,
      };
    };

    let make3DTexture = ({
      name,
      size,
      slicesPerRow,
      slot = 0,
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
            pixels[offset + 0] = (x / size) * 255;
            pixels[offset + 1] = (y / size) * 255;
            pixels[offset + 2] = (slice / size) * 255;
            pixels[offset + 3] = 255;
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

      let res = make2DTexture({
        name,
        width: texSizeX,
        height: texSizeY,
        data: pixels,
        format: ctx.PixelFormat.RGBA8,
      });

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
    mini.onResize(() => {
      this.rect = mini.getRect();
      camera.set({
        aspect: this.rect.width / this.rect.height,
      });
    });

    createOrbiter({ camera: camera, distance: 5, element: this.ctx.gl.canvas });

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

    const debugDataTextureCmd = {
      name: "debugDataTextureCmd",
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

    const debugTexture = ({ texture, slot }) => {
      ctx.submit(debugDataTextureCmd, {
        uniforms: {
          uTexture: texture,
        },
        viewport: [200 * slot, 0, 200, 200],
      });
    };

    const pParticlePos = make3DTexture({
      name: "pParticlePos",
      size: 32,
      slicesPerRow: 32,
      // slot: 2,
      // debugCanvas2D: true,
    });

    const pParticleVel = make3DTexture({
      name: "pParticleVel",
      size: 32,
      slicesPerRow: 32,
      // slot: 2,
      // debugCanvas2D: true,
    });

    const marker = make3DTexture({
      name: "marker",
      size: 32,
      slicesPerRow: 32,
      // slot: 3,
      // debugCanvas2D: true,
    });

    //marker

    const pParticlePosUV3 = makeUV3({
      size: pParticlePos.size,
      slicesPerRow: pParticlePos.slicesPerRow,
    });

    const pParticlePosUV2 = makeUV2({
      width: pParticlePos.width,
      height: pParticlePos.height,
    });

    const drawParticlesToGridTextureCmd = {
      pipeline: ctx.pipeline({
        vert: require("./shaders/particles-to-grid.vert"),
        frag: require("./shaders/particles-to-grid.frag"),
        blend: true,
        primitive: ctx.Primitive.Points,
      }),
      attributes: {
        uv2: pParticlePosUV2.uv2,
      },
      count: pParticlePosUV2.count,
      uniforms: {
        uFieldSize: [1, 1, 1],
        uFieldResSize: [
          pParticlePos.size,
          pParticlePos.size,
          pParticlePos.size,
        ],

        uAccumulate: 0,
        uZOffset: 0.0,

        uParticleVelTex: pParticleVel.texture,
        uParticlePosTex: pParticlePos.texture,

        // size: pParticlePos.size,
        // numRows: pParticlePos.numRows,
        // slicesPerRow: pParticlePos.slicesPerRow,
      },
    };

    const drawFromGridToPartcilesCmd = {
      pipeline: ctx.pipeline({
        vert: require("./shaders/grid-to-particles.vert"),
        frag: require("./shaders/grid-to-particles.frag"),
        blend: true,
        primitive: ctx.Primitive.Points,
      }),
      attributes: {
        aPosition: ctx.vertexBuffer(quadPositions),
        aUV: ctx.vertexBuffer(quadTexCoords),
      },
      indices: ctx.indexBuffer(quadFaces),

      uniforms: {
        uFieldSize: [1, 1, 1],
        uFieldResSize: [
          pParticlePos.size,
          pParticlePos.size,
          pParticlePos.size,
        ],

        //
      },
    };

    //

    const drawPartcilesToScreenCmd = {
      pipeline: ctx.pipeline({
        vert: require("./shaders/particles-display.vert"),
        frag: require("./shaders/particles-display.frag"),
        blend: true,
        primitive: ctx.Primitive.Points,
      }),
      attributes: {
        uv3: pParticlePosUV3.uv3,
      },
      count: pParticlePosUV3.count,

      uniforms: {
        uFieldSize: [1, 1, 1],
        uFieldResSize: [
          pParticlePos.size,
          pParticlePos.size,
          pParticlePos.size,
        ],

        uProjectionMatrix: camera.projectionMatrix,
        uViewMatrix: camera.viewMatrix,

        tex3DVel: pParticleVel.texture,
        tex3DPos: pParticlePos.texture,

        size: pParticlePos.size,
        numRows: pParticlePos.numRows,
        slicesPerRow: pParticlePos.slicesPerRow,
        //
      },
    };

    //

    let tick = 0;
    mini.onLoop(() => {
      ctx.submit(clearScreenCmd);

      let SPLAT_DEPTH = 5.0;
      ctx.submit(marker.renderToTextureCmd, {}, () => {
        //
        for (
          var z0 = -(SPLAT_DEPTH - 1) / 2;
          z0 <= (SPLAT_DEPTH - 1) / 2;
          ++z0
        ) {
          ctx.submit(drawParticlesToGridTextureCmd, {
            uniforms: {
              uAccumulate: 0.0,
              uZOffset: z0,
            },
          });
        }

        //
        for (
          var z1 = -(SPLAT_DEPTH - 1) / 2;
          z1 <= (SPLAT_DEPTH - 1) / 2;
          ++z1
        ) {
          ctx.submit(drawParticlesToGridTextureCmd, {
            uniforms: {
              uAccumulate: 1.0,
              uZOffset: z1,
            },
          });
        }
      });

      ctx.submit(pParticlePos.renderToTextureCmd, {}, () => {
        ctx.submit(drawFromGridToPartcilesCmd);
      });

      //

      ctx.submit(drawPartcilesToScreenCmd, {
        uniforms: {
          tex3D: pParticlePos.texture,
        },
      });

      // debugTexture({ texture: marker.texture, slot: 0 });
      // debugTexture({ texture: outputParticlePos.texture, slot: 1 });

      //
      tick++;
    });
  }
}
