precision highp float;

uniform vec2 resolution;

uniform mat4 viewMatrix;
uniform vec3 cameraPosition;

uniform mat4 cameraWorldMatrix;
uniform mat4 cameraProjectionMatrixInverse;

uniform sampler2D matcap;
uniform vec4 poseData[33];

const float EPS = 0.01;
const float OFFSET = EPS * 100.0;
const vec3 lightDir = vec3( -0.48666426339228763, 0.8111071056538127, -0.3244428422615251 );

// // distance functions
// vec3 opRep( vec3 p, float interval ) {

//   vec2 q = mod( p.xz, interval ) - interval * 0.5;
//   return vec3( q.x, p.y, q.y );

// }

// float sphereDist( vec3 p, float r ) {

//   return length( opRep( p, 3.0 ) ) - r;

// }

// float floorDist( vec3 p ){

//   return dot(p, vec3( 0.0, 1.0, 0.0 ) ) + 1.0;

// }

// vec4 minVec4( vec4 a, vec4 b ) {

//   return ( a.a < b.a ) ? a : b;

// }

// float checkeredPattern( vec3 p ) {

//   float u = 1.0 - floor( mod( p.x, 2.0 ) );
//   float v = 1.0 - floor( mod( p.z, 2.0 ) );

//   if ( ( u == 1.0 && v < 1.0 ) || ( u < 1.0 && v == 1.0 ) ) {

//     return 0.2;

//   } else {

//     return 1.0;

//   }

// }

vec3 hsv2rgb( vec3 c ) {

  vec4 K = vec4( 1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0 );
  vec3 p = abs( fract( c.xxx + K.xyz ) * 6.0 - K.www );
  return c.z * mix( K.xxx, clamp( p - K.xxx, 0.0, 1.0 ), c.y );

}

// https://www.shadertoy.com/view/3sySRK
// from cine shader by edan kwan
float opSmoothUnion( float d1, float d2, float k ) {
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h);
}

float sdSphere( vec3 p, float s ) {
  return length(p)-s;
}

mat4 rotationX( in float angle ) {
	return mat4(	1.0,		0,			0,			0,
			 	  0, 	cos(angle),	-sin(angle),		0,
					0, 	sin(angle),	 cos(angle),		0,
					0, 			0,			  0, 		1);
}

mat4 rotationY( in float angle ) {
	return mat4(	cos(angle),		0,		sin(angle),	0,
			 				0,		1.0,			 0,	0,
					-sin(angle),	0,		cos(angle),	0,
							0, 		0,				0,	1);
}

mat4 rotationZ( in float angle ) {
	return mat4(	cos(angle),		-sin(angle),	0,	0,
			 		sin(angle),		cos(angle),		0,	0,
							0,				0,		1,	0,
							0,				0,		0,	1);
}


float sdMetaBall (vec3 p) {
  float d = 2.0;

  for (int i = 0; i < 33; i++) {
    vec4 pos = poseData[i];
    d = opSmoothUnion(
      sdSphere(p + pos.xyz, 0.065),
      d,
      0.15
    );
  }

  return d;
}

vec3 calcNormal( in vec3 p ) {
    const float h = 1e-5; // or some other value
    const vec2 k = vec2(1,-1);
    return normalize( k.xyy * sdMetaBall( p + k.xyy*h ) +
                      k.yyx * sdMetaBall( p + k.yyx*h ) +
                      k.yxy * sdMetaBall( p + k.yxy*h ) +
                      k.xxx * sdMetaBall( p + k.xxx*h ) );
}

float sceneDist( vec3 p ) {
  return sdMetaBall(p);
}

vec3 getNormal( vec3 p ) {
  return calcNormal(p);
  // return normalize(vec3(
  //   sceneDist(p + vec3( EPS, 0.0, 0.0 ) ) - sceneDist(p + vec3( -EPS, 0.0, 0.0 ) ),
  //   sceneDist(p + vec3( 0.0, EPS, 0.0 ) ) - sceneDist(p + vec3( 0.0, -EPS, 0.0 ) ),
  //   sceneDist(p + vec3( 0.0, 0.0, EPS ) ) - sceneDist(p + vec3( 0.0, 0.0, -EPS ) )
  // ));
}

// vec4 sceneColor( vec3 p ) {
//   return minVec4(
//     // 3 * 6 / 2 = 9
//     vec4( hsv2rgb(vec3( ( p.z + p.x ) / 9.0, 1.0, 1.0 ) ), sphereDist( p, 1.0 ) ),
//     vec4( vec3( 0.5 ) * checkeredPattern( p ), floorDist( p ) )
//   );
// }

// float getShadow( vec3 ro, vec3 rd ) {
//   float h = 0.0;
//   float c = 0.0;
//   float r = 1.0;
//   float shadowCoef = 0.5;
//   for ( float t = 0.0; t < 5.0; t++ ) {
//     h = sceneDist( ro + rd * c );
//     if ( h < EPS ) return shadowCoef;
//     r = min( r, h * 16.0 / c );
//     c += h;
//   }
//   return 1.0 - shadowCoef + r * shadowCoef;
// }

vec3 getRayColor( vec3 origin, vec3 ray, out vec3 pos, out vec3 normal, out bool hit ) {
  // marching loop
  float dist;
  float depth = 0.0;
  pos = origin;

  for ( int i = 0; i < 18; i++ ){
    dist = sceneDist( pos );
    depth += dist;
    pos = origin + depth * ray;

    if ( abs(dist) < EPS ) break;
  }

  // hit check and calc color
  vec3 color;

  if (abs(dist) < EPS) {
    normal = getNormal(pos);
    color = texture2D(matcap, normal.xy * 0.5 + 0.5).rgb;

    // float diffuse = clamp( dot( lightDir, normal ), 0.1, 1.0 );
    // float specular = pow( clamp( dot( reflect( lightDir, normal ), ray ), 0.0, 1.0 ), 10.0 );
    // float shadow = getShadow( pos + normal * OFFSET, lightDir );
    // color = ( sceneColor( pos ).rgb * diffuse + vec3( 0.8 ) * specular );// * max( 0.5, shadow );

    hit = true;

  } else {

    color = vec3( 0.0 );

  }

  return color;// - pow( clamp( 0.05 * depth, 0.0, 0.6 ), 2.0 );

}

void main(void) {

  // screen position
  vec2 screenPos = ( gl_FragCoord.xy * 2.0 - resolution ) / resolution;

  // ray direction in normalized device coordinate
  vec4 ndcRay = vec4( screenPos.xy, 1.0, 1.0 );

  // convert ray direction from normalized device coordinate to world coordinate
  vec3 ray = ( cameraWorldMatrix * cameraProjectionMatrixInverse * ndcRay ).xyz;
  ray = normalize( ray );

  // camera position
  vec3 cPos = cameraPosition;

  // cast ray
  vec3 color = vec3( 0.0 );
  vec3 pos, normal;
  bool hit;
  float alpha = 1.0;

  for ( int i = 0; i < 2; i++ ) {
    color += alpha * getRayColor( cPos, ray, pos, normal, hit );
    alpha *= 0.3;
    ray = normalize( reflect( ray, normal ) );
    cPos = pos + normal * OFFSET;
    if ( !hit ) break;
  }

  gl_FragColor = vec4( color, length(color) );

}