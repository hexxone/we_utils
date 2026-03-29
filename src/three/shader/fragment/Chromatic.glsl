varying vec2 vUv;

uniform sampler2D tDiffuse;
uniform vec2 iResolution;
uniform float strength;

void main() {
    vec4 base = texture2D(tDiffuse, vUv);
    vec2 direction = (vUv - 0.5) * (strength / max(iResolution.x, iResolution.y));
    vec2 off = direction * 1.33333333333333;
    vec4 shifted = vec4(
        texture2D(tDiffuse, clamp(vUv + off, 0.0, 1.0)).r,
        texture2D(tDiffuse, vUv).g,
        texture2D(tDiffuse, clamp(vUv - off, 0.0, 1.0)).b,
        base.a
    );

    gl_FragColor = mix(base, shifted, clamp(abs(strength) / 24.0, 0.0, 1.0));
}
