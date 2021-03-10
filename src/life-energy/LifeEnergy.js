import createContext from "pex-context";
import createCamera from "pex-cam/perspective";
import mat4 from "pex-math/mat4";
// import createOrbiter from "pex-cam/orbiter";
// import createCube from "primitive-cube";
import { Clock } from "three";
import vec3 from "pex-math/vec3";

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

var radius = 1.5;
var sphereGeo = require("primitive-sphere")(radius, {
  segments: 32,
});

const visibleHeightAtZDepth = (depth, zPos, fov) => {
  // compensate for cameras not positioned at z=0
  const cameraOffset = zPos;
  if (depth < cameraOffset) depth -= cameraOffset;
  else depth += cameraOffset;

  // vertical fov in radians
  const vFOV = fov;

  // Math.abs to ensure the result is always positive
  return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
};

const visibleWidthAtZDepth = (depth, zPos, fov, aspect) => {
  const height = visibleHeightAtZDepth(depth, zPos, fov, aspect);
  return height * aspect;
};

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
    //
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

    // createOrbiter({ camera: camera, distance: 6 });

    const texSizeX = 512;
    const texSizeY = 512;
    const particleCount = texSizeX * texSizeY;

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

    makeEntry("pos0");
    makeEntry("pos1");
    makeEntry("pos2");

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

    //

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
        uProjectionMatrix: camera.projectionMatrix,
        uViewMatrix: camera.viewMatrix,
        uModelMatrix: mat4.create(),
        nowPosTex: null,
      },
    };

    // ----- ----- -----
    // Mouse
    // ----- ----- -----
    let mouse = vec3.create();
    let mouseNow = vec3.create();
    let mouseLast = vec3.create();

    mini.domElement.addEventListener("mousemove", (evt) => {
      evt.preventDefault();
      let width = visibleWidthAtZDepth(
        vec3.length(camera.position),
        camera.position[2],
        camera.fov,
        camera.aspect
      );
      let height = visibleHeightAtZDepth(
        vec3.length(camera.position),
        camera.position[2],
        camera.fov,
        camera.aspect
      );

      mouse[0] =
        ((evt.clientX - this.rect.width * 0.5) / this.rect.width) * width * 0.5;
      mouse[1] =
        ((this.rect.height * 0.5 - evt.clientY) / this.rect.height) *
        height *
        0.5;

      // console.log(mouse);
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
        let width = visibleWidthAtZDepth(
          vec3.length(camera.position),
          camera.position[2],
          camera.fov,
          camera.aspect
        );
        let height = visibleHeightAtZDepth(
          vec3.length(camera.position),
          camera.position[2],
          camera.fov,
          camera.aspect
        );

        mouse[0] =
          ((evt.touches[0].clientX - this.rect.width * 0.5) / this.rect.width) *
          width *
          0.5;
        mouse[1] =
          ((this.rect.height * 0.5 - evt.touches[0].clientY) /
            this.rect.height) *
          height *
          0.5;
      },
      { passive: false }
    );

    // ----- ----- -----
    // Sphere
    // ----- ----- -----

    let cursor = {
      pipeline: ctx.pipeline({
        // depthTest: true,
        vert: `
          attribute vec3 aPosition;
          attribute vec3 aNormal;
          uniform mat4 uProjectionMatrix;
          uniform mat4 uViewMatrix;
          uniform mat4 uModelMatrix;
          varying vec3 vNormal;
          void main () {
            gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
            vNormal = aNormal;
          }
        `,
        frag: `
          precision mediump float;
          varying vec3 vNormal;
          void main () {
            gl_FragColor.rgb = (vNormal * 0.5 + 0.5) * 0.1;
            gl_FragColor.a = 0.05;
          }
        `,
        blend: true,
      }),
      attributes: {
        aPosition: ctx.vertexBuffer(sphereGeo.positions),
        aNormal: ctx.vertexBuffer(sphereGeo.normals),
      },
      indices: ctx.indexBuffer(sphereGeo.cells),
      uniforms: {
        uProjectionMatrix: camera.projectionMatrix,
        uViewMatrix: camera.viewMatrix,
        uModelMatrix: mat4.create(),
      },
    };

    let gridPts = [];
    let iThree = 16;

    for (let z = 0; z < iThree; z++) {
      for (let y = 0; y < iThree; y++) {
        for (let x = 0; x < iThree; x++) {
          gridPts.push(
            3.0 * ((x / iThree) * 2.0 - 1.0),
            3.0 * ((y / iThree) * 2.0 - 1.0),
            3.0 * ((z / iThree) * 2.0 - 1.0)
          );
        }
      }
    }

    const drawStarGrid = {
      name: "drawStarGrid",
      pipeline: ctx.pipeline({
        vert: `
        precision highp float;
        attribute vec3 aPosition;
        // attribute vec3 aNormal;
        uniform float eT;

        uniform mat4 uProjectionMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uModelMatrix;

        ${require("./shader/metaball.common")}

        varying vec3 vNormal;
        varying float vSize;

        void main () {

          gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
          vNormal = normalize(gl_Position.xyz);
          // vPos = aPosition;

          float dist = sdMetaBall(vec3(aPosition.x, aPosition.y, aPosition.z));

          if (dist < 0.0) {
            gl_PointSize = max(min(-dist, 1.0), 0.0) * 10.0;
            vSize = max(min(-dist, 1.0), 0.0);
          } else {
            gl_PointSize = 0.0;
            vSize = 0.0;
          }
        }
        `,
        frag: `
        precision highp float;
          varying vec3 vNormal;
          varying float vSize;

          void main () {
            if (length(gl_PointCoord.xy - 0.5) < 0.5) {
              gl_FragColor.rgb = vec3(vNormal * 0.5 + 0.5);
              gl_FragColor.rgb *= gl_FragColor.rgb;
              gl_FragColor.a = 0.05 * vSize;
            } else {
              discard;
            }
          }
        `,
        primitive: ctx.Primitive.Points,
        blend: true,
      }),
      attributes: {
        aPosition: ctx.vertexBuffer(gridPts),
      },
      count: gridPts.length / 3,
      uniforms: {
        eT: 0,
        uProjectionMatrix: camera.projectionMatrix,
        uViewMatrix: camera.viewMatrix,
        uModelMatrix: mat4.scale(mat4.create(), [1, 1, 1]),
        nowPosTex: null,
      },
    };

    let tick = 0;
    let clock = new Clock();
    let ioNames = ["pos0", "pos2", "pos1"];
    mini.onLoop(() => {
      vec3.set(mouseLast, mouseNow);
      vec3.set(mouseNow, mouse);

      let dT = clock.getDelta();
      let eT = clock.getElapsedTime();
      ctx.submit(clearScreenCmd);

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
            mouseNow: mouseNow,
            mouseLast: mouseLast,
          },
        },
      });

      mat4.identity(cursor.uniforms.uModelMatrix);
      mat4.translate(cursor.uniforms.uModelMatrix, [mouse[0], mouse[1], 0, 0]);

      ctx.submit(cursor);

      ctx.submit(drawParticlesCmd, {
        uniforms: {
          nowPosTex: textures[ioNames[0]],
        },
      });

      ctx.submit(drawStarGrid, {
        uniforms: {
          eT,
        },
      });

      displayTexture({ texture: textures.pos0, slot: 0 });
      tick += 1;
    });
  }
}
