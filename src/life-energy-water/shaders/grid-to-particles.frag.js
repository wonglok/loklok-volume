module.exports = /* glsl */ `
  ${require("./common.frag")}
//transfers velocities back to the particles

// transferFromGridToPartcilesCmd

  varying vec2 v_coordinates;

  uniform sampler2D uParticlePos;
  uniform sampler2D uParticleVel;

//   uniform sampler2D u_particlePositionTexture;
//   uniform sampler2D u_particleVelocityTexture;

//   uniform sampler2D u_gridVelocityTexture;
//   uniform sampler2D u_originalGridVelocityTexture; //the grid velocities before the update

  uniform vec3 uFieldResSize;
  uniform vec3 uFieldSize;

  uniform float uFlipness; //0 is full PIC, 1 is full FLIP

  float sampleXVelocity (sampler2D texture, vec3 position) {
      vec3 cellIndex = vec3(position.x, position.y - 0.5, position.z - 0.5);
      return texture3D(texture, (cellIndex + 0.5) / (uFieldResSize + 1.0), uFieldResSize + 1.0).x;
  }

  float sampleYVelocity (sampler2D texture, vec3 position) {
      vec3 cellIndex = vec3(position.x - 0.5, position.y, position.z - 0.5);
      return texture3D(texture, (cellIndex + 0.5) / (uFieldResSize + 1.0), uFieldResSize + 1.0).y;
  }

  float sampleZVelocity (sampler2D texture, vec3 position) {
      vec3 cellIndex = vec3(position.x - 0.5, position.y - 0.5, position.z);
      return texture3D(texture, (cellIndex + 0.5) / (uFieldResSize + 1.0), uFieldResSize + 1.0).z;
  }

  vec3 sampleVelocity (sampler2D texture, vec3 position) {
      return vec3(sampleXVelocity(texture, position), sampleYVelocity(texture, position), sampleZVelocity(texture, position));
  }

  void main () {

    //   vec3 particlePosition = texture2D(u_particlePositionTexture, v_coordinates).rgb;
    //   particlePosition = (particlePosition / uFieldSize) * uFieldResSize;

    //   vec3 particleVelocity = texture2D(u_particleVelocityTexture, v_coordinates).rgb;

    //   vec3 currentVelocity = sampleVelocity(u_gridVelocityTexture, particlePosition);
    //   vec3 originalVelocity = sampleVelocity(u_originalGridVelocityTexture, particlePosition);

    //   vec3 velocityChange = currentVelocity - originalVelocity;

    //   vec3 flipVelocity = particleVelocity + velocityChange;
    //   vec3 picVelocity = currentVelocity;

    //   gl_FragColor = vec4(mix(picVelocity, flipVelocity, uFlipness),  0.0);

    vec3 particlePosition = texture2D(uParticlePos, v_coordinates).rgb;
    particlePosition = (particlePosition / uFieldSize) * uFieldResSize;

    vec3 currentVelocity = sampleVelocity(uParticleVel, particlePosition);
    gl_FragColor = vec4(vec3(1.0), 1.0);
  }
`;
