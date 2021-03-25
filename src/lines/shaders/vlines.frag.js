module.exports = /* glsl */ `
  varying vec2 vUv;
  uniform float progress;

  void main (void) {
    // gl_PointSize = 1.0;
    gl_FragColor = vec4(vUv.xy, 1.0,  0.1 * (progress) + 0.05);
  }
`;
