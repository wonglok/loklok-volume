module.exports = /* glsl */ `
precision highp float;
attribute vec2 aPosition;
attribute vec2 aUV;
varying vec2 vUv2;
uniform vec2 tex3dRes2;
uniform float size;

void main() {
  vec3 position = vec3(aPosition, 0.0);
  // orignal
  vUv2 = vec2(aUV.x, aUV.y);

  gl_Position = vec4(position, 1.0);
}
`;
