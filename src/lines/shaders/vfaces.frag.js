module.exports = /* glsl */ `
    uniform sampler2D envMap;
    uniform float uReso;
    uniform float progress_faces;

    varying vec3 worldNormal;
    varying vec3 viewDirection;

    void main() {
        
        vec3 color = vec3(0.0,1.,255.0);

        float test = progress_faces * 0.2;

        gl_FragColor = vec4(color.rgb, test);

    }
`;
