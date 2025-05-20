import * as THREE from 'three';
import {
  initRenderer,
  initCamera,
  initStats,
  initOrbitControls
} from './util.js';

// configuration
const SUN_RADIUS    = 10;
const SUN_COLOR     = 0xffff00;
const PLANET_CONFIG = [
  { name:'Mercury', tex:'Mercury.jpg', radius:1.5, distance:20 },
  { name:'Venus',   tex:'Venus.jpg',   radius:3.0, distance:35 },
  { name:'Earth',   tex:'Earth.jpg',   radius:3.5, distance:50 },
  { name:'Mars',    tex:'Mars.jpg',    radius:2.5, distance:65 }
];

// globals
let scene, renderer;
let perspCam, orthoCam, currentCam;
let stats, orbitControls;
const textureLoader = new THREE.TextureLoader();
const planets = {};
let gui, guiVisible = true;

// UI controls
const controls = new function() {
  this.cameraMode = 'Perspective';

  // toggle Perspective ↔ Orthographic
  this.switchCamera = () => {
    if (currentCam === perspCam) {
      orthoCam = new THREE.OrthographicCamera(
        window.innerWidth / -16, window.innerWidth / 16,
        window.innerHeight / 16, window.innerHeight / -16,
        perspCam.near, perspCam.far
      );
      orthoCam.position.set(0, 30, 130);
      orthoCam.lookAt(scene.position);

      currentCam = orthoCam;
      this.cameraMode = 'Orthographic';
    } else {
      currentCam = perspCam;
      this.cameraMode = 'Perspective';
    }
    orbitControls.dispose();
    orbitControls = initOrbitControls(currentCam, renderer);
  };

  // show/hide everything except the Control button
  this.toggleGUI = () => {
    const list = gui.domElement.querySelector('ul');
    Array.from(list.children).forEach((li,i) => {
      if (i===0) return;
      li.style.display = li.style.display === 'none' ? '' : 'none';
    });
  };

  // initial rotation/orbit speeds
  this.mercuryRotSpeed   = 0.02;
  this.mercuryOrbitSpeed = 0.02;
  this.venusRotSpeed     = 0.015;
  this.venusOrbitSpeed   = 0.015;
  this.earthRotSpeed     = 0.01;
  this.earthOrbitSpeed   = 0.01;
  this.marsRotSpeed      = 0.008;
  this.marsOrbitSpeed    = 0.008;
}();

// init everything
function init() {
  scene    = new THREE.Scene();
  renderer = initRenderer();

  // 1) camera setup
  perspCam = initCamera(new THREE.Vector3(0, 30, 130));
  currentCam = perspCam;

  // 2) lights
  scene.add(new THREE.AmbientLight(0x333333));
  const dir = new THREE.DirectionalLight(0xffffff);
  dir.position.set(50,50,0);
  scene.add(dir);

  // 3) stats & controls
  stats         = initStats(0);
  orbitControls = initOrbitControls(currentCam, renderer);

  // 4) create Sun & planets
  createSun();
  createPlanets();

  // 5) build GUI
  createGUI();

  window.addEventListener('resize', onWindowResize);
}

function createSun() {
  const geo = new THREE.SphereGeometry(SUN_RADIUS,32,32);
  const mat = new THREE.MeshBasicMaterial({ color: SUN_COLOR });
  scene.add(new THREE.Mesh(geo, mat));
}

function createPlanets() {
  PLANET_CONFIG.forEach(p => {
    const pivot = new THREE.Object3D();
    scene.add(pivot);

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(p.radius,32,32),
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

function createGUI() {
  gui = new dat.GUI({ width:260 });
  gui.add(controls,'toggleGUI').name('Control');

  // Camera folder
  const cF = gui.addFolder('Camera');
  cF.add(controls,'switchCamera').name('Switch Camera');
  cF.add(controls,'cameraMode').name('Current Cam').listen();
  cF.open();

  // Planet folders
  PLANET_CONFIG.forEach(p => {
    const key = p.name.toLowerCase();
    const f   = gui.addFolder(p.name);
    f.add(controls,`${key}RotSpeed`,   0,0.1,0.001).name('Rotation');
    f.add(controls,`${key}OrbitSpeed`, 0,0.1,0.001).name('Orbit');
    f.open();
  });
}

function onWindowResize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w,h);

  // update perspective
  perspCam.aspect = w/h;
  perspCam.updateProjectionMatrix();

  if (orthoCam) {
    orthoCam.left   = w/-16;
    orthoCam.right  = w/16;
    orthoCam.top    = h/16;
    orthoCam.bottom = h/-16;
    orthoCam.updateProjectionMatrix();
  }
}

function animate() {
  stats.begin();

  PLANET_CONFIG.forEach(p=>{
    const key = p.name.toLowerCase();
    const o   = planets[p.name];
    o.mesh.rotation.y  += controls[`${key}RotSpeed`];
    o.pivot.rotation.y += controls[`${key}OrbitSpeed`];
  });

  orbitControls.update();
  renderer.render(scene, currentCam);
  stats.end();
  requestAnimationFrame(animate);
}

init();
animate();
