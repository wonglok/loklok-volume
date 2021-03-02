import { Object3D, TextureLoader } from "three";
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
    // let SDFTexture = await this.mini.get("SDFTexture");

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

    this.rtTexture = new WebGLRenderTarget(512, 512);
    this.rtTexture2 = new WebGLRenderTarget(512, 512);

    let STEPS = 15;

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

uniform float time;

uniform sampler2D matcap;

// uniform sampler2D tex3D;
// uniform float sliceSize;
// uniform float numRows;
// uniform float slicesPerRow;

// // tex is a texture with each slice of the cube placed in grid in a texture.
// // texCoord is a 3d texture coord
// // size is the size if the cube in pixels.
// // slicesPerRow is how many slices there are across the texture
// // numRows is the number of rows of slices
// vec2 computeSliceOffset(float slice, float slicesPerRow, vec2 sliceSize) {
//   return sliceSize * vec2(mod(slice, slicesPerRow),
//                           floor(slice / slicesPerRow));
// }

// vec4 scan3DTextureValue (
//     sampler2D tex, vec3 texCoord, float size, float numRows, float slicesPerRow) {
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

// vec4 sampleAs3DTexture (vec3 pos) {
//   vec4 texture3Doutput = scan3DTextureValue(tex3D, pos, sliceSize, numRows, slicesPerRow);
//   // texture3Doutput.a *= 0.5;
//   return texture3Doutput;
// }

// https://www.shadertoy.com/view/3sySRK
// from cine shader by edan kwan
float opSmoothUnion( float d1, float d2, float k ) {
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h);
}

float sdSphere( vec3 p, float s ) {
  return length(p) - s;
}

float sdMetaBall(vec3 p) {
  float d = 2.0;
  for (int i = 0; i < 16; i++) {
    float fi = float(i);
    float aTime = time * (fract(fi * 412.531 + 0.513) - 0.5) * 3.0;
    d = opSmoothUnion(
            sdSphere(p + sin(aTime + fi * vec3(52.5126, 64.62744, 632.25)) * vec3(2.0, 2.0, 0.8), 0.5),
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

vec4 sampleAs3DTexture (vec3 pos) {
  vec3 p = (pos * 2.0 - 1.0) * 4.0;
  float alpha = sdMetaBall(p);
  alpha = min(1.0, max(0.0, alpha));

  vec4 color = vec4(0.0);
  if (1.0 - alpha > 0.0) {
    vec3 uv = vec3(calcNormal(p) * 0.5 + 0.5);
    color = texture2D(matcap, uv.xy);
  }

  return vec4(color.rgb * 1.5, 1.0 - alpha);
}

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
for (int i = 0; i < ${STEPS.toFixed(0)}; i++) {
  //Get the voxel intensity value from the 3D texture.
  colorSample = sampleAs3DTexture(currentPosition);

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
  if (accumulatedLength >= rayLength || accumulatedAlpha >= 1.0) {
    break;
  }
  // if (accumulatedAlpha >= 1.0)
}

gl_FragColor  = accumulatedColor;
//Leandro R Barbagallo - 2015 - lebarba at gmail.com
}`,

      uniforms: {
        steps: { value: STEPS },
        alphaCorrection: { value: 0.85 },
        tex: { value: this.rtTexture.texture },
        time: { value: 0 },

        matcap: {
          value: new TextureLoader().load(
            require("./img/matcap_plastic.jpg").default
          ),
        },

        // tex3D: { value: SDFTexture.renderTarget.texture },
        // sliceSize: { value: SDFTexture.info.SLICE_SIZE_PX },
        // numRows: { value: SDFTexture.info.NUM_ROW },
        // slicesPerRow: { value: SDFTexture.info.SLICE_PER_ROW },

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
    let box1 = new BoxBufferGeometry(1, 1, 1, 5, 5, 5);
    let drawable1 = new Mesh(box1, mat1);
    drawable1.frustumCulled = false;
    this.scenePass1.add(drawable1);

    let mat2 = new ShaderMaterial({
      uniforms: this.pass2.uniforms,
      vertexShader: this.pass2.vs,
      fragmentShader: this.pass2.fs,
      transparent: true,
      side: FrontSide,
    });

    let box2 = new BoxBufferGeometry(1, 1, 1, 5, 5, 5);
    let drawable2 = new Mesh(box2, mat2);
    drawable2.frustumCulled = false;
    this.scenePass2.add(drawable2);

    let mat3 = new MeshBasicMaterial({
      color: 0xffffff,
      map: this.rtTexture2.texture,
    });
    let geo3 = new PlaneBufferGeometry(75, 75, 2, 2);
    let mesh = new Mesh(geo3, mat3);
    mesh.frustumCulled = false;
    this.drawable.add(mesh);

    let volumeCamera = new PerspectiveCamera(45, 1, 0.1, 10000);
    volumeCamera.updateProjectionMatrix();
    volumeCamera.position.z = 2.5;

    this.mini.set("VolumeCamera", volumeCamera);
    this.mini.get("VolumeControls").then((controls) => {
      controls.minDistance = 1.0;
    });

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
      renderer.render(this.scenePass1, volumeCamera);
      renderer.setRenderTarget(this.rtTexture2);
      renderer.render(this.scenePass2, volumeCamera);

      renderer.setRenderTarget(null);
    };
  }

  clean() {
    console.log("VolumeVisualiser");
  }
}
