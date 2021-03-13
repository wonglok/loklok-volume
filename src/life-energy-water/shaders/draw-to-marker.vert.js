module.exports = /* glsl */ `
precision highp float;
attribute vec2 aPosition;
attribute vec2 aUV;
varying vec2 vUv;
void main() {
  vec3 position = vec3(aPosition, 1.0);
  vUv = aUV;
  gl_Position = vec4(position, 1.0);
}
`;
