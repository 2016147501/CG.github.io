// hw09/Homework09.js

import * as THREE from 'three';
import {
  initRenderer,
  initCamera,
  initStats,
  initOrbitControls
} from './util.js';

// ─── 설정 상수 ─────────────────────────────────────────────
const SUN_RADIUS    = 10;
const SUN_COLOR     = 0xffff00;
const PLANET_CONFIG = [
  { name: 'Mercury', tex: 'Mercury.jpg', radius: 1.5, distance: 20 },
  { name: 'Venus',   tex: 'Venus.jpg',   radius: 3.0, distance: 35 },
  { name: 'Earth',   tex: 'Earth.jpg',   radius: 3.5, distance: 50 },
  { name: 'Mars',    tex: 'Mars.jpg',    radius: 2.5, distance: 65 }
];

// ─── 전역 변수 ─────────────────────────────────────────────
let scene, renderer;
let perspCam, orthoCam, currentCam;
let stats, orbitControls;
const textureLoader = new THREE.TextureLoader();
const planets = {};    // { Mercury: { mesh, pivot }, … }


// ─── UI 제어 객체 ───────────────────────────────────────────
const controls = new function() {
  this.cameraMode = 'Perspective';

  // Perspective ⇄ Orthographic 전환
  this.switchCamera = () => {
    if (currentCam === perspCam) {
      orthoCam = new THREE.OrthographicCamera(
        window.innerWidth / -16, window.innerWidth / 16,
        window.innerHeight / 16, window.innerHeight / -16,
        perspCam.near, perspCam.far
      );
      orthoCam.position.copy(perspCam.position);
      orthoCam.lookAt(scene.position);

      currentCam = orthoCam;
      this.cameraMode = 'Orthographic';
    } else {
      currentCam = perspCam;
      this.cameraMode = 'Perspective';
    }

    // OrbitControls 재연결
    orbitControls.dispose();
    orbitControls = initOrbitControls(currentCam, renderer);
  };

  // Control 버튼만 남기고 GUI 토글
  this.toggleGUI = () => {
    const list = gui.domElement.querySelector('ul');
    Array.from(list.children).forEach((li, i) => {
      if (i === 0) return;      // 첫 번째 Control 버튼은 항상 보이기
      li.style.display = li.style.display === 'none' ? '' : 'none';
    });
  };

  // 행성 속도 초기값
  this.mercuryRotSpeed   = 0.02;
  this.mercuryOrbitSpeed = 0.02;
  this.venusRotSpeed     = 0.015;
  this.venusOrbitSpeed   = 0.015;
  this.earthRotSpeed     = 0.01;
  this.earthOrbitSpeed   = 0.01;
  this.marsRotSpeed      = 0.008;
  this.marsOrbitSpeed    = 0.008;
}();

let gui;  // 전역으로 선언

// ─── 초기화 ─────────────────────────────────────────────────
function init() {
  scene    = new THREE.Scene();
  renderer = initRenderer();

  // 1) PerspectiveCamera
  perspCam = initCamera(new THREE.Vector3(0, 50, 100));
  currentCam = perspCam;

  // 2) 기본 조명
  scene.add(new THREE.AmbientLight(0x343434));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(50, 50, 50);
  scene.add(dirLight);

  // 3) Stats & OrbitControls
  stats         = initStats(0);
  orbitControls = initOrbitControls(currentCam, renderer);

  // 4) 천체 생성
  createSun();
  createPlanets();

  // 5) GUI 생성
  createGUI();

  // 6) 리사이즈 핸들러
  window.addEventListener('resize', onWindowResize);
}

// ─── 태양 생성 ───────────────────────────────────────────────
function createSun() {
  const geo = new THREE.SphereGeometry(SUN_RADIUS, 32, 32);
  const mat = new THREE.MeshBasicMaterial({ color: SUN_COLOR });
  scene.add(new THREE.Mesh(geo, mat));
}

// ─── 행성 생성 ───────────────────────────────────────────────
function createPlanets() {
  PLANET_CONFIG.forEach(p => {
    const pivot = new THREE.Object3D();
    scene.add(pivot);

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(p.radius, 32, 32),
      new THREE.MeshStandardMaterial({
        map:       textureLoader.load(p.tex),
        roughness: 0.8,
        metalness: 0.2
      })
    );
    mesh.position.x = p.distance;
    pivot.add(mesh);

    planets[p.name] = { mesh, pivot };
  });
}

// ─── GUI 생성 ───────────────────────────────────────────────
function createGUI() {
  gui = new dat.GUI({ width: 260 });

  // Control 버튼
  gui.add(controls, 'toggleGUI').name('Control');

  // Camera 폴더
  const camF = gui.addFolder('Camera');
  camF.add(controls, 'switchCamera').name('Switch Camera');
  camF.add(controls, 'cameraMode').name('Current Cam').listen();
  camF.open();

  // 각 행성별 폴더
  PLANET_CONFIG.forEach(p => {
    const key = p.name.toLowerCase();
    const f   = gui.addFolder(p.name);
    f.add(controls, `${key}RotSpeed`,   0, 0.1, 0.001).name('Rotation');
    f.add(controls, `${key}OrbitSpeed`, 0, 0.1, 0.001).name('Orbit');
    f.open();
  });
}

// ─── 리사이즈 핸들러 ─────────────────────────────────────────
function onWindowResize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);

  // PerspectiveCamera 업데이트
  perspCam.aspect = w / h;
  perspCam.updateProjectionMatrix();

  if (orthoCam) {
    orthoCam.left   = w / -16;
    orthoCam.right  = w /  16;
    orthoCam.top    = h /  16;
    orthoCam.bottom = h / -16;
    orthoCam.updateProjectionMatrix();
  }
}

// ─── 애니메이션 루프 ─────────────────────────────────────────
function animate() {
  stats.begin();

  PLANET_CONFIG.forEach(p => {
    const key    = p.name.toLowerCase();
    const planet = planets[p.name];
    planet.mesh.rotation.y  += controls[`${key}RotSpeed`];
    planet.pivot.rotation.y += controls[`${key}OrbitSpeed`];
  });

  orbitControls.update();
  renderer.render(scene, currentCam);

  stats.end();
  requestAnimationFrame(animate);
}

// ─── 실행 진입점 ─────────────────────────────────────────────
init();
animate();
