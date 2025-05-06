#version 300 es
precision highp float;

in  vec3 fsColor;
out vec4 fragColor;

void main() {
    fragColor = vec4(fsColor, 1.0);
}
