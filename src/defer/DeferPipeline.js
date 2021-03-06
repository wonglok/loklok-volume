import {
  Mesh,
  MeshBasicMaterial,
  BoxBufferGeometry,
  Color,
  Scene,
  PlaneBufferGeometry,
  WebGLRenderTarget,
  Camera,
  Vector2,
} from "three";

// eslint-disable-next-line

// import text from "!!raw-loader!./shader/text.vert";
// console.log(text);

export class DeferPipeline {
  constructor(mini) {
    this.mini = mini;
    this.setup();
  }
  async setup() {
    let sceneContent = new Scene();
    let renderer = await this.mini.get("renderer");
    let camera = await this.mini.get("camera");
    camera.position.y += 6;
    camera.position.x += 5;

    let makeBox = (cb = () => {}) => {
      let h = 1;
      let geoBox = new BoxBufferGeometry(1, h, 1);
      let matBox = new MeshBasicMaterial({ color: 0xffffff });
      let meshBox = new Mesh(geoBox, matBox);
      meshBox.position.y += h / 2;
      sceneContent.add(meshBox);
      cb(meshBox);
      meshBox.userData.matOrig = matBox;
    };

    makeBox((box) => {
      box.material.color = new Color("#2323ff");
      box.position.x += 0;
    });

    makeBox((box) => {
      box.material.color = new Color("#ffffff");
      box.position.x += 2;
    });

    makeBox((box) => {
      box.position.x += 4;
      box.material.color = new Color("#ff2323");
    });

    let geoPlane = new PlaneBufferGeometry(200, 200);
    geoPlane.rotateX(Math.PI * -0.5);
    let matPlane = new MeshBasicMaterial({ color: 0xbababa });
    let meshPlane = new Mesh(geoPlane, matPlane);
    sceneContent.add(meshPlane);

    // let rttPosition = new WebGLRenderTarget();
    // let rttNormal = new WebGLRenderTarget();

    let debugQuad = () => {
      let geoQuad = new PlaneBufferGeometry(2, 2);
      let camQuad = new Camera();
      camQuad.position.z = 1;
      let matQuad = new MeshBasicMaterial({ map: null });
      let meshQuad = new Mesh(geoQuad, matQuad);
      return ({ texture }) => {
        if (matQuad.map !== texture) {
          matQuad.map = texture;
        }
        renderer.render(meshQuad, camQuad);
      };
    };
    let size = new Vector2();
    renderer.getSize(size);
    let rttColor = new WebGLRenderTarget(size.x, size.y);
    // let rttDepth = new WebGLRenderTarget(
    //   size.x,
    //   size.y
    // );
    let debugTex = debugQuad();

    this.mini.onLoop(() => {
      // render color
      sceneContent.traverse((i) => {
        if (i && i.isMesh && i.material && i.userData.matOrig) {
          i.material = i.userData.matOrig;
        }
      });
      renderer.setRenderTarget(rttColor);
      renderer.render(sceneContent, camera);
      renderer.setRenderTarget(null);

      debugTex({ texture: rttColor.texture });
    });

    // debugger
    // scene.add(sceneContent);
  }
  clear() {}
}
