module.exports = /* glsl */ `
precision highp float;
attribute highp vec2 aPosition;
attribute highp vec2 aUV;
varying highp vec2 vUv2;

uniform vec2 tex3dRes2;
// uniform float size;

void main() {
  vec3 position = vec3(aPosition, 0.0);

  // orignal
  vUv2 = vec2(aUV.x, aUV.y);// * tex3dRes2;

  // vUv2 = aPosition.xy * 0.5 + 0.5;

  gl_Position = vec4(position, 1.0);
}
`;
