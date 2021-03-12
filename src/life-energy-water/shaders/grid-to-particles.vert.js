module.exports = /* glsl */ `
  precision highp float;

  attribute vec2 aPosition;

  varying vec2 v_coordinates;

  void main () {
      v_coordinates = aPosition * 0.5 + 0.5;

      gl_Position = vec4(aPosition, 0.0, 1.0);
  }

`;
