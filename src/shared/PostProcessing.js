import { Vector2 } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";

export class PostProcessing {
  constructor(mini) {
    //
    this.mini = mini;
    this.promise = this.setup();
  }
  async setup() {
    let renderer = await this.mini.ready.renderer;
    let scene = await this.mini.ready.scene;
    let camera = await this.mini.ready.camera;

    let composer = new EffectComposer(renderer);

    let renderPass = new RenderPass(scene, camera);
    let unrealBloomPass = new UnrealBloomPass(
      new Vector2(renderer.domElement.width, renderer.domElement.height),
      0.4,
      1.2,
      0.25
    );

    composer.addPass(renderPass);

    composer.addPass(unrealBloomPass);

    this.composer = composer;

    this.mini.set("composer", composer);
    return this;
  }
}
