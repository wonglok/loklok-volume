module.exports = /* glsl */ `
precision highp float;

varying vec2 vTexCoord0;

uniform sampler2D uTexture;
uniform bool uIsDepth;

void main() {
  if (uIsDepth) {
    float depth = texture2D(uTexture, vTexCoord0).r;
    gl_FragColor = vec4(vec3(pow(depth, 10.0)), 1.0);
  } else {
    gl_FragColor = texture2D(uTexture, vTexCoord0);
  }

}
`
