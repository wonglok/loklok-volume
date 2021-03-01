import "./App.css";
import React from "react";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";
import { VolumeCanvas } from "./volume/VolumeCanvas";
import { SlicerCanvas } from "./slicer/SlicerCanvas";
import { GPUCanvas } from "./gpu/GPUCanvas";
import { EnergyCanvas } from "./energy/EnergyCanvas";
import { BubbleCanvas } from "./bubble/BubbleCanvas";
import { WaterCanvas } from "./water/WaterCanvas";
import { VolumeCanvas as VolumeScanCanvas } from "./volume-scan/VolumeCanvas";

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
        <Route exact path="/volume-scan">
          <VolumeScanCanvas></VolumeScanCanvas>
        </Route>
        <Route exact path="/bubble">
          <BubbleCanvas></BubbleCanvas>
        </Route>
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
            <Link to={"/volume-scan"}>Volume Scan</Link>
          </div>
          <div className={"m-5"}>
            <Link to={"/water"}>Water</Link>
          </div>
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
