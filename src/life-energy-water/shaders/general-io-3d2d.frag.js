module.exports = /* glsl */ `
precision highp float;

varying highp vec2 vUv2;
varying highp vec3 vUv3;

uniform highp sampler2D tex3dIndex;

uniform highp sampler2D tex3dInput0;
uniform highp sampler2D tex3dInput1;
uniform highp sampler2D tex3dInput2;

uniform float size;
uniform float numRows;
uniform float slicesPerRow;
uniform vec3 gridRes3;
uniform vec2 tex3dRes2;

uniform float code;

uniform float dT;
uniform float eT;

// tex is a texture with each slice of the cube placed in grid in a texture.
// texCoord is a 3d texture coord
// size is the size if the cube in pixels.
// slicesPerRow is how many slices there are across the texture
// numRows is the number of rows of slices
vec2 computeSliceOffset(float slice, float slicesPerRow, vec2 sliceSize) {
  return sliceSize * vec2(mod(slice, slicesPerRow),
                          floor(slice / slicesPerRow));
}

//  vec3 uv3 = texture2D(tex3dIndex, vUv2).rgb;
//  vec3 lookupPos = scan3DTextureValue(tex3dInput0, uv3, size, numRows, slicesPerRow).rgb;
vec4 scan3DTextureValue (sampler2D tex, vec3 texCoord, float size, float numRows, float slicesPerRow) {
  float slice   = texCoord.z * size;
  float sliceZ  = floor(slice);                         // slice we need
  float zOffset = fract(slice);                         // dist between slices
  vec2 sliceSize = vec2(1.0 / slicesPerRow,             // u space of 1 slice
                        1.0 / numRows);                 // v space of 1 slice
  vec2 slice0Offset = computeSliceOffset(sliceZ, slicesPerRow, sliceSize);
  vec2 slice1Offset = computeSliceOffset(sliceZ + 1.0, slicesPerRow, sliceSize);
  vec2 slicePixelSize = sliceSize / size;               // space of 1 pixel
  vec2 sliceInnerSize = slicePixelSize * (size - 1.0);  // space of size pixels
  vec2 uv = slicePixelSize * 0.5 + texCoord.xy * sliceInnerSize;
  vec4 slice0Color = texture2D(tex, slice0Offset + uv);
  vec4 slice1Color = texture2D(tex, slice1Offset + uv);
  return mix(slice0Color, slice1Color, zOffset);
  return slice0Color;
}


// -------
void copy (void) {
  vec3 data0 = texture2D(tex3dInput0, vUv2).rgb;
  gl_FragColor = vec4(data0, 1.0);
}

void makeIndexTexture (void) {
  vec3 data0 = texture2D(tex3dIndex, vUv2).rgb;
  gl_FragColor = vec4(data0, 1.0);
}

void detectMarker (void) {
  vec3 uv3 = texture2D(tex3dIndex, vUv2).rgb;
  vec3 data0 = scan3DTextureValue(tex3dInput0, uv3, size, numRows, slicesPerRow).rgb;

}
void addPosWithVel (void) {
  vec3 uv3 = texture2D(tex3dIndex, vUv2).rgb;
  vec3 position = scan3DTextureValue(tex3dInput0, uv3, size, numRows, slicesPerRow).rgb;
  vec3 velocity = scan3DTextureValue(tex3dInput1, uv3, size, numRows, slicesPerRow).rgb;

  vec3 newPos = position + velocity;
  gl_FragColor = vec4(vec3(newPos), 1.0);
}

void makeVelocity (void) {
  vec3 data0 = texture2D(tex3dInput0, vUv2).rgb;
  vec3 gravity = vec3(0.0, dT * -1.0, 0.0);
  gl_FragColor = vec4(gravity, 1.0);
}

void readBy3DCoord (void) {
  vec3 uv3 = texture2D(tex3dIndex, vUv2).rgb;
  vec3 outputValue = scan3DTextureValue(tex3dInput0, uv3, size, numRows, slicesPerRow).rgb;
  gl_FragColor = vec4(outputValue, 1.0);
}

void main (void) {
  if (code == 0.0) {
    copy();
  } else if (code == 1.0) {
    makeIndexTexture();
  } else if (code == 2.0) {
    detectMarker();
  } else if (code == 3.0) {
    makeVelocity();
  } else if (code == 4.0) {
    readBy3DCoord();
  } else if (code == 5.0) {
    addPosWithVel();
  }
}


`;
