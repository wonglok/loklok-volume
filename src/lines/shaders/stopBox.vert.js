module.exports = /* glsl */ `
  attribute vec3 offsets;
  attribute vec3 rand3;
  uniform float progress;
  uniform float height;
  varying vec2 vUv;

  // mat3 calcLookAtMatrix(vec3 origin, vec3 target, float roll) {
  //   vec3 rr = vec3(sin(roll), cos(roll), 0.0);
  //   vec3 ww = normalize(target - origin);
  //   vec3 uu = normalize(cross(ww, rr));
  //   vec3 vv = normalize(cross(uu, ww));

  //   return mat3(uu, vv, ww);
  // }

  void main (void) {
    vUv = uv;
    // vec3 faceMePos = position;

    // float myProgress = (1.0 - (progress)) * rand3.z;

    // faceMePos.y += height;
    // faceMePos.y *= myProgress;

    // faceMePos *= calcLookAtMatrix(vec3(0.0), vec3(cameraPosition.xyz), 0.0) * faceMePos;

    // vec3 newOffsets = offsets + vec3(0.0, height * myProgress, 0.0) * rand3 + vec3(0.0, rand3.y * height * 3.0 * myProgress * rand3.y, 0.0);

    // vec3 negOffset = vec3(0.0, -height * 0.0, 0.0) * progress;

    // vec3 spritePos = faceMePos + newOffsets + negOffset;

    vec4 mvPosition = modelViewMatrix * vec4(position + offsets, 1.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`;