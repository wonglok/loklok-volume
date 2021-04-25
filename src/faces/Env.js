import { PMREMGenerator, TextureLoader } from "three";

export class Env {
  constructor(mini) {
    this.mini = mini;

    this.promise = this.setup();
  }
  async setup() {
    let renderer = await this.mini.ready.renderer;
    let scene = await this.mini.ready.scene;
    const pmremGenerator = new PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    let url = `/hdr/adams_place_bridge_1k.png`;
    let loader = new TextureLoader();
    // loader.setDataType(UnsignedByteType);
    loader.load(url, (texture) => {
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      scene.environment = envMap;
    });
  }
}
