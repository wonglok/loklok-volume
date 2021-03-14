module.exports = /* glsl */ `
precision highp float;
attribute vec2 aPosition;
attribute vec2 aUV;
varying vec2 vUv2;
varying vec3 vUv3;
uniform vec2 tex3dRes2;
uniform float size;

void main() {
  vec3 position = vec3(aPosition, 0.0);
  vUv2 = vec2(aUV.x, aUV.y);

  vec2 pixels = tex3dRes2 * aUV;

  float x = mod(pixels.x, size);
  float z = fract(pixels.x);
  float y = pixels.y;

  vUv3 = vec3(x, y, z) / size;

  gl_Position = vec4(position, 1.0);
}
`;
