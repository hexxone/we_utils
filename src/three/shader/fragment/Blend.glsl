uniform sampler2D tDiffuse;
uniform sampler2D overlayBuffer;

varying vec2 vUv;

void main() {
    vec4 texel1 = texture2D(tDiffuse, vUv);
    vec4 texel2 = texture2D(overlayBuffer, vUv);
    vec4 diff = abs(texel1 - texel2);
    gl_FragColor = vec4(diff, 1.0);
}
