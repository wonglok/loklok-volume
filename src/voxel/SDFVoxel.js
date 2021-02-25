// import { Geometry } from "three/examples/jsm/deprecated/Geometry";

// import { MeshBasicMaterial, Vector3 } from "three/src/Three";
// import { Plane } from "three/src/Three";
// import { Box3 } from "three/src/Three";
// import { TorusGeometry } from "three/src/Three";
// import { Mesh } from "three/src/Three";

export class SDFVoxel {
  constructor(
    { onLoop, onResize, getRect, onClean, ...mini },
    name = "SDFVoxel"
  ) {
    this.mini = {
      onLoop,
      onResize,
      getRect,
      onClean,
      ...mini,
    };

    this.mini.set(name, this);

    this.setupSDF();
  }

  async setupSDF() {
    // let scene = await this.mini.get("scene");
    // let geometry = new TorusGeometry(10, 3, 16, 100);
    // let material = new MeshBasicMaterial({
    //   color: 0xffff00,
    //   wireframe: true,
    // });
    // geometry.computeBoundingBox();
    // let minBox = geometry.boundingBox.min;
    // let maxBox = geometry.boundingBox.max;
    // let torus = new Mesh(geometry, material);
    // let segment = 128;
    // const plane = new Plane(new Vector3(0, 0, 1), 0);
    // const box = new Box3();
    // scene.add(torus);
  }

  clean() {
    console.log(123);
  }
}

/*

// Originally sourced from https://www.shadertoy.com/view/ldfSWs
// Thank you Iñigo :)

vec3 calcNormal(vec3 pos, float eps) {
  const vec3 v1 = vec3( 1.0,-1.0,-1.0);
  const vec3 v2 = vec3(-1.0,-1.0, 1.0);
  const vec3 v3 = vec3(-1.0, 1.0,-1.0);
  const vec3 v4 = vec3( 1.0, 1.0, 1.0);

  return normalize( v1 * map( pos + v1*eps ).x +
                    v2 * map( pos + v2*eps ).x +
                    v3 * map( pos + v3*eps ).x +
                    v4 * map( pos + v4*eps ).x );
}

vec3 calcNormal(vec3 pos) {
  return calcNormal(pos, 0.002);
}

*/
