module.exports = /* glsl */ `
precision highp float;

varying vec2 vTexCoord0;
uniform sampler2D uTextureLast;
uniform sampler2D uTextureCurrent;
uniform sampler2D uCurrentPositionTex;

uniform float dT;
uniform float eT;

uniform vec3 mouseNow;
uniform vec3 mouseLast;
uniform vec2 resolution;

${require("./texture2d3d.header")}
${require("./texture2d3d.frag")}

// vec3 data = scan3DTextureValueNearest(tex3dInput0, uv3, size, numRows, slicesPerRow).rgb;

// void handleCollision (inout vec4 pos, inout vec3 vel) {
//   // collisionMetaBalls(
//   //   pos,
//   //   vel
//   // );

//   // collisionMouseSphere(
//   //   pos,
//   //   vel,
//   //   1.5
//   // );

//   vec3 fieldData = scan3DTextureValueNearest(gridVelocity, (normalize(pos.xyz) * 0.5 + 0.5), size, numRows, slicesPerRow).rgb * 2.0 - 1.0;
//   vel.xyz += fieldData * dT;
// }

/*
uv to lookup tex and then look up using tex
*/

float sdBall( vec3 p, float sphereRadius ) {
  return (length( p ) - sphereRadius);
}

float sdScene ( vec3 p ) {
  return sdBall(p, 1.0);
}

vec3 calcNormal( in vec3 p ) {
    const float h = 1e-5; // or some other value
    const vec2 k = vec2(1,-1);
    return normalize( k.xyy * sdScene( p + k.xyy*h ) +
                      k.yyx * sdScene( p + k.yyx*h ) +
                      k.yxy * sdScene( p + k.yxy*h ) +
                      k.xxx * sdScene( p + k.xxx*h ) );
}



void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 uv3 = coord2dto3d(uv, size, numRows, slicesPerRow);

  vec3 currentPos = texture2D(uCurrentPositionTex, uv).rgb;

  // vec3 acceleration2 = scan3DTextureValueNearest(uTextureCurrent, normalize(currentPos), size, numRows, slicesPerRow).rgb;

  // vec3 uv3 = coord2dto3d(uv, size, numRows, slicesPerRow);
  // vec4 currentPos = texture2D(uCurrentPositionTex, uv);

  // vec3 stuff = scan3DTextureValueNearest(uTextureCurrent, normalize(currentPos.xyz) * 0.5 + 0.5, size, numRows, slicesPerRow).rgb;

  vec4 dataCurrent = texture2D(uTextureCurrent, uv);
  vec4 dataLast = texture2D(uTextureLast, uv);

  vec3 vel = dataCurrent.xyz;
  vec3 oVel = dataLast.xyz;
  float life = dataCurrent.w;
  vec3 influence = vel.xyz - oVel.xyz;

  // // influence += acceleration2;

  // if (sdBox(mouseNow, 1.0) < 0.0) {
  //   influence = normalize(currentPos.rgb);
  // }

  // vec3 influenceA = vec3(
  //   abs(sin(eT * 1.0 + uv.x + 0.1)),
  //   abs(sin(eT * 1.0 + uv.y + 0.2)),
  //   abs(sin(eT * 1.0 + uv.x + 0.3))
  // ) * 2.0 - 1.0;

  vec3 p = vel.xyz + influence;



  gl_FragColor = vec4(p, life);

  // gl_FragColor = vec4(calcNormal(uv3 + mouseNow), 1.0);
}
`;
