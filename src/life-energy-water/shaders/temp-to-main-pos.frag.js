module.exports = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D srcTex;

void main() {
  vec4 data = texture2D(srcTex, vUv);

  gl_FragColor = vec4(data);
}
`;
