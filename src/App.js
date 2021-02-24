import "./App.css";
import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { VolumeCanvas } from "./volume/VolumeCanvas";

function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/about">
          <div>About</div>
        </Route>
        <Route exact path="/users">
          <div>Users</div>
        </Route>
        <Route exact path="/">
          <VolumeCanvas></VolumeCanvas>
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
