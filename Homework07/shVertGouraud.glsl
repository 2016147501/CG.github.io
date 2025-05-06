#version 300 es
layout (location = 0) in vec3 aPos;
layout (location = 1) in vec3 aNor;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;

uniform vec3 u_viewPos;

struct Light {
    vec3 position;
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
};
uniform Light light;

struct Material {
    vec3 diffuse;
    vec3 specular;
    float shininess;
};
uniform Material material;

/* == 값 전달용 인터페이스 == */
out vec3 fsColor;

void main() {
    /* 공간 변환 */
    vec3 worldPos  = vec3(u_model * vec4(aPos, 1.0));
    vec3 worldNor  = mat3(transpose(inverse(u_model))) * aNor;

    /* 1) Ambient */
    vec3 amb = light.ambient * material.diffuse;

    /* 2) Diffuse */
    vec3 L  = normalize(light.position - worldPos);
    float NdotL = max(dot(normalize(worldNor), L), 0.0);
    vec3 dif = light.diffuse * NdotL * material.diffuse;

    /* 3) Specular (Blinn–Phong) */
    vec3 V  = normalize(u_viewPos - worldPos);
    vec3 H  = normalize(L + V);
    float NdotH = max(dot(normalize(worldNor), H), 0.0);
    vec3 spc = light.specular *
               pow(NdotH, material.shininess) *
               material.specular;

    fsColor = amb + dif + spc;

    gl_Position = u_projection * u_view * vec4(worldPos, 1.0);
}
