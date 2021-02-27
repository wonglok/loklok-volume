import { Mesh } from "three/build/three.module";
import { PlaneBufferGeometry } from "three/build/three.module";
import { OrthographicCamera } from "three/build/three.module";

export class Quad {
  constructor({ material }) {
    var camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var geometry = new PlaneBufferGeometry(2, 2);
    var mesh = new Mesh(geometry, material);

    this.render = ({ renderer }) => {
      renderer.render(mesh, camera);
    };
  }
}
