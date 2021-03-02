import { Object3D } from "three";
import { ShaderMaterial } from "three";
import { MeshBasicMaterial } from "three";
import { BackSide } from "three";
import { PerspectiveCamera } from "three";
import { FrontSide } from "three";
import { Mesh } from "three";
import { Scene } from "three";
import { WebGLRenderTarget } from "three";
import { BoxBufferGeometry } from "three";
import { PlaneBufferGeometry } from "three";

export class VolumeVisualiser {
  constructor(
    { onLoop, onResize, getRect, onClean, ...mini },
    name = "VolumeVisualiser"
  ) {
    this.mini = {
      onLoop,
      onResize,
      getRect,
      onClean,
      ...mini,
    };

    this.mini.set(name, this);

    // this.setupVisual();
    this.setupDrawable();
  }

  async setupVisual() {
    // const sdf = await this.mini.get("SDFTexture");
    // console.log(sdf.renderTarget.texture);
    // let reader = /* glsl */ `
    //
    // `;
  }

  async setupDrawable() {
    let renderer = await this.mini.get("renderer");
    let scene = await this.mini.get("scene");
    let camera = await this.mini.get("camera");
    let SDFTexture = await this.mini.get("SDFTexture");

    this.drawable = new Object3D();
    scene.add(this.drawable);

    this.pass1 = {
      vs: `

varying vec3 worldSpaceCoords;

void main()
{
  //Set the world space coordinates of the back faces vertices as output.
  worldSpaceCoords = position + vec3(0.5, 0.5, 0.5); //move it from [-0.5;0.5] to [0,1]
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,

      fs: `
precision highp float;
varying vec3 worldSpaceCoords;

void main()
{
  //The fragment's world space coordinates as fragment output.
  gl_FragColor = vec4( worldSpaceCoords.x , worldSpaceCoords.y, worldSpaceCoords.z, 1.0 );
}
//Leandro R Barbagallo - 2015 - lebarba at gmail.com

`,
      uniforms: {
        time: { value: 0 },
      },
    };

    this.rtTexture = new WebGLRenderTarget(1024, 1024);

    this.rtTexture2 = new WebGLRenderTarget(1024, 1024);

    this.pass2 = {
      vs: `
varying vec3 vWorldSpaceCoords;
varying vec4 vProjectedCoords;

void main () {
vWorldSpaceCoords = (modelMatrix * vec4(position + vec3(0.5, 0.5,0.5), 1.0 )).xyz;
gl_Position = projectionMatrix *  modelViewMatrix * vec4( position, 1.0 );
vProjectedCoords =  projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
    `,
      fs: /* glsl */ `
precision highp float;

varying vec3 vWorldSpaceCoords;
varying vec4 vProjectedCoords;
uniform sampler2D tex; //, cubeTex, transferTex;
uniform float steps;
uniform float alphaCorrection;
const int MAX_STEPS = 128;

//  Simplex 3D Noise
//  by Ian McEwan, Ashima Arts
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){
const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
vec3 i  = floor(v + dot(v, C.yyy) );
vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
vec3 g = step(x0.yzx, x0.xyz);
vec3 l = 1.0 - g;
vec3 i1 = min( g.xyz, l.zxy );
vec3 i2 = max( g.xyz, l.zxy );

//  x0 = x0 - 0. + 0.0 * C
vec3 x1 = x0 - i1 + 1.0 * C.xxx;
vec3 x2 = x0 - i2 + 2.0 * C.xxx;
vec3 x3 = x0 - 1. + 3.0 * C.xxx;

// Permutations
i = mod(i, 289.0 );
vec4 p = permute( permute( permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients
// ( N*N points uniformly over a square, mapped onto an octahedron.)
float n_ = 1.0/7.0; // N=7
vec3  ns = n_ * D.wyz - D.xzx;

vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

vec4 x_ = floor(j * ns.z);
vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

vec4 x = x_ *ns.x + ns.yyyy;
vec4 y = y_ *ns.x + ns.yyyy;
vec4 h = 1.0 - abs(x) - abs(y);

vec4 b0 = vec4( x.xy, y.xy );
vec4 b1 = vec4( x.zw, y.zw );

vec4 s0 = floor(b0)*2.0 + 1.0;
vec4 s1 = floor(b1)*2.0 + 1.0;
vec4 sh = -step(h, vec4(0.0));

vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

vec3 p0 = vec3(a0.xy,h.x);
vec3 p1 = vec3(a0.zw,h.y);
vec3 p2 = vec3(a1.xy,h.z);
vec3 p3 = vec3(a1.zw,h.w);

// Normalise gradients
vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
p0 *= norm.x;
p1 *= norm.y;
p2 *= norm.z;
p3 *= norm.w;

// Mix final noise value
vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
m = m * m;
return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                              dot(p2,x2), dot(p3,x3) ) );
}

uniform float time;

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

vec4 sampleAs3DTexture (vec3 pos) {
  vec4 texture3Doutput = scan3DTextureValue(tex3D, pos, sliceSize, numRows, slicesPerRow);
  // texture3Doutput.a *= 0.5;
  return texture3Doutput;
}

// vec4 sampleAs3DTexture (vec3 pos) {
//   float scale = 1.5;
//   vec4 r4 = vec4(
//     1.0 - abs(snoise(scale * pos + time * 0.25 + pos.x * 0.25)),
//     1.0 - abs(snoise(scale * pos + time * 0.25 + pos.y * 0.25)),
//     1.0 - abs(snoise(scale * pos + time * 0.25 + pos.z * 0.25)),
//     0.5
//   );

//   r4.a *= abs(r4.r) + abs(r4.g) + abs(r4.b) / float(MAX_STEPS);
//   r4.a = r4.a;
//   r4.rgb = r4.rgb;
//   return r4;
// }

void main( void ) {
//Transform the coordinates it from [-1;1] to [0;1]
vec2 texc = vec2(((vProjectedCoords.x / vProjectedCoords.w) + 1.0 ) / 2.0,
        ((vProjectedCoords.y / vProjectedCoords.w) + 1.0 ) / 2.0 );

//The back position is the world space position stored in the texture.
vec3 backPos = texture2D(tex, texc).xyz;

//The front position is the world space position of the second render pass.
vec3 frontPos = vWorldSpaceCoords;

//The direction from the front position to back position.
vec3 dir = backPos - frontPos;

float rayLength = length(dir);

//Calculate how long to increment in each step.
float delta = 1.0 / steps;

//The increment in each direction for each step.
vec3 deltaDirection = normalize(dir) * delta;
float deltaDirectionLength = length(deltaDirection);

//Start the ray casting from the front position.
vec3 currentPosition = frontPos;

//The color accumulator.
vec4 accumulatedColor = vec4(0.0);

//The alpha value accumulated so far.
float accumulatedAlpha = 0.0;

//How long has the ray travelled so far.
float accumulatedLength = 0.0;

vec4 colorSample;
float alphaSample;

//Perform the ray marching iterations
for(int i = 0; i < MAX_STEPS; i++)
{
  //Get the voxel intensity value from the 3D texture.
  colorSample = sampleAs3DTexture( currentPosition );

  //Allow the alpha correction customization
  alphaSample = colorSample.a * alphaCorrection;

  //Perform the composition.
  accumulatedColor += (1.0 - accumulatedAlpha) * colorSample * alphaSample;

  //Store the alpha accumulated so far.
  accumulatedAlpha += alphaSample;

  //Advance the ray.
  currentPosition += deltaDirection;
  accumulatedLength += deltaDirectionLength;

  //If the length traversed is more than the ray length, or if the alpha accumulated reaches 1.0 then exit.
  if (accumulatedLength >= rayLength || accumulatedAlpha >= 1.0)
  // if (accumulatedAlpha >= 1.0)
    break;
}

gl_FragColor  = accumulatedColor;
//Leandro R Barbagallo - 2015 - lebarba at gmail.com
}`,

      uniforms: {
        steps: { value: SDFTexture.info.NUM_ROW * 2.0 },
        alphaCorrection: { value: 0.85 },
        tex: { value: this.rtTexture.texture },
        time: { value: 0 },

        tex3D: { value: SDFTexture.renderTarget.texture },
        sliceSize: { value: SDFTexture.info.SLICE_SIZE_PX },
        numRows: { value: SDFTexture.info.NUM_ROW },
        slicesPerRow: { value: SDFTexture.info.SLICE_PER_ROW },

        // uniform sampler2D tex3D;
        // uniform float sliceSize;
        // uniform float numRows;
        // uniform float slicesPerRow;
      },
    };

    this.scenePass1 = new Scene();
    this.scenePass2 = new Scene();
    // this.scenePass2.background = new Color("#bababa");

    let mat1 = new ShaderMaterial({
      uniforms: this.pass1.uniforms,
      vertexShader: this.pass1.vs,
      fragmentShader: this.pass1.fs,
      transparent: false,
      side: BackSide,
    });
    let box1 = new BoxBufferGeometry(1, 1, 1, 128, 128, 128);
    let drawable1 = new Mesh(box1, mat1);

    this.scenePass1.add(drawable1);

    let mat2 = new ShaderMaterial({
      uniforms: this.pass2.uniforms,
      vertexShader: this.pass2.vs,
      fragmentShader: this.pass2.fs,
      transparent: true,
      side: FrontSide,
    });

    let box2 = new BoxBufferGeometry(1, 1, 1, 128, 128, 128);
    let drawable2 = new Mesh(box2, mat2);
    this.scenePass2.add(drawable2);

    let mat3 = new MeshBasicMaterial({ map: this.rtTexture2.texture });
    let geo3 = new PlaneBufferGeometry(100, 100, 2, 2);
    let mesh = new Mesh(geo3, mat3);
    mesh.position.x = -0;
    this.drawable.add(mesh);

    let cameraInternal = new PerspectiveCamera(75, 2.0 / 2.0, 0.0001, 1000000);
    cameraInternal.updateProjectionMatrix();
    cameraInternal.position.z = 3;

    this.mini.set("VolumeCamera", cameraInternal);

    this.compute = () => {
      let time = window.performance.now() * 0.001;
      this.pass1.uniforms.time.value = time;
      this.pass2.uniforms.time.value = time;
      this.pass2.uniforms.tex.value = this.rtTexture.texture;
      mat3.needsUpdate = true;

      // let camera = getCurrentCamera();
      // let oldPos = camera.position.z;

      camera.position.z = 50.0;

      // let oldRenderTarget = renderer.getRenderTarget();
      renderer.setRenderTarget(this.rtTexture);
      renderer.render(this.scenePass1, cameraInternal);
      renderer.setRenderTarget(this.rtTexture2);
      renderer.render(this.scenePass2, cameraInternal);

      renderer.setRenderTarget(null);
    };
  }

  clean() {
    console.log("VolumeVisualiser");
  }
}
