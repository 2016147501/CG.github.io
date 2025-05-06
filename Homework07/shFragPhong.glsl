#version 300 es
precision highp float;

in vec3 vPos;
in vec3 vNor;

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

out vec4 fragColor;

void main() {
    vec3 N = normalize(vNor);
    vec3 L = normalize(light.position - vPos);
    vec3 V = normalize(u_viewPos - vPos);
    vec3 H = normalize(L + V);

    /* Ambient */
    vec3 amb = light.ambient * material.diffuse;

    /* Diffuse */
    vec3 dif = light.diffuse * max(dot(N, L), 0.0) * material.diffuse;

    /* Specular */
    float NdotH = max(dot(N, H), 0.0);
    vec3 spc = light.specular *
               pow(NdotH, material.shininess) *
               material.specular;

    fragColor = vec4(amb + dif + spc, 1.0);
}
