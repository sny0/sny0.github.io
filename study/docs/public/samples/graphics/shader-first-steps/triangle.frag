#version 300 es
precision highp float;

in vec2 v_uv;
uniform vec3 u_tint;
uniform float u_useUv;
out vec4 outColor;

void main()
{
    vec3 base = mix(vec3(1.0), vec3(v_uv, 0.25), u_useUv);
    outColor = vec4(base * u_tint, 1.0);
}
