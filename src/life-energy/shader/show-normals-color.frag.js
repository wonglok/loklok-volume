module.exports = /* glsl */ `
precision highp float;

varying vec4 vColor;

void main() {
  vec3 N = normalize(vColor.rgb * 2.0 - 1.0);
  vec3 L = normalize(vec3(1.0, 0.5, 0.2));
  gl_FragColor.rgb = vec3(max(0.0, dot(N, L))) * vec3(1.0, 0.0, 0.5);

  gl_FragColor.a = 1.0;
}
`;
