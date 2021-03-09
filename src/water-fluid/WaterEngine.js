const mat4 = require("pex-math/mat4");
const createCamera = require("pex-cam/perspective");
const createOrbiter = require("pex-cam/orbiter");
const createCube = require("primitive-cube");

export class WaterEngine {
  constructor(mini) {
    this.mini = mini;
    this.setup();
  }
  async setup() {
    let ctx = await this.mini.get("ctx");

    this.gridWidth = 40;
    this.gridHeight = 40;
    this.gridDepth = 20;

    this.gridResolutionX = this.gridWidth * 4.0;
    this.gridResolutionY = this.gridHeight * 4.0;
    this.gridResolutionZ = this.gridDepth * 4.0;

    // dimensions

    this.particlesWidth = this.gridResolutionX * this.gridResolutionY;
    this.particlesHeight = this.gridResolutionZ;

    this.velocityTextureWidth =
      (this.gridResolutionX + 1) * (this.gridResolutionZ + 1);
    this.velocityTextureHeight = this.gridResolutionY + 1;

    this.scalarTextureWidth = this.gridResolutionX * this.gridResolutionZ;
    this.scalarTextureHeight = this.gridResolutionY;

    this.clearScreenCmd = {
      name: "clearScreen",
      pass: ctx.pass({
        clearColor: [0.0, 0.0, 0.0, 1],
      }),
    };

    const depthMapSizeX = 1024;
    const depthMapSizeY = 1024;

    const depthMap = ctx.texture2D({
      width: depthMapSizeX,
      height: depthMapSizeY,
      pixelFormat: ctx.PixelFormat.Depth,
      encoding: ctx.Encoding.Linear,
    });

    const colorMap = ctx.texture2D({
      width: depthMapSizeX,
      height: depthMapSizeY,
      pixelFormat: ctx.PixelFormat.RGBA8,
      encoding: ctx.Encoding.SRGB,
    });

    const camera = createCamera({
      fov: Math.PI / 4,
      aspect: 1,
      position: [3, 0.5, 3],
      target: [0, 0, 0],
      near: 0.1,
      far: 50,
    });

    createOrbiter({ camera: camera, distance: 6 });

    const floor = createCube(2, 0.1, 2);
    this.drawColorToBufferCmd = {
      pass: ctx.pass({
        color: [colorMap],
        depth: depthMap,
        clearColor: [1.0, 1.0, 1.0, 1],
        clearDepth: 1,
      }),
      viewport: [0, 0, depthMapSizeX, depthMapSizeY],
      pipeline: ctx.pipeline({
        vert: require("./shader/show-normals.vert"),
        frag: require("./shader/show-normals-color.frag"),
        depthTest: true,
      }),
      uniforms: {
        uProjectionMatrix: camera.projectionMatrix,
        uViewMatrix: camera.viewMatrix,
        uModelMatrix: mat4.create(),
      },
      attributes: {
        aPosition: {
          buffer: ctx.vertexBuffer(floor.positions),
        },
        aNormal: {
          buffer: ctx.vertexBuffer(floor.normals),
        },
      },
      indices: {
        buffer: ctx.indexBuffer(floor.cells),
      },
    };

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

    this.displayTextureCmd = {
      name: "drawTexture",
      pipeline: ctx.pipeline({
        vert: require("./shader/screen-image.vert"),
        frag: require("./shader/screen-image.frag"),
      }),
      attributes: {
        aPosition: ctx.vertexBuffer(quadPositions),
        aTexCoord0: ctx.vertexBuffer(quadTexCoords),
      },
      indices: ctx.indexBuffer(quadFaces),
      uniforms: {
        uTexture: null,
        uIsDepth: false,
      },
    };

    let frameNumber = 0;
    this.mini.onLoop(() => {
      ctx.debug(++frameNumber === 1);
      //
      ctx.submit(this.clearScreenCmd);
      ctx.submit(this.drawColorToBufferCmd);

      ctx.submit(this.displayTextureCmd, {
        uniforms: {
          uTexture: colorMap,
        },
        viewport: [0, 0, 256, 256],
      });
    });
  }
  swap(object, a, b) {
    var temp = object[a];
    object[a] = object[b];
    object[b] = temp;
  }
  clean() {}
}
