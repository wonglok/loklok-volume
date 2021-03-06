precision highp float;
precision highp sampler2D;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
varying vec3 vOrigin;
varying vec3 vDirection;


uniform float threshold;
uniform float steps;

#define STEPS 100

vec2 hitBox( vec3 orig, vec3 dir ) {
  const vec3 box_min = vec3( - 0.5 );
  const vec3 box_max = vec3( 0.5 );
  vec3 inv_dir = 1.0 / dir;
  vec3 tmin_tmp = ( box_min - orig ) * inv_dir;
  vec3 tmax_tmp = ( box_max - orig ) * inv_dir;
  vec3 tmin = min( tmin_tmp, tmax_tmp );
  vec3 tmax = max( tmin_tmp, tmax_tmp );
  float t0 = max( tmin.x, max( tmin.y, tmin.z ) );
  float t1 = min( tmax.x, min( tmax.y, tmax.z ) );
  return vec2( t0, t1 );
}

uniform sampler2D tex3D;
uniform float sliceSize;
uniform float numRows;
uniform float slicesPerRow;

// tex is a texture with each slice of the cube placed in grid in a texture.
// texCoord is a 3d texture coord
// size is the size if the cube in pixels.
// slicesPerRow is how many slices there are across the texture
// numRows is the number of rows of slices
vec2 computeSliceOffset(float slice, float slicesPerRow, vec2 sliceSize) {
  return sliceSize * vec2(mod(slice, slicesPerRow),
                          floor(slice / slicesPerRow));
}

vec4 scan3DTextureValue (
    sampler2D tex, vec3 texCoord, float size, float numRows, float slicesPerRow) {
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

float sample1( vec3 p ) {
  vec4 texture3Doutput = scan3DTextureValue(tex3D, p, sliceSize, numRows, slicesPerRow);
  return texture3Doutput.a;
}

#define epsilon .0001
vec3 getNormal( vec3 coord ) {
  if ( coord.x < epsilon ) return vec3( 1.0, 0.0, 0.0 );
  if ( coord.y < epsilon ) return vec3( 0.0, 1.0, 0.0 );
  if ( coord.z < epsilon ) return vec3( 0.0, 0.0, 1.0 );
  if ( coord.x > 1.0 - epsilon ) return vec3( - 1.0, 0.0, 0.0 );
  if ( coord.y > 1.0 - epsilon ) return vec3( 0.0, - 1.0, 0.0 );
  if ( coord.z > 1.0 - epsilon ) return vec3( 0.0, 0.0, - 1.0 );
  float step = 0.01;
  float x = sample1( coord + vec3( - step, 0.0, 0.0 ) ) - sample1( coord + vec3( step, 0.0, 0.0 ) );
  float y = sample1( coord + vec3( 0.0, - step, 0.0 ) ) - sample1( coord + vec3( 0.0, step, 0.0 ) );
  float z = sample1( coord + vec3( 0.0, 0.0, - step ) ) - sample1( coord + vec3( 0.0, 0.0, step ) );
  return normalize( vec3( x, y, z ) );
}

void main () {
  vec3 rayDir = normalize( vDirection );
  vec2 bounds = hitBox( vOrigin, rayDir );
  if (bounds.x > bounds.y) discard;

  bounds.x = max( bounds.x, 0.0 );

  vec3 p = vOrigin + bounds.x * rayDir;
  vec3 inc = 1.0 / abs( rayDir );
  float delta = min( inc.x, min( inc.y, inc.z ) );
  delta /= steps;

  vec4 color = vec4(0.0);

  vec3 pos;

  float tt = bounds.x;
  for (int i = 0; i < STEPS; i++) {
    if (tt < bounds.y) {
      pos = p;
      pos *= 5.0;

      // float d = sample1(pos);

      // if (d < 0.0) {
      //   color.rgb = calcNormal(pos) * 0.5 + 0.5;
      //   color.a = 1.0 - d;
      //   break;
      // }

      vec4 scanResult = scan3DTextureValue(tex3D, p + 0.5, sliceSize, numRows, slicesPerRow);
      float d = scanResult.a;
      if ( d > threshold ) {
        color.rgba = scanResult.rgba;
        break;
      }

      p += rayDir * delta;

      tt += delta;
    }
  }

  // for (int i = 0; i < STEPS; i++) {
  //   vec4 scanResult = scan3DTextureValue(tex3D, p + 0.5, sliceSize, numRows, slicesPerRow);
  //   float d = scanResult.a;
  //   if ( d > threshold ) {
  //     color.rgba = scanResult.rgba;
  //     break;
  //   }
  //   p += rayDir * delta;
  // }

  if ( color.a == 0.0 ) discard;

  gl_FragColor = color;
}