precision highp float;
precision highp sampler2D;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
varying vec3 vOrigin;
varying vec3 vDirection;

uniform float eT;

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

// https://www.shadertoy.com/view/3sySRK
// from cine shader by edan kwan
float opSmoothUnion( float d1, float d2, float k ) {
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h);
}

float sdSphere( vec3 p, float s ) {
  return length(p)-s;
}

float sdMetaBall(vec3 p) {
  float d = 2.0;
  for (int i = 0; i < 15; i++) {
    float fi = float(i);
    float time = eT * (fract(fi * 412.531 + 0.513) - 0.5) * 3.0;
    d = opSmoothUnion(
        sdSphere(p + sin(time + fi * vec3(52.5126, 64.62744, 632.25)) * vec3(2.0, 2.0, 0.8), mix(0.1, 1.0, fract(fi * 412.531 + 0.5124))),
      d,
      0.3
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

float sample1( vec3 p ) {
  return sdMetaBall(p);
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
  vec3 pos = vec3(0.);

  float tt = bounds.x;
  for (int i = 0; i < STEPS; i++) {
    if (tt < bounds.y) {
      pos = p;
      pos *= 5.0;

      float d = sample1(pos);

      if (d < 0.0) {
        color.rgb = calcNormal(pos) * 0.5 + 0.5;
        color.a = 1.0 - d;
        break;
      }
      p += rayDir * delta;

      tt += delta;
    }
  }

  if ( color.a == 0.0 ) discard;
  gl_FragColor = color;
}