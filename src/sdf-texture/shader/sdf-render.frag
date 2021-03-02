precision highp float;
varying vec2 vUv;
uniform vec3 cameraPosition;
uniform float eT;

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

// https://www.shadertoy.com/view/3sySRK
// from cine shader by edan kwan
float opSmoothUnion( float d1, float d2, float k ) {
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h);
}

float sdSphere( vec3 p, float s ) {
  return length(p)-s;
}


float sdMetaBall (vec3 p) {
  float d = 2.0;

  for (int i = 0; i < 15; i++) {
    float fi = float(i);
    float time = eT * (fract(fi * 412.531 + 0.513) - 0.5) * 3.0;
    d = opSmoothUnion(
      sdSphere(p + sin(time + fi * vec3(52.5126, 64.62744, 632.25)) * vec3(2.0, 2.0, 0.8), mix(0.1, 0.99, fract(fi * 412.531 + 0.5124))),
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


void main (void) {
  vec3 p = vec3(vUv.xy * 2.0 - 1.0, cameraPosition.z);
  p = p * 2.0;

  float dist = sdMetaBall(p);

  if (dist < 0.0) {
    gl_FragColor = vec4(calcNormal(p), 1.0);
  } else {
    gl_FragColor = vec4(0.0);
    discard;
  }
}
