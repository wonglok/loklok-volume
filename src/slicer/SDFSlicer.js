import { Geometry } from "three/examples/jsm/deprecated/Geometry";
import * as THREE from "three";

export class SDFSlicer {
  constructor(
    { onLoop, onResize, getRect, onClean, ...mini },
    name = "SDFSlicer"
  ) {
    this.mini = {
      onLoop,
      onResize,
      getRect,
      onClean,
      ...mini,
    };

    this.mini.set(name, this);

    this.setupSlicer();
  }
  async setupSlicer() {
    let scene = await this.mini.get("scene");

    var planeGeom = new THREE.PlaneBufferGeometry(50, 50);
    let planeGeomGeo = new Geometry().fromBufferGeometry(planeGeom);
    var plane = new THREE.Mesh(
      planeGeom,
      new THREE.MeshBasicMaterial({
        color: 0xbababa,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
      })
    );
    plane.userData.geo = planeGeomGeo;
    scene.add(plane);

    var objGeom = new THREE.TorusKnotBufferGeometry(30, 3.3, 50, 50, 2);
    objGeom.rotateX(Math.PI * -0.5);
    let objGeomGeo = new Geometry().fromBufferGeometry(objGeom);
    var obj = new THREE.Mesh(
      objGeom,
      new THREE.MeshBasicMaterial({
        color: "green",
        wireframe: true,
      })
    );
    // scene.add(obj);

    var a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3();

    var planePointA = new THREE.Vector3(),
      planePointB = new THREE.Vector3(),
      planePointC = new THREE.Vector3();

    var lineAB = new THREE.Line3(),
      lineBC = new THREE.Line3(),
      lineCA = new THREE.Line3();

    function drawIntersectionPoints() {
      plane.updateMatrixWorld(true);
      var geometry = new THREE.BufferGeometry();

      let vert = [];
      let setPointOfIntersection = (line, plane) => {
        let vec3 = new THREE.Vector3();
        let res = plane.intersectLine(line, vec3);
        if (res) {
          vert.push(...vec3.toArray());
          geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(new Float32Array(vert), 3)
          );
        }
      };
      var mathPlane = new THREE.Plane();

      plane.localToWorld(
        planePointA.copy(
          plane.userData.geo.vertices[plane.userData.geo.faces[0].a]
        )
      );
      plane.localToWorld(
        planePointB.copy(
          plane.userData.geo.vertices[plane.userData.geo.faces[0].b]
        )
      );
      plane.localToWorld(
        planePointC.copy(
          plane.userData.geo.vertices[plane.userData.geo.faces[0].c]
        )
      );
      mathPlane.setFromCoplanarPoints(planePointA, planePointB, planePointC);

      // mathPlane.setComponents(0, 1, 0, plane.position.y);

      objGeomGeo.faces.forEach((face) => {
        obj.localToWorld(a.copy(objGeomGeo.vertices[face.a]));
        obj.localToWorld(b.copy(objGeomGeo.vertices[face.b]));
        obj.localToWorld(c.copy(objGeomGeo.vertices[face.c]));
        lineAB = new THREE.Line3(a, b);
        lineBC = new THREE.Line3(b, c);
        lineCA = new THREE.Line3(c, a);
        setPointOfIntersection(lineAB, mathPlane);
        setPointOfIntersection(lineBC, mathPlane);
        setPointOfIntersection(lineCA, mathPlane);
      });

      var pointsMaterial = new THREE.PointsMaterial({
        size: 0.3,
        color: 0xffff00,
      });

      var points = new THREE.Points(geometry, pointsMaterial);
      scene.add(points);

      var lines = new THREE.LineSegments(
        geometry,
        new THREE.LineBasicMaterial({
          color: 0xffffff,
        })
      );
      scene.add(lines);
    }

    objGeom.computeBoundingBox();
    plane.position.z = objGeom.boundingBox.min.z;

    let inc = 2;
    for (
      let i = objGeom.boundingBox.min.z;
      i < objGeom.boundingBox.max.z + 1;
      i += inc
    ) {
      drawIntersectionPoints();
      plane.position.z += inc;
    }
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
