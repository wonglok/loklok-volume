import "./App.css";
import React from "react";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";
import { VolumeCanvas } from "./volume/VolumeCanvas";
import { SlicerCanvas } from "./slicer/SlicerCanvas";
import { GPUCanvas } from "./gpu/GPUCanvas";
import { EnergyCanvas } from "./energy/EnergyCanvas";
import { BubbleCanvas } from "./bubble/BubbleCanvas";
import { WaterCanvas } from "./water/WaterCanvas";
import { VolumeMetaCanvas } from "./volume-meta/VolumeMetaCanvas";
import { HumanCanvas } from "./human/HumanCanvas";
import { SDFVolumeCanvas } from "./sdf-texture/SDFVolumeCanvas";
import { GravitySDFCanvas } from "./gravity-sdf/GravitySDFCanvas";
import { VolumeDisplayCanvas } from "./volume-display/VolumeDisplayCanvas";
import { CloudCanvas } from "./cloud/CloudCanvas";
import { DeferCanvas } from "./defer/DeferCanvas";
import { FluidCanvas } from "./water-fluid/FluidCanvas";
import { LifeCanvas } from "./life-energy/LifeCanvas";
import { LifeWaterCanvas } from "./life-energy-water/LifeWaterCanvas";
import { LinesCanvas } from "./lines/LinesCanvas";
import { LinesDropCanvas } from "./linedrop/LinesDropCanvas";
import { EnergyWarCanvas } from "./energy-war/EnergyCanvas";
import { FacesCanvas } from "./faces/FacesCanvas";
import { EyeMovieCanvas } from "./eyemovie/EyeMovieCanvas";
import { DungeonCanvas } from "./dungenon/DungeonCanvas";
import { SurfaceCanvas } from "./sdf-vertex-surface/SurfaceCanvas";
import { InstancedSurfaceCanvas } from "./sdf-vertex-surface-instancing/InstancedSurfaceCanvas";

function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/about">
          <div>About</div>
        </Route>
        <Route exact path="/water">
          <WaterCanvas></WaterCanvas>
        </Route>
        <Route exact path="/gpu">
          <GPUCanvas></GPUCanvas>
        </Route>
        <Route exact path="/energy">
          <EnergyCanvas></EnergyCanvas>
        </Route>
        <Route exact path="/slicer">
          <SlicerCanvas></SlicerCanvas>
        </Route>
        <Route exact path="/volume">
          <VolumeCanvas></VolumeCanvas>
        </Route>
        <Route exact path="/volume-meta">
          <VolumeMetaCanvas></VolumeMetaCanvas>
        </Route>
        <Route exact path="/bubble">
          <BubbleCanvas></BubbleCanvas>
        </Route>
        <Route exact path="/human">
          <HumanCanvas></HumanCanvas>
        </Route>
        <Route exact path="/sdf-renderer">
          <SDFVolumeCanvas></SDFVolumeCanvas>
        </Route>
        <Route exact path="/sdf-gravity">
          <GravitySDFCanvas></GravitySDFCanvas>
        </Route>
        <Route exact path="/volume-display">
          <VolumeDisplayCanvas></VolumeDisplayCanvas>
        </Route>
        <Route exact path="/cloud">
          <CloudCanvas></CloudCanvas>
        </Route>
        <Route exact path="/defer">
          <DeferCanvas></DeferCanvas>
        </Route>
        <Route exact path="/fluid">
          <FluidCanvas></FluidCanvas>
        </Route>
        <Route exact path="/life-energy">
          <LifeCanvas></LifeCanvas>
        </Route>

        <Route exact path="/life-energy-water">
          <LifeWaterCanvas></LifeWaterCanvas>
        </Route>
        <Route exact path="/line-stuff">
          <LinesCanvas></LinesCanvas>
        </Route>
        <Route exact path="/line-drop">
          <LinesDropCanvas></LinesDropCanvas>
        </Route>
        <Route exact path="/energy-war">
          <EnergyWarCanvas></EnergyWarCanvas>
        </Route>
        <Route exact path="/faces">
          <FacesCanvas></FacesCanvas>
        </Route>
        <Route exact path="/movie">
          <EyeMovieCanvas></EyeMovieCanvas>
        </Route>
        <Route exact path="/dungeon">
          <DungeonCanvas></DungeonCanvas>
        </Route>
        <Route exact path="/sdf-vertex-surface">
          <SurfaceCanvas></SurfaceCanvas>
        </Route>

        <Route exact path="/sdf-vertex-surface-instancing">
          <InstancedSurfaceCanvas></InstancedSurfaceCanvas>
        </Route>

        {/* Energy Game SDF Physics */}

        <Route exact path="/">
          <div className={"m-5"}>
            <Link to={"/volume"}>Volume</Link>
          </div>
          <div className={"m-5"}>
            <Link to={"/slicer"}>Slicer</Link>
          </div>
          <div className={"m-5"}>
            <Link to={"/gpu"}>GPU</Link>
          </div>
          <div className={"m-5"}>
            <Link to={"/energy"}>Energy</Link>
          </div>
          <div className={"m-5"}>
            <Link to={"/bubble"}>Bubble</Link>
          </div>
          <div className={"m-5"}>
            <Link to={"/volume-meta"}>Volume Meta</Link>
          </div>
          <div className={"m-5"}>
            <Link to={"/water"}>Water</Link>
          </div>
          {/* <div className={"m-5"}>
            <Link to={"/human"}>Human</Link>
          </div> */}
          <div className={"m-5"}>
            <Link to={"/sdf-renderer"}>SDF Texture Renderer</Link>
          </div>
          <div className={"m-5"}>
            <Link to={"/sdf-gravity"}>Gravity SDF Canvas</Link>
          </div>
          <div className={"m-5"}>
            <Link to={"/volume-display"}>Volume Display Canvas</Link>
          </div>
          <div className={"m-5"}>
            <Link to={"/cloud"}>Cloud Canvas</Link>
          </div>
          <div className={"m-5"}>
            <Link to={"/defer"}>Deferred Rendering (work in progress)</Link>
          </div>
          <div className={"m-5"}>
            <Link to={"/fluid"}>Fluid Water</Link>
          </div>
          <div className={"m-5"}>
            <Link to={"/life-energy"}>Life Energy</Link>
          </div>
          <div className={"m-5"}>
            <Link to={"/life-energy-water"}>Life Energy Water</Link>
          </div>
          <div className={"m-5"}>
            <Link to={"/line-stuff"}>Line Drop Rooms</Link>
          </div>
          <div className={"m-5"}>
            <Link to={"/line-drop"}>Line Drop</Link>
          </div>
          <div className={"m-5"}>
            <Link to={"/energy-war"}>Energy War</Link>
          </div>
          <div className={"m-5"}>
            <Link to={"/faces"}>Faces</Link>
          </div>

          <div className={"m-5"}>
            <Link to={"/movie"}>Movie</Link>
          </div>
          <div className={"m-5"}>
            <Link to={"/dungeon"}>Dungeon</Link>
          </div>

          <div className={"m-5"}>
            <Link to={"/sdf-vertex-surface"}>SDF Vertex Surface</Link>
          </div>
          <div className={"m-5"}>
            <Link to={"/sdf-vertex-surface-instancing"}>
              Instanced SDF Vertex Surface
            </Link>
          </div>

          <div className={"h-12"}></div>
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
