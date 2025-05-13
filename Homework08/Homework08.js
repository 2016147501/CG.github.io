import { resizeAspectRatio as fitCanvas, setupText, updateText, Axes } from './util.js';
import { Shader, readShaderFile }      from './shader.js';
import { Arcball }                     from './arcball.js';
import { Cylinder }                    from './cylinder.js';

// === WebGL & Canvas ============================================================
const canvas = document.getElementById('glCanvas');
const gl     = canvas.getContext('webgl2');
if (!gl) throw new Error('WebGL2 not supported');

// === Matrices ==================================================================
let modelMat = mat4.create();
let viewMat  = mat4.create();
let projMat  = mat4.create();

// === Constants =================================================================
const CAM_START  = vec3.fromValues(0, 0, 3);
const LIGHT_DIR  = vec3.fromValues(1.0, 0.25, 0.5);
const SHININESS  = 32.0;

// === Runtime State ==============================================================
let toonLevels = 3;               // 1‒5
let arcMode    = 'VIEW';          // VIEW ↔ OBJECT
let shader     = null;

// === Scene Objects ==============================================================
const cylinder = new Cylinder(gl, 32);
const axes     = new Axes(gl, 1.5);
const arcball  = new Arcball(canvas, 3.0, { rotation: 2.0, zoom: 0.0005 });

// === UI Overlay =================================================================
let txtMode, txtLevel;

window.addEventListener('DOMContentLoaded', bootstrap);

async function bootstrap() {
  initCanvas();
  await buildShader();
  setStaticUniforms();
  initOverlay();
  bindKeys();
  requestAnimationFrame(render);
}

function initCanvas() {
  canvas.width  = 700;
  canvas.height = 700;
  fitCanvas(gl, canvas);
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.clearColor(0.1, 0.1, 0.1, 1.0);
  gl.enable(gl.DEPTH_TEST);

  mat4.perspective(projMat, glMatrix.toRadian(60), canvas.width / canvas.height, 0.1, 100.0);
  mat4.lookAt(viewMat, CAM_START, [0, 0, 0], [0, 1, 0]);
}

async function buildShader() {
  const vs = await readShaderFile('shVert.glsl');
  const fs = await readShaderFile('shFrag.glsl');
  shader   = new Shader(gl, vs, fs);
}

function setStaticUniforms() {
  shader.use();
  shader.setMat4('u_projection', projMat);

  shader.setVec3('light.direction', LIGHT_DIR);
  shader.setVec3('light.ambient',  [0.2, 0.2, 0.2]);
  shader.setVec3('light.diffuse',  [0.7, 0.7, 0.7]);
  shader.setVec3('light.specular', [1.0, 1.0, 1.0]);

  shader.setVec3('material.diffuse',  [1.0, 0.5, 0.31]);
  shader.setVec3('material.specular', [0.8, 0.8, 0.8]);
  shader.setFloat('material.shininess', SHININESS);

  shader.setVec3('u_viewPos', CAM_START);
}

function initOverlay() {
  setupText(canvas, 'TOON SHADING',                               1);
  txtMode  = setupText(canvas, `arcball mode: ${arcMode}`,        2);
  txtLevel = setupText(canvas, `toon levels: ${toonLevels}`,      3);
  setupText(canvas, "press 'a' / 'r' – change/reset arcball",    4);
  setupText(canvas, 'press 1 – 5 to set toon levels',             5);
}

function bindKeys() {
  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'a':
        arcMode = arcMode === 'VIEW' ? 'OBJECT' : 'VIEW';
        updateText(txtMode, `arcball mode: ${arcMode}`);
        break;
      case 'r':
        arcball.reset();
        modelMat = mat4.create();
        arcMode  = 'VIEW';
        updateText(txtMode, `arcball mode: ${arcMode}`);
        break;
      default:
        if (e.key >= '1' && e.key <= '5') {
          toonLevels = +e.key;
          updateText(txtLevel, `toon levels: ${toonLevels}`);
        }
    }
  });
}

function getEyeFromView(mat) {
  const inv = mat4.invert(mat4.create(), mat);
  return vec3.fromValues(inv[12], inv[13], inv[14]);
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (arcMode === 'VIEW') {
    modelMat = mat4.create();
    viewMat  = arcball.getViewMatrix();
  } else {
    modelMat = arcball.getModelRotMatrix();
    viewMat  = arcball.getViewCamDistanceMatrix();
  }

  const eyePos = getEyeFromView(viewMat);

  // --- Cylinder (toon) ----------------------------------------------------------
  shader.use();
  shader.setMat4('u_view',  viewMat);
  shader.setMat4('u_model', modelMat);
  shader.setVec3('u_viewPos', eyePos);
  shader.setInt('toonLevels', toonLevels);
  cylinder.draw(shader);

  // --- Axes (share model transform) --------------------------------------------
  axes.shader.use();
  axes.shader.setMat4('u_model', modelMat);
  axes.shader.setMat4('u_view',  viewMat);
  axes.shader.setMat4('u_projection', projMat);
  gl.bindVertexArray(axes.vao);
  gl.drawArrays(gl.LINES, 0, 6);
  gl.bindVertexArray(null);

  requestAnimationFrame(render);
}
