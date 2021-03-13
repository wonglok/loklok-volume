module.exports = /* glsl */ `
precision highp float;
varying highp vec2 vUv;
uniform highp sampler2D uPosTex;
uniform highp sampler2D uVelTex;

void main() {

  vec4 pos = texture2D(uPosTex, vUv);
  vec4 vel = texture2D(uVelTex, vUv);

  gl_FragColor = vec4(pos.rgb + vel.rgb, 1.0);
}
`;
