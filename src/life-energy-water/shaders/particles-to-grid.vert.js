module.exports = /* glsl */ `
precision highp float;

attribute vec2 uv2;
uniform sampler2D uParticlePosTex;
uniform sampler2D uParticleVelTex;

// uniform float size;
// uniform float numRows;
// uniform float slicesPerRow;

// // tex is a texture with each slice of the cube placed in grid in a texture.
// // texCoord is a 3d texture coord
// // size is the size if the cube in pixels.
// // slicesPerRow is how many slices there are across the texture
// // numRows is the number of rows of slices
// vec2 computeSliceOffset(float slice, float slicesPerRow, vec2 sliceSize) {
//   return sliceSize * vec2(mod(slice, slicesPerRow),
//                           floor(slice / slicesPerRow));
// }

// vec4 scan3DTextureValue (
//     sampler2D tex, vec3 texCoord, float size, float numRows, float slicesPerRow) {
//   float slice   = texCoord.z * size;
//   float sliceZ  = floor(slice);                         // slice we need
//   float zOffset = fract(slice);                         // dist between slices
//   vec2 sliceSize = vec2(1.0 / slicesPerRow,             // u space of 1 slice
//                         1.0 / numRows);                 // v space of 1 slice
//   vec2 slice0Offset = computeSliceOffset(sliceZ, slicesPerRow, sliceSize);
//   vec2 slice1Offset = computeSliceOffset(sliceZ + 1.0, slicesPerRow, sliceSize);
//   vec2 slicePixelSize = sliceSize / size;               // space of 1 pixel
//   vec2 sliceInnerSize = slicePixelSize * (size - 1.0);  // space of size pixels
//   vec2 uv = slicePixelSize * 0.5 + texCoord.xy * sliceInnerSize;
//   vec4 slice0Color = texture2D(tex, slice0Offset + uv);
//   vec4 slice1Color = texture2D(tex, slice1Offset + uv);
//   return mix(slice0Color, slice1Color, zOffset);
//   return slice0Color;
// }

// vec4 sampleAs3DTexture () {
//   vec4 texture3Doutput = scan3DTextureValue(uParticlePosTex, uv3, size, numRows, slicesPerRow);
//   // texture3Doutput.a *= 0.5;
//   return texture3Doutput;
// }

uniform vec3 uFieldSize;
uniform vec3 uFieldResSize;

uniform float uZOffset;
varying float vZIndex;
varying vec3 vPosition;
varying vec3 vVelocity;

void main (void) {
  vec3 particlePos = texture2D(uParticlePosTex, uv2).xyz;
  vec3 position = particlePos / uFieldSize * uFieldResSize;
  vPosition = position;

  vec3 particleVel = texture2D(uParticleVelTex, uv2).xyz;
  vec3 velocity = particleVel / uFieldSize * uFieldResSize;
  vVelocity = velocity;

  vec3 cellIndex = vec3(floor(position.xyz));
  vZIndex = cellIndex.z + uZOffset; //offset into the right layer

  vec2 textureCoordinates = vec2(
        vZIndex * (uFieldResSize.x + 1.0)
      + cellIndex.x + 0.5,
        cellIndex.y + 0.5
    )

    /

    vec2((uFieldResSize.x + 1.0) * (uFieldResSize.z + 1.0), uFieldResSize.y + 1.0
  );

  gl_Position = vec4(textureCoordinates * 2.0 - 1.0, 0.0, 1.0);

  gl_PointSize = 5.0;
}`;
