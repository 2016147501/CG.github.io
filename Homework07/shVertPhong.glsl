#version 300 es
layout (location = 0) in vec3 aPos;
layout (location = 1) in vec3 aNor;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;

out vec3 vPos;   /* 월드 좌표 */
out vec3 vNor;   /* 월드 노말 */

void main() {
    vPos = vec3(u_model * vec4(aPos, 1.0));
    vNor = mat3(transpose(inverse(u_model))) * aNor;

    gl_Position = u_projection * u_view * vec4(vPos, 1.0);
}
