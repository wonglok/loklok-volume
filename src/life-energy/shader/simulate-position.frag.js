module.exports = /* glsl */ `
precision highp float;

varying vec2 vTexCoord0;
uniform sampler2D uTextureLast;
uniform sampler2D uTextureCurrent;

uniform float dT;
uniform float eT;

uniform vec3 mouseNow;
uniform vec3 mouseLast;
uniform vec2 resolution;

#define M_PI 3.1415926535897932384626433832795

float atan2(in float y, in float x) {
  bool xgty = (abs(x) > abs(y));
  return mix(M_PI / 2.0 - atan(x,y), atan(y,x), float(xgty));
}

vec3 fromBall(float r, float az, float el) {
  return vec3(
    r * cos(el) * cos(az),
    r * cos(el) * sin(az),
    r * sin(el)
  );
}
void toBall(vec3 pos, out float az, out float el) {
  az = atan2(pos.y, pos.x);
  el = atan2(pos.z, sqrt(pos.x * pos.x + pos.y * pos.y));
}

// float az = 0.0;
// float el = 0.0;
// vec3 noiser = vec3(lastVel);
// toBall(noiser, az, el);
// lastVel.xyz = fromBall(1.0, az, el);

vec3 ballify (vec3 pos, float r) {
  float az = atan2(pos.y, pos.x);
  float el = atan2(pos.z, sqrt(pos.x * pos.x + pos.y * pos.y));
  return vec3(
    r * cos(el) * cos(az),
    r * cos(el) * sin(az),
    r * sin(el)
  );
}

float rand(vec2 n) {
	return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float sdBox( vec3 p, vec3 b ) {
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

void collisionStaticSphere (inout vec4 particlePos, inout vec3 particleVel, vec3 colliderSpherePosition, float sphereRadius) {
  vec3 dif = (colliderSpherePosition) - particlePos.xyz;
  if( length( dif ) < sphereRadius ){
    particleVel -= normalize(dif) * dT * 1.0;
  }
}

void collisionMouseSphere (inout vec4 particlePos, inout vec3 particleVel, float sphereRadius) {
  vec3 dif = (mouseNow) - particlePos.xyz;

  if( (length( dif ) - sphereRadius) < 0.0 ){
    vec3 mouseForce = mouseNow - mouseLast;
    particleVel += mouseForce * dT * -5.0;
    particleVel += normalize(dif) * dT * -5.0;
  } else {
    // particleVel += normalize(dif) * dT * 5.0;
  }
}

void collisionStaticBox (inout vec4 particlePos, inout vec3 particleVel, vec3 colliderBoxPosition, vec3 boxSize) {
  vec3 p = (colliderBoxPosition) - particlePos.xyz;

  if(sdBox(p, boxSize) < 0.0){
    float EPSILON_A = 0.05;

    vec3 boxNormal = normalize(vec3(
      sdBox(vec3(p.x + EPSILON_A, p.y, p.z),  boxSize) - sdBox(vec3(p.x - EPSILON_A, p.y, p.z), boxSize),
      sdBox(vec3(p.x, p.y + EPSILON_A, p.z),  boxSize) - sdBox(vec3(p.x, p.y - EPSILON_A, p.z), boxSize),
      sdBox(vec3(p.x, p.y, p.z  + EPSILON_A), boxSize) - sdBox(vec3(p.x, p.y, p.z - EPSILON_A), boxSize)
    ));

    particleVel -= boxNormal * dT * 1.0;
  }
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
  for (int i = 0; i < 16; i++) {
    float fi = float(i);
    float time = eT * (fract(fi * 412.531 + 0.513) - 0.5) * 3.0;
    d = opSmoothUnion(
            sdSphere(p + sin(time + fi * vec3(52.5126, 64.62744, 632.25)) * vec3(2.0, 2.0, 0.8), mix(0.5, 1.0, fract(fi * 412.531 + 0.5124))),
      d,
      0.7
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

void collisionMetaBalls (inout vec4 particlePos, inout vec3 particleVel) {
  vec3 p = particlePos.xyz;

  p /= 1.5;

  // if(sdMetaBall(p) < 0.0){

  //   vec3 myNormal = calcNormal(p);

  //   particleVel += myNormal * dT * 1.0;
  // }

  if (sdMetaBall(p) < 0.0) {
    particleVel += calcNormal(p) * dT * 1.5 * -sdMetaBall(p);
  } else {
    particleVel -= calcNormal(p) * dT * 1.5 * sdMetaBall(p);
  }
}


void handleCollision (inout vec4 pos, inout vec3 vel) {
  collisionMetaBalls(
    pos,
    vel
  );

  collisionMouseSphere(
    pos,
    vel,
    1.5
  );
}


void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  // uv = vTexCoord0.xy;
  vec4 pos = texture2D(uTextureCurrent, uv);
  vec4 oPos = texture2D(uTextureLast, uv);

  float life = pos.w;

  vec3 vel = pos.xyz - oPos.xyz;

  life -= .01 * ( rand( uv ) + 0.1 );

  if( life > 1. ){
    vel = vec3( 0. );
    pos.xyz = vec3(
      -0.5 + rand(uv + 0.1),
      -0.5 + rand(uv + 0.2),
      -0.5 + rand(uv + 0.3)
    );

    pos.xyz *= 9.0;
    // pos.z -= 0.0;
    pos.xyz = ballify(pos.xyz, 1.0);
    // pos.z += 1.5;
    life = .99;
  }

  float bottomLimit = -7.0 + rand(uv + 0.1);

  if( life < 0. || pos.y <= bottomLimit ){
    vel = vec3( 0. );
    pos.xyz = vec3(
      -0.5 + rand(uv + 0.1),
      -0.5 + rand(uv + 0.2),
      -0.5 + rand(uv + 0.3)
    );
    pos.xyz *= 9.0;
    // pos.z -= 0.0;

    pos.xyz = ballify(pos.xyz, 1.0);
    // pos.z += 1.5;
    life = 1.1;
  }

  // gravity
  vel += vec3( 0.0 , -.003 , 0. );

  // wind
  // vel += vec3( 0.001 * life, 0.0, 0.0 );

  handleCollision(pos, vel);

  vel *= .96; // dampening

  vec3 p = pos.xyz + vel;
  gl_FragColor = vec4(p , life);

  // gl_FragColor = vec4(uv.xy, .0, 1.0);
}
`;
