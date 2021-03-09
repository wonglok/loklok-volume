module.exports = /* glsl */ `
uniform sampler2D nowPosTex;
attribute vec2 uv;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uModelMatrix;
void main (void) {
  vec3 pos = texture2D(nowPosTex, uv.xy).xyz;
  gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(pos, 1.0);
  gl_PointSize = 1.0;
}
`;
