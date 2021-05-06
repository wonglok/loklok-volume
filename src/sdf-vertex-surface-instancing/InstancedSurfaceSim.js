import {
  BoxBufferGeometry,
  InstancedMesh,
  Mesh,
  Object3D,
  ShaderMaterial,
  SphereBufferGeometry,
  TextureLoader,
} from "three";

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

export class InstancedSurfaceSim {
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
        spheretex: { value: new TextureLoader().load("/matcap/golden.png") },
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
        varying vec3 vViewPosition;

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


        float sdSphere( vec3 p, float s )
        {
          return length(p)-s;
        }


        float sdPyramid( vec3 p, float h)
        {
          float m2 = h*h + 0.25;

          p.xz = abs(p.xz);
          p.xz = (p.z>p.x) ? p.zx : p.xz;
          p.xz -= 0.5;

          vec3 q = vec3( p.z, h*p.y - 0.5*p.x, h*p.x + 0.5*p.y);

          float s = max(-q.x,0.0);
          float t = clamp( (q.y-0.5*p.z)/(m2+0.25), 0.0, 1.0 );

          float a = m2*(q.x+s)*(q.x+s) + q.y*q.y;
          float b = m2*(q.x+0.5*t)*(q.x+0.5*t) + (q.y-m2*t)*(q.y-m2*t);

          float d2 = min(q.y,-q.x*m2-q.y*0.5) > 0.0 ? 0.0 : min(a,b);

          return sqrt( (d2+q.z*q.z)/m2 ) * sign(max(q.z,-p.y));
        }

        float sdTorus( vec3 p, vec2 t )
        {
          vec2 q = vec2(length(p.xz)-t.x,p.y);
          return length(q)-t.y;
        }

        float opExtrusion( in vec3 p, in float d, in float h )
        {
            vec2 w = vec2( d, abs(p.z) - h );
            return min(max(w.x,w.y),0.0) + length(max(w,0.0));
        }

        float opSmoothUnion( float d1, float d2, float k ) {
            float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
            return mix( d2, d1, h ) - k*h*(1.0-h); }

        float opSmoothSubtraction( float d1, float d2, float k ) {
            float h = clamp( 0.5 - 0.5*(d2+d1)/k, 0.0, 1.0 );
            return mix( d2, -d1, h ) + k*h*(1.0-h); }

        float opSmoothIntersection( float d1, float d2, float k ) {
            float h = clamp( 0.5 - 0.5*(d2-d1)/k, 0.0, 1.0 );
            return mix( d2, d1, h ) + k*h*(1.0-h); }

        float opRound (float d1, float rounder) {
          return d1 - rounder;
        }

        vec3 twistPos( in vec3 p, in float k )
        {
            float c = cos(k*p.y);
            float s = sin(k*p.y);
            mat2  m = mat2(c,-s,s,c);
            vec3  q = vec3(m*p.xz,p.y);
            return q;
        }


        vec3 opCheapBend( in vec3 p, in float k )
        {
            float c = cos(k*p.x);
            float s = sin(k*p.x);
            mat2  m = mat2(c,-s,s,c);
            vec3  q = vec3(m*p.xy,p.z);
            return (q);
        }

        float sdOctahedron( vec3 p, float s)
        {
          p = abs(p);
          return (p.x+p.y+p.z-s)*0.57735027;
        }

        float sdVerticalCapsule( vec3 p, float h, float r )
        {
          p.y -= clamp( p.y, 0.0, h );
          return length( p ) - r;
        }

        ${Ballify}

        mat4 rotation3d(vec3 axis, float angle) {
          axis = normalize(axis);
          float s = sin(angle);
          float c = cos(angle);
          float oc = 1.0 - c;

          return mat4(
            oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
            oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
            oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
            0.0,                                0.0,                                0.0,                                1.0
          );
        }

        float sdEllipsoid( vec3 p, vec3 r )
        {
          float k0 = length(p/r);
          float k1 = length(p/(r*r));
          return k0*(k0-1.0)/k1;
        }


        float doModel(vec3 p) {

          float d = 2.0;

          p  = twistPos(p, sin(time) * 3.14);

          vec4 rotXZP4 = rotation3d(vec3(1.0, 0.0, 0.0), time) * rotation3d(vec3(0.0, 0.0, 1.0), time) * vec4(p, 1.0);
          d = opSmoothUnion(
            sdTorus(rotXZP4.xyz, vec2(1.5, 0.5)),
              d,
              0.3
          );


          d = opSmoothUnion(
            sdOctahedron(p, 1.5),
              d,
              0.3
          );

          d = opRound(d, 0.1);

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
          const int Scans = 10;
          const float maxd = 20.0;           // max trace distance
          // const float precis = 0.001;        // precission of the intersection
          const float precis = 0.001;        // precission of the intersection
          float h = precis*2.0;
          float t = 0.0;
          float res = -1.0;
          for( int i=0; i<Scans; i++ )          // max number of raymarching iterations is 90
          {
              if(h < precis || t > maxd) break;
              h = doModel( ro + rd * t );
              t += h;
          }

          if( abs(t) <= maxd ) {
            res = t;
          }

          return res;
        }

        void main (void) {
          vec3 rayOrigin = position;
          vec3 rayDirection = normalize(-normal);

          float collision = calcIntersection(rayOrigin, rayDirection);

          vec3 pos = rayOrigin + rayDirection * collision;

          float useVertex = 1.0;
          // if (length(pos) >= length(position)) {
          //   useVertex = 0.0;
          //   pos = vec3(0.0);
          // }

          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(pos, useVertex);
          vNormal = -calcNormal(pos);
          vViewPosition = cameraPosition.xyz;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        uniform sampler2D spheretex;
        varying vec3 vViewPosition;

        void main (void) {
          vec3 viewDir = normalize( vViewPosition );
          vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
          vec3 y = cross( viewDir, x );
          vec2 uv = vec2( dot( x, vNormal ), dot( y, vNormal ) ) * 0.495 + 0.5; // 0.495 to remove artifacts caused by undersized matcap disks

          vec4 color = texture2D(spheretex, uv.xy);

          gl_FragColor = vec4(color.rgb, 1.0);
        }
      `,
    });

    let count = 4;

    let mesh = new InstancedMesh(rayGeo, shaderMaterial, count);
    mesh.scale.set(3, 3, 3);

    let obj = new Object3D();

    for (let i = 0; i < count; i++) {
      obj.matrix.identity();
      obj.position.x = ((i - count / 2) / count) * 40.0;
      obj.updateMatrixWorld();
      mesh.setMatrixAt(i, obj.matrixWorld);
    }

    scene.add(mesh);
    this.mini.onClean(() => {
      scene.remove(mesh);
    });

    camera.position.z = 20;
    this.mini.onLoop(() => {
      renderer.render(scene, camera);
    });

    return this;
  }
}
