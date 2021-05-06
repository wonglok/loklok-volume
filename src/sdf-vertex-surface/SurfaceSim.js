import { Mesh, ShaderMaterial, SphereBufferGeometry } from "three";

if (module.hot) {
  module.hot.dispose(() => {
    window.location.reload();
  });
}

export const Ballify = /* glsl */ `
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
`;
var glsl = require("glslify");
console.log(glsl);

export class SurfaceSim {
  constructor({ ...mini }, name = "EnergySimulator") {
    this.mini = {
      ...mini,
    };

    this.mini.set(name, this);
    this.promise = this.setup();
  }
  async setup() {
    let camera = await this.mini.ready.camera;
    let renderer = await this.mini.ready.renderer;
    let scene = await this.mini.ready.scene;

    let rayGeo = new SphereBufferGeometry(10, 320, 320);

    let shaderMaterial = new ShaderMaterial({
      transparent: true,
      uniforms: {
        time: {
          get value() {
            return window.performance.now() / 1000;
          },
        },
      },
      vertexShader: /* glsl */ `

        #include <common>
        uniform float time;
        varying vec3 vNormal;

        // Originally sourced from https://www.shadertoy.com/view/ldfSWs
        // Thank you Iñigo :)

        vec3 doBackground( void )
        {
            return vec3( 0.0, 0.0, 0.0);
        }

        float sdBox( vec3 p, vec3 b )
        {
          vec3 q = abs(p) - b;
          return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
        }
        float sdTriPrism( vec3 p, vec2 h )
        {
          vec3 q = abs(p);
          return max(q.z-h.y,max(q.x*0.866025+p.y*0.5,-p.y)-h.x*0.5);
        }

        float sdVerticalCapsule( vec3 p, float h, float r )
        {
          p.y -= clamp( p.y, 0.0, h );
          return length( p ) - r;
        }

        float opSmoothUnion( float d1, float d2, float k )
        {
            float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
            return mix( d2, d1, h ) - k*h*(1.0-h);
        }

        float sdSphere( vec3 p, float s )
        {
          return length(p)-s;
        }

        float doModel(vec3 p) {
          float d = 2.0;
          for (int i = 0; i < 15; i++)
          {
            float fi = float(i);
            float timer = time * (fract(fi * 412.531 + 0.513) - 0.5) * 2.0;
            d = opSmoothUnion(
                    sdSphere(p + sin(timer + fi * vec3(52.5126, 64.62744, 632.25)) * vec3(2.0, 2.0, 0.8), mix(0.5, 1.0, fract(fi * 412.531 + 0.5124))),
              d,
              0.4
            );
          }
          return d;
        }

        vec3 opRep( vec3 p, vec3 c )
        {
            return mod(p,c) - 0.5 * c;
        }


        vec3 calcNormal( in vec3 pos )
        {
            const float eps = 0.002;             // precision of the normal computation

            const vec3 v1 = vec3( 1.0,-1.0,-1.0);
            const vec3 v2 = vec3(-1.0,-1.0, 1.0);
            const vec3 v3 = vec3(-1.0, 1.0,-1.0);
            const vec3 v4 = vec3( 1.0, 1.0, 1.0);

          return normalize( v1*doModel( pos + v1*eps ) +
                    v2*doModel( pos + v2*eps ) +
                    v3*doModel( pos + v3*eps ) +
                    v4*doModel( pos + v4*eps ) );
        }


        float calcIntersection( in vec3 ro, in vec3 rd )
        {
          const float maxd = 10.0;           // max trace distance
          const float precis = 0.001;        // precission of the intersection
          float h = precis*2.0;
          float t = 0.0;
          float res = -1.0;
          const int steps = 50;

          for( int i=0; i<steps; i++ )          // max number of raymarching iterations is 90
          {
              if( h<precis||t>maxd ) break;
              h = doModel( ro+rd*t );
              t += h;
          }

          if( t < maxd ) res = t;
          return res;
        }

        void main (void) {
          vec3 rayOrigin = position;
          vec3 rayDirection = -normal;
          float collision = calcIntersection(rayOrigin, rayDirection);

          vec3 pos = rayOrigin + rayDirection * collision;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          vNormal = calcNormal(pos);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main (void) {
          gl_FragColor = vec4(vec3(vNormal) + 0.3, 0.5);
        }
      `,
    });

    let mesh = new Mesh(rayGeo, shaderMaterial);

    scene.add(mesh);
    this.mini.onClean(() => {
      scene.remove(mesh);
    });

    camera.position.z = 10;
    this.mini.onLoop(() => {
      renderer.render(scene, camera);
    });

    return this;
  }
}
