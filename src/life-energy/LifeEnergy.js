import createContext from "pex-context";
import createCamera from "pex-cam/perspective";
import createOrbiter from "pex-cam/orbiter";
import mat4 from "pex-math/mat4";
import createCube from "primitive-cube";
import { Clock, Vector3 } from "three";
var quad = require("primitive-quad")(1);

export class LifeEnergy {
  constructor(mini) {
    //
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

    this.setup();
  }
  setup() {
    let { ctx, mini } = this;

    const camera = createCamera({
      fov: Math.PI / 1.5,
      aspect: 1,
      position: [0, 0.0, 6],
      target: [0, 0, 0],
      near: 0.1,
      far: 500,
    });

    const camera2 = createCamera({
      fov: Math.PI / 1.5,
      aspect: 1,
      position: [0, 0.0, 6],
      target: [0, 0, 0],
      near: 0.1,
      far: 500,
    });

    createOrbiter({ camera: camera, distance: 6 });
    createOrbiter({ camera: camera2, distance: 6 });

    const texSizeX = 512;
    const texSizeY = 512;
    const particleCount = texSizeX * texSizeY;

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

    const displayDataTextureCmd = {
      name: "displayDataTextureCmd",
      pipeline: ctx.pipeline({
        blend: true,
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
      },
    };
    const displayTexture = ({ texture, slot }) => {
      ctx.submit(displayDataTextureCmd, {
        uniforms: {
          uTexture: texture,
        },
        viewport: [128 * slot, 0, 128, 128],
      });
    };

    const clearScreenCmd = {
      name: "clearScreen",
      pass: ctx.pass({
        clearColor: [0.0, 0.0, 0.0, 1],
      }),
    };

    // ----- ----- -----
    //
    // ----- ----- -----

    const db = new Proxy(
      {},
      {
        get: (obj, key) => {
          return obj[key];
        },
        set: (obj, key, val) => {
          obj[key] = val;
          return true;
        },
      }
    );
    const textures = new Proxy(db, {
      get: (obj, key) => {
        return obj[key].texture;
      },
    });

    let makeEntry = (name) => {
      // const depthMap = ctx.texture2D({
      //   width: texSizeX,
      //   height: texSizeY,
      //   pixelFormat: ctx.PixelFormat.Depth,
      //   encoding: ctx.Encoding.Linear,
      // });

      let texture = ctx.texture2D({
        width: texSizeX,
        height: texSizeY,
        pixelFormat: ctx.PixelFormat.RGBA16F,
        encoding: ctx.Encoding.Linear,
      });

      const saveToTextureCmd = {
        name: "saveToTextureCmd",
        pass: ctx.pass({
          color: [texture],
          // depth: depthMap,
          clearColor: [0, 0, 0, 0],
          // clearDepth: 1,
        }),
        viewport: [0, 0, texSizeX, texSizeY],
      };

      db[name] = db[name] || {};
      db[name].texture = texture;
      db[name].simulate = ({ cmd, opts = {} }) => {
        ctx.submit(saveToTextureCmd, {}, () => {
          ctx.submit(cmd, opts);
        });
      };
    };

    makeEntry("test");

    //
    makeEntry("pos0");
    makeEntry("pos1");
    makeEntry("pos2");

    // ----- ----- ----- //
    // Draw a block
    // ----- ----- ----- //

    const floor = createCube(2, 0.1, 2);
    const drawFloorCmd = {
      name: "drawFloorCmd",
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

    // ----- ----- -----
    // Simulate Position
    // ----- ----- -----

    const simulatePositionCmd = {
      name: "simulatePositionCmd",
      pipeline: ctx.pipeline({
        vert: require("./shader/screen-image.vert"),
        frag: require("./shader/simulate-position.frag"),
      }),
      attributes: {
        aPosition: {
          buffer: ctx.vertexBuffer(quadPositions),
        },
        aTexCoord0: {
          buffer: ctx.vertexBuffer(quadTexCoords),
        },
      },
      indices: {
        buffer: ctx.indexBuffer(quadFaces),
      },
      uniforms: {
        dT: 0.0,
        eT: 0.0,
        uTexture: null,
        resolution: [texSizeX, texSizeY],
      },
    };

    // ----- ----- -----
    // Display Particles
    // ----- ----- -----
    let lookup = [];
    for (let y = 0; y < texSizeY; y++) {
      for (let x = 0; x < texSizeX; x++) {
        lookup.push(x / texSizeX, y / texSizeY);
      }
    }

    const drawParticlesCmd = {
      name: "drawParticlesCmd",
      pipeline: ctx.pipeline({
        vert: require("./shader/particle-position.vert"),
        frag: require("./shader/particle-position.frag"),
        primitive: ctx.Primitive.Points,
      }),
      attributes: {
        // uv: quadTexCoords,
        uv: ctx.vertexBuffer(lookup),
      },
      count: particleCount,
      uniforms: {
        uProjectionMatrix: camera2.projectionMatrix,
        uViewMatrix: camera2.viewMatrix,
        uModelMatrix: mat4.create(),
        nowPosTex: null,
      },
    };

    // ----- ----- -----
    // Mouse
    // ----- ----- -----
    let mouse = new Vector3(0.0, 0.0, 0.0);
    let mouseNow = new Vector3(0.0, 0.0, 0.0);
    let mouseLast = new Vector3(0.0, 0.0, 0.0);
    mini.domElement.addEventListener("mousemove", (evt) => {
      evt.preventDefault();
      mouse.setX((evt.clientX - this.rect.width * 0.5) / this.rect.width);
      mouse.setY((this.rect.height * 0.5 - evt.clientY) / this.rect.height);
    });

    mini.domElement.addEventListener(
      "touchstart",
      (ev) => {
        ev.preventDefault();
      },
      { passive: false }
    );

    mini.domElement.addEventListener(
      "touchmove",
      (evt) => {
        evt.preventDefault();
        mouse.setX(
          (evt.touches[0].clientX - this.rect.width * 0.5) / this.rect.width
        );
        mouse.setY(
          (this.rect.height * 0.5 - evt.touches[0].clientY) / this.rect.height
        );
      },
      { passive: false }
    );

    // ----- ----- -----
    // Mouse
    // ----- ----- -----

    let tick = 0;
    let clock = new Clock();
    let ioNames = ["pos0", "pos2", "pos1"];
    mini.onLoop(() => {
      let dT = clock.getDelta();
      let eT = clock.getElapsedTime();
      ctx.submit(clearScreenCmd);

      //
      db.test.simulate({
        cmd: drawFloorCmd,
        opts: {},
      });

      if (tick % 3 === 0.0) {
        ioNames = ["pos0", "pos1", "pos2"];
      } else if (tick % 3 === 1.0) {
        ioNames = ["pos2", "pos0", "pos1"];
      } else if (tick % 3 === 2.0) {
        ioNames = ["pos1", "pos2", "pos0"];
      }

      db[ioNames[0]].simulate({
        cmd: simulatePositionCmd,
        opts: {
          uniforms: {
            dT,
            eT,
            uTextureCurrent: textures[ioNames[1]],
            uTextureLast: textures[ioNames[2]],
            mouseNow: mouseNow.copy(mouse).toArray(),
            mouseLast: mouseLast.copy(mouseNow).toArray(),
          },
        },
      });

      ctx.submit(drawParticlesCmd, {
        uniforms: {
          nowPosTex: textures[ioNames[0]],
        },
      });

      displayTexture({ texture: textures.test, slot: 0 });
      displayTexture({ texture: textures.pos0, slot: 1 });
      tick += 1;
    });
  }
}
