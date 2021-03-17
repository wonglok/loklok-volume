// https://github1s.com/dli/fluid/blob/master/shaders/common.frag

// vec3 get3DFragCoord (vec3 resolution) {
//     return vec3(
//         mod(gl_FragCoord.x, resolution.x),
//         gl_FragCoord.y,
//         floor(gl_FragCoord.x / resolution.x) + 0.5);
// }

// vec4 texture3D(sampler2D texture, vec3 coordinates, vec3 resolution) {
//     vec3 fullCoordinates = coordinates * resolution; //in [(0, 0, 0), (resolution.x, resolution.y, resolutionz)]

//     fullCoordinates = clamp(fullCoordinates, vec3(0.5), vec3(resolution - 0.5));

//     //belowZIndex and aboveZIndex don't have the 0.5 offset
//     float belowZIndex = floor(fullCoordinates.z - 0.5);
//     float aboveZIndex = belowZIndex + 1.0;

//     //we interpolate the z
//     float fraction = fract(fullCoordinates.z - 0.5);

//     vec2 belowCoordinates = vec2(
//         belowZIndex * resolution.x + fullCoordinates.x,
//         fullCoordinates.y) / vec2(resolution.x * resolution.z, resolution.y);

//     vec2 aboveCoordinates = vec2(
//         aboveZIndex * resolution.x + fullCoordinates.x,
//         fullCoordinates.y) / vec2(resolution.x * resolution.z, resolution.y);

//     return mix(texture2D(texture, belowCoordinates), texture2D(texture, aboveCoordinates), fraction);
// }

// vec4 texture3DNearest(sampler2D texture, vec3 coordinates, vec3 resolution) { //clamps the z coordinate
//     vec3 fullCoordinates = coordinates * resolution; //in [(0, 0, 0), (resolution.x, resolution.y, resolutionz)]

//     fullCoordinates = clamp(fullCoordinates, vec3(0.5), vec3(resolution - 0.5));

//     float zIndex = floor(fullCoordinates.z);

//     vec2 textureCoordinates = vec2(
//         zIndex * resolution.x + fullCoordinates.x,
//         fullCoordinates.y) / vec2(resolution.x * resolution.z, resolution.y);

//     return texture2D(texture, textureCoordinates);
// }

/*
vec4 texture3D(sampler2D tex, vec3 texCoord, vec3 resolution) {
    float size = resolution.z;
   float sliceSize = 1.0 / size;                         // space of 1 slice
   float slicePixelSize = sliceSize / size;              // space of 1 pixel
   float sliceInnerSize = slicePixelSize * (size - 1.0); // space of size pixels
   float zSlice0 = min(floor(texCoord.z * size), size - 1.0);
   float zSlice1 = min(zSlice0 + 1.0, size - 1.0);
   float xOffset = slicePixelSize * 0.5 + texCoord.x * sliceInnerSize;
   float s0 = xOffset + (zSlice0 * sliceSize);
   float s1 = xOffset + (zSlice1 * sliceSize);
   vec4 slice0Color = texture2D(tex, vec2(s0, texCoord.y));
   vec4 slice1Color = texture2D(tex, vec2(s1, texCoord.y));
   float zOffset = mod(texCoord.z * size, 1.0);
   return mix(slice0Color, slice1Color, zOffset);
}


// // tex is a texture with each slice of the cube placed in grid in a texture.
// // texCoord is a 3d texture coord
// // size is the size if the cube in pixels.
// // slicesPerRow is how many slices there are across the texture
// // numRows is the number of rows of slices
// vec2 computeSliceOffset(float slice, float slicesPerRow, vec2 sliceSize) {
//   return sliceSize * vec2(mod(slice, slicesPerRow),
//                           floor(slice / slicesPerRow));
// }

// //  vec3 uv3 = texture2D(tex3dIndex, vUv2).rgb;
// //  vec3 lookupPos = scan3DTextureValue(tex3dInput0, uv3, size, numRows, slicesPerRow).rgb;
// vec4 scan3DTextureValue (sampler2D tex, vec3 texCoord, float size, float numRows, float slicesPerRow) {
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

vec3 data = scan3DTextureValueNearest(tex3dInput0, uv3, size, numRows, slicesPerRow).rgb;
vec4 scan3DTextureValueNearest (sampler2D tex, vec3 texCoord, float size, float numRows, float slicesPerRow) {

    // --------
    // float pageY = (ceil((texCoord.y) * (size)) / (size));
    // float pageX = (ceil((texCoord.x) * (size)) / (size));
    // float pageZ = (ceil((texCoord.z) * (size)) / (size));

    // vec2 nearUV =  (vec2(
    //     pageX / (size) + (pageZ),
    //     pageY
    // ));

    // vec4 data = texture2D(tex, nearUV);
    // return data;

    // --------

    // --------

    // --------
}

// // --------
// // texCoord = ceil((texCoord) * vec3(size * 1.0)) / vec3(size * 1.0);

// float pixel2DWidth = slicesPerRow * size;
// float pixel2DHeight = numRows * size;

// float pageY = ceil(texCoord.y * size);
// float pageX = ceil(texCoord.x * size);
// float pageZ = ceil(texCoord.z * size);

// vec2 nearUV = (vec2(pageX + size * pageZ, pageY)) / vec2(pixel2DWidth, pixel2DHeight);

*/

module.exports = /* glsl */ `
// precision highp float;
//
// vec3 data = scan3DTextureValueNearest(tex3dInput0, uv3, size, numRows, slicesPerRow).rgb;

// convert to color
vec3 coord2dto3d (vec2 coord2d, float size, float numRows, float slicesPerRow) {
    float pixel2DWidth = slicesPerRow * size;
    float pixel2DHeight = numRows * size;

    vec2 pixelCoord = coord2d * vec2(pixel2DWidth, pixel2DHeight);

    float pageX = ceil(mod(pixelCoord.x, size)) / size;
    float pageZ = ceil(pixelCoord.x) / size * size / size;
    float pageY = ceil(pixelCoord.y) / size;

    return vec3(pageX, pageY, pageZ);
}


// convert to 2d
vec2 coord3dto2d (vec3 coord3d, float size, float numRows, float slicesPerRow) {
    float pixel2DWidth = slicesPerRow * size;
    float pixel2DHeight = numRows * size;

    float pageY = ceil(coord3d.y * size);
    float pageX = ceil(coord3d.x * size);
    float pageZ = ceil(coord3d.z * size);

    vec2 nearUV = (vec2(pageX + size * pageZ, pageY)) / vec2(pixel2DWidth, pixel2DHeight);
    return nearUV;
}

// scan texture
vec4 scan3DTextureValueNearest (sampler2D tex, vec3 texCoord, float size, float numRows, float slicesPerRow) {
    vec2 nearUV = coord3dto2d(texCoord, size, numRows, slicesPerRow);
    return texture2D(tex, nearUV);
}

// scan texture
vec4 scan2DTextureValueNearest (sampler2D tex, vec2 uv) {
    return texture2D(tex, uv);
}

`;
