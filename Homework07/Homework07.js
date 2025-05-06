/* ------------------------------------------------------------------
 * Homework07.js ‑ Cone + Lamp with Arcball (약 240 lines)
 * ------------------------------------------------------------------ */
import { resizeAspectRatio, setupText, updateText } from './util/util.js';
import { Shader, readShaderFile } from './util/shader.js';
import { Cone }   from './cone.js';
import { Cube }   from './util/cube.js';
import { Arcball }from './util/arcball.js';

const canvas = document.getElementById('glCanvas');
canvas.width = canvas.height = 700;
const gl = canvas.getContext('webgl2');
if (!gl) throw new Error('WebGL2 unsupported');

resizeAspectRatio(gl, canvas);
gl.viewport(0, 0, canvas.width, canvas.height);
gl.clearColor(0.1, 0.1, 0.1, 1);

let gouraudShader, phongShader, lampShader;
const cone  = new Cone(gl, 32);
const lamp  = new Cube(gl);

const cameraPos = vec3.fromValues(0, 0, 3);
const lightPos  = vec3.fromValues(1.0, 0.7, 1.0);
const lightSize = vec3.fromValues(0.1, 0.1, 0.1);

const arcball = new Arcball(canvas, 5.0, { rotation: 2.0, zoom: 0.0005 });

/* ---------- 공통 행렬 ---------- */
let viewMatrix  = mat4.create();
let projMatrix  = mat4.create();
let rootModel   = mat4.create();                 // Cone & Lamp 공유
const lampOffset = mat4.create();                // T·S (고정)
mat4.translate(lampOffset, lampOffset, lightPos);
mat4.scale    (lampOffset, lampOffset, lightSize);

/* ---------- 상태 HUD ---------- */
let txtArc, txtShade;
let arcMode = 'CAMERA';        // 'CAMERA' | 'MODEL'
let shadeMode = 'FLAT';        // 'FLAT'   | 'SMOOTH'
let rendMode  = 'PHONG';       // 'PHONG'  | 'GOURAUD'

/* ================================================================== */
/*                            초기화                                  */
/* ================================================================== */
(async function init() {
  // 투영행렬
  mat4.perspective(projMatrix, glMatrix.toRadian(60), 1, 0.1, 100);
  // 셰이더 로드
  gouraudShader = await loadShader('shVertGouraud.glsl', 'shFragGouraud.glsl');
  phongShader   = await loadShader('shVertPhong.glsl',  'shFragPhong.glsl');
  lampShader    = await loadShader('shLampVert.glsl',   'shLampFrag.glsl');

  [gouraudShader, phongShader].forEach(s => {
    s.use();
    s.setMat4('u_projection', projMatrix);
    s.setVec3('light.position', lightPos);
    s.setVec3('light.ambient', [0.2, 0.2, 0.2]);
    s.setVec3('light.diffuse', [0.7, 0.7, 0.7]);
    s.setVec3('light.specular', [1, 1, 1]);
    s.setVec3('material.diffuse', [1.0, 0.5, 0.31]);
    s.setVec3('material.specular', [0.5, 0.5, 0.5]);
    s.setFloat('material.shininess', 16);
  });
  lampShader.use();
  lampShader.setMat4('u_projection', projMatrix);

  // 텍스트 오버레이
  setupText(canvas, 'Cone with Lighting', 1);
  txtArc   = setupText(canvas, `arcball mode: ${arcMode}`, 2);
  txtShade = setupText(canvas, `shading mode: ${shadeMode} (${rendMode})`, 3);
  setupHelp();

  // 키보드
  window.addEventListener('keydown', onKey);

  // 렌더링 시작
  requestAnimationFrame(render);
})();

/* ================================================================== */
/*                           함수 정의                                */
/* ================================================================== */
async function loadShader(vPath, fPath) {
  const vs = await readShaderFile(vPath);
  const fs = await readShaderFile(fPath);
  return new Shader(gl, vs, fs);
}

function onKey(e) {
  const k = e.key.toLowerCase();
  if (k === 'a') {               // arcball 모드
    arcMode = arcMode === 'CAMERA' ? 'MODEL' : 'CAMERA';
    updateText(txtArc, `arcball mode: ${arcMode}`);
  } else if (k === 'r') {        // 리셋
    arcball.reset(); mat4.identity(rootModel); arcMode = 'CAMERA';
    updateText(txtArc, `arcball mode: ${arcMode}`);
  } else if (k === 's') {        // 스무스
    cone.copyVertexNormalsToNormals(); cone.updateNormals();
    shadeMode = 'SMOOTH'; updShade();
  } else if (k === 'f') {        // 플랫
    cone.copyFaceNormalsToNormals(); cone.updateNormals();
    shadeMode = 'FLAT';   updShade();
  } else if (k === 'g') {        // 구로
    rendMode  = 'GOURAUD'; updShade();
  } else if (k === 'p') {        // 퐁
    rendMode  = 'PHONG';  updShade();
  }
}
function updShade() {
  updateText(txtShade, `shading mode: ${shadeMode} (${rendMode})`);
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  /* ---------- Arcball 적용 ---------- */
  if (arcMode === 'CAMERA') {
    viewMatrix = arcball.getViewMatrix();
    mat4.identity(rootModel);             // 객체 고정
  } else {
    rootModel  = arcball.getModelRotMatrix();
    viewMatrix = arcball.getViewCamDistanceMatrix();
  }

  /* ---------- 1) 원뿔 ---------- */
  const shader = (rendMode === 'GOURAUD') ? gouraudShader : phongShader;
  shader.use();
  shader.setMat4('u_view',  viewMatrix);
  shader.setMat4('u_model', rootModel);
  shader.setVec3('u_viewPos', cameraPos);
  cone.draw(shader);

  /* ---------- 2) 램프 큐브 ---------- */
  lampShader.use();
  lampShader.setMat4('u_view', viewMatrix);
  const lampMat = mat4.create();
  mat4.multiply(lampMat, rootModel, lampOffset);   // root · offset
  lampShader.setMat4('u_model', lampMat);
  lamp.draw(lampShader);

  requestAnimationFrame(render);
}

function setupHelp() {
  const txt = [
    "press 'a' : toggle arcball mode",
    "press 'r' : reset arcball",
    "press 's' : smooth shading", "press 'f' : flat shading",
    "press 'g' : Gouraud shader", "press 'p' : Phong shader"
  ];
  txt.forEach((t, i) => setupText(canvas, t, i + 4));
}
