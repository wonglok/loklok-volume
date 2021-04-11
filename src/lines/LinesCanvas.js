import { useEffect, useRef } from "react";
import { Mini } from "../shared/Mini";
import { Base } from "../shared/Base";
import { LineStuff } from "./LineStuff";
import { SceneControls } from "../shared/SceneControls";
import {
  BoxBufferGeometry,
  PlaneBufferGeometry,
  SphereBufferGeometry,
  TextGeometry,
  FontLoader,
  Mesh,
  Material,
  Vector3,
} from "three";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
//
// import { SceneControls } from "../shared/SceneControls";

export const LinesCanvas = () => {
  const ref = useRef(null);
  const replayBtn = useRef(null);

  useEffect(() => {

    const loadModel = async (mini,uri,index,placement,scale,effect_speed) => 
    {
    return new Promise(resolve => {
      var loaderModel = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderConfig( { type: 'jsm' } );
      dracoLoader.setDecoderPath( "draco/" );
      loaderModel.setDRACOLoader( dracoLoader );

      loaderModel.load(
        uri,
        model => {

          let geometries = []
          let objects_name = []

          model.scene.traverse( function ( object ) {
            if ( object.isMesh === true ) {
              geometries.push( object );
            }
          });

          let loaderText = new FontLoader();
          loaderText.load( 'fonts/helvetiker_regular.typeface.json', function ( font ) {
            const geometry = new TextGeometry( 'Smart Showroom Test', {
                font: font,
                size: 20,
                height: 2,
                curveSegments: 20,
                bevelEnabled: false,
                bevelThickness: 10,
                bevelSize: 8,
                bevelOffset: 0,
                bevelSegments: 10
              } );

            let super_mesh = new Mesh(geometry,new Material());
            super_mesh.geometry.scale(0.7,0.7,0.7)
            super_mesh.name = "text_mesh";
            
            if (index==0) {
              //geometries.push(super_mesh);
            }
            
            geometries.forEach( object => {

              if (object.name === "text_mesh") {
                placement = new Vector3(-5.0* index, +300.0, -5.0*index) ; 
              }

              let object_name = object.name + "_" + index;
              let object_geo = object.geometry;
              object_geo.scale(scale,scale,scale);
  
              new LineStuff(mini, {
                name: object_name,
                baseGeometry: object_geo,
                position: placement,
              });
              objects_name.push(object_name)
            } )
  
            console.error(objects_name)
            let play = () => {
  
              let ready = mini.ready;
  
              const set_of_promises = objects_name.map(element => {
                return ready[element];
              });

              Promise.all(
                set_of_promises
              ).then( (array_items) => {
                console.log(array_items)
                array_items.forEach( (item) => {
                  item.hide();
                })
        
                array_items.forEach( (item, idx) => {
                  item.run({ delay: idx*effect_speed });
                })
  
              });
            };
            play();
            replayBtn.current.style.cursor = "pointer";
            replayBtn.current.addEventListener("click", () => {
              play();
            });
            resolve(model);
          } );
          


        }
      );
    });
    };


    const uris = ["http://localhost:5000/gltf/showroom_garments.gltf","http://localhost:5000/gltf/showroom_motorcycles.gltf","http://localhost:5000/gltf/motorcycles.gltf"]
    const placements = [new Vector3(-500, -40.0, -5.0),new Vector3(+500, -40.0, -5.0), new Vector3(+500, -30.0, +140.0),new Vector3(+0.0 +  10.0, -3.0, -5.0)]
    const scales = [1,1,3,0.2]
    const effect_speed = [150,150,300,50]
    
    const loadModel2 = async (mini,uri,index) =>{
      const [model] = await Promise.all([
        loadModel(mini, uri, index, placements[index],scales[index],effect_speed[index]),
      ]);
      return model
    }

    let mini = new Mini({ name: "base", domElement: ref.current, window });

    let sphere = new SphereBufferGeometry(2.5, 45, 45);
    let box = new BoxBufferGeometry(5, 5, 5, 30, 30, 30);
    let floor = new PlaneBufferGeometry(50, 50, 150, 150);
    floor.rotateX(-0.5 * Math.PI);

    // load a set of GLTF objects
    uris.forEach( (uri,index) => {
      loadModel2(mini,uri,index).then( (model)=> {
        console.log(model.scene);

        /*

        //maybe scene.add(model.scene) to render faces for 3D models composed of flat surface low polygon ?

        Promise.all([
          mini.get("renderer"),
          mini.get("camera"),
          mini.get("scene"),
      ]).then(
          ([renderer,camera,scene]) => {
            //scene.add(model.scene)
            console.error(scene)
          }
        )*/
      });
    });

    let parts = [
      //
      new Base(mini),
      //
      new LineStuff(mini, {
        name: "floor",
        baseGeometry: floor,
        position: new Vector3(0.0, -2.5, 0.0),
      }),
      new LineStuff(mini, {
        //,
        name: "item1",
        baseGeometry: sphere,
        position: new Vector3(0.0, -70.0, 0.0),
      }),
      new LineStuff(mini, {
        //
        name: "item2",
        baseGeometry: sphere,
        position: new Vector3(7.0, -70.0, 0.0),
      }),
      new LineStuff(mini, {
        //
        name: "item3",
        baseGeometry: sphere,
        position: new Vector3(7.0, -70.0, 0.0),
      }),
      new SceneControls(mini),
    ];

    let rAFID = 0;

    let workDisplay = () => {};
    Promise.all([
      mini.get("renderer"),
      mini.get("camera"),
      mini.get("scene"),
    ]).then(
      ([
        //
        renderer,
        camera,
        scene,
      ]) => {
        camera.position.x = -5;
        camera.position.y = 15;
        camera.position.z = 40;
        renderer.autoClear = false;
        workDisplay = () => {
          renderer.clear();
          renderer.render(scene, camera);
        };
      }
    );

    let rAF = () => {
      rAFID = requestAnimationFrame(rAF);
      workDisplay();
      mini.work();
    };
    rAFID = requestAnimationFrame(rAF);

    let cleaner = () => {
      cancelAnimationFrame(rAFID);
      mini.clean();
      parts.forEach((m) => {
        if (m.clean) {
          m.clean();
        }
      });
    };

    if (module.hot) {
      module.hot.dispose(() => {
        cleaner();
      });
    }

    return cleaner;
  }, []);

  return (
    <div className="w-full h-full" ref={ref}>
      <span
        className="bg-white p-3 m-3 inline-block absolute top-0 left-0 text-xs"
        ref={replayBtn}
      >
        Replay
      </span>
    </div>
  );
};

if (module.hot) {
  module.hot.dispose(() => {
    window.location.reload();
  });
}
