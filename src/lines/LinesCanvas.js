import { useEffect, useRef } from "react";
import { Mini } from "../shared/Mini";
import { Base } from "../shared/Base";
import { LineStuff } from "./LineStuff";
import { SceneControls } from "../shared/SceneControls";
import {
  BoxBufferGeometry,
  PlaneBufferGeometry,
  SphereBufferGeometry,
  Vector3,
} from "three";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import {DRACOLoader} from "three/examples/jsm/loaders/DRACOLoader.js";
//
// import { SceneControls } from "../shared/SceneControls";


export const LinesCanvas = () => {
  const ref = useRef(null);
  const replayBtn = useRef(null);
  //



  useEffect(() => {

    // load GLTF loader 
    const loadModel = async (mini,uri) => 
    {
    return new Promise(resolve => {
      var loaderModel = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderConfig( { type: 'jsm' } );
      //dracoLoader.setDecoderPath( "three/examples/js/libs/draco/" );
      dracoLoader.setDecoderPath( "http://192.168.0.22:5000/draco/" );
      loaderModel.setDRACOLoader( dracoLoader );

      loaderModel.load(
        uri,
        model => {

          let geometries = []
          let objects_name = []

          // find all geometries in model
          model.scene.traverse( function ( object ) {
            if ( object.isMesh === true ) {
              geometries.push( object );
            }
          });

          let placement = new Vector3(-10.0, +9.0, -0.0) ; //new Vector3(+60.0, -40.0, -5.0) ;

          geometries.forEach( object => {
            let object_name = object.name;
            let object_geo = object.geometry;
            object_geo.scale(5,5,5);

            new LineStuff(mini, {
              name: object_name,
              baseGeometry: object_geo,
              position: placement,
            });
            objects_name.push(object_name)
          } )

          console.error(objects_name)
          let play = () => {

            let mini_objects = []

            objects_name.forEach(element => {
              mini_objects.push(mini.i[element])
            });

            Promise.all([
              mini.i.floor,
              mini.i.item1,
              mini.i.item2,
              mini.i.item3,
              //
            ].concat(mini_objects)).then( (array_items) => {
              
              array_items.forEach( (item) => {
                item.hide();
              })
      
              array_items.forEach( (item, idx) => {
                item.run({ delay: idx*30 });
              })

            });
          };
          play();
          replayBtn.current.style.cursor = "pointer";
          replayBtn.current.addEventListener("click", () => {
            play();
          });
          resolve(model);
        }
      );
    });
    };

    //const uris = ["http://localhost:5000/2018_Mclaren_senna.gltf"]
    //const uris = ["http://localhost:5000/showroom_garments.gltf"]
    //const uris = ["http://localhost:5000/showroom_motorcycles.gltf"]
    //const uris = ["http://localhost:5000/villa_joli.gltf"]
    //const uris = ["http://localhost:5000/house_joli.gltf"]
    //const uris = ["http://localhost:5000/DE-LEB-08.gltf"]
    //const uris = ["http://localhost:5000/DE-LEB-08.gltf"]
    const uris = ["http://192.168.0.22:5000/katedra-processed.gltf"]
    
    const loadModel2 = async (mini,uri) =>{
      const [model] = await Promise.all([
        loadModel(mini, uri),
      ]);
      return model
    }

    let mini = new Mini({ name: "base", domElement: ref.current, window });
    
    let sphere = new SphereBufferGeometry(2.5, 45, 45);
    let box = new BoxBufferGeometry(5, 5, 5, 30, 30, 30);
    let floor = new PlaneBufferGeometry(50, 50, 150, 150);
    floor.rotateX(-0.5 * Math.PI);

    // load a set of GLTF objects
    uris.forEach( uri => {
      loadModel2(mini,uri).then( (model)=> {
        console.log(model.scene);
        /*Promise.all([
          mini.get("renderer"),
          mini.get("camera"),
          mini.get("scene"),
      ]).then(
          ([renderer,camera,scene]) => {
            //scene.add(model.scene)
            console.error(scene)
          }
        )*/
      } )
    })

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

    //, new SceneControls(mini)

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
