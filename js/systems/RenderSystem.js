import * as THREE from 'three';
import { OrbitControls } from 'three/controls/OrbitControls';
import EventBus from '../core/EventBus.js';

/**
 * RenderSystem — Pure rendering layer.
 * Stateless: no interaction logic, no game logic.
 * Responsible only for: scene, camera, renderer, lights, controls.
 */
const RenderSystem = (() => {
  let renderer, scene, camera, controls, clock;
  let _allMeshes = [];

  // ── INIT ──────────────────────────────────────
  const init = (container) => {
    clock = new THREE.Clock();

    // Renderer
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding  = THREE.sRGBEncoding;
    renderer.toneMapping     = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled   = true;
    renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060607);
    scene.fog = new THREE.FogExp2(0x060607, 0.045);

    // Camera
    camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.05, 120);
    camera.position.set(5.5, 2.2, 7.5);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping    = true;
    controls.dampingFactor    = 0.055;
    controls.minDistance      = 2;
    controls.maxDistance      = 16;
    controls.maxPolarAngle    = Math.PI * 0.52;
    controls.target.set(0, 0.6, 0);
    controls.autoRotate       = false;
    controls.autoRotateSpeed  = 0.6;

    _buildLighting();
    _buildEnvironment();

    window.addEventListener('resize', _onResize);
    EventBus.emit('RENDER_READY', {});
  };

  // ── LIGHTING ──────────────────────────────────
  const _buildLighting = () => {
    // Ambient fill
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    // Key sun
    const sun = new THREE.DirectionalLight(0xfff8f0, 2.2);
    sun.position.set(8, 12, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near   = 0.5;
    sun.shadow.camera.far    = 50;
    sun.shadow.camera.left   = sun.shadow.camera.bottom = -8;
    sun.shadow.camera.right  = sun.shadow.camera.top    =  8;
    sun.shadow.bias          = -0.002;
    sun.shadow.normalBias    = 0.04;
    scene.add(sun);

    // Cool fill (from opposite side)
    const fill = new THREE.DirectionalLight(0x8baeff, 0.55);
    fill.position.set(-7, 5, -5);
    scene.add(fill);

    // Red rim light (RWB signature)
    const rim = new THREE.PointLight(0xff2200, 2.0, 14);
    rim.position.set(-3.5, 2.2, -6);
    scene.add(rim);

    // Subtle floor bounce
    const bounce = new THREE.PointLight(0x1a3060, 0.9, 10);
    bounce.position.set(0, -0.3, 0);
    scene.add(bounce);
  };

  // ── ENVIRONMENT ───────────────────────────────
  const _buildEnvironment = () => {
    // Reflective ground plane
    const groundGeo = new THREE.PlaneGeometry(40, 40);
    const groundMat = new THREE.MeshStandardMaterial({
      color:     0x0a0a0d,
      roughness: 0.92,
      metalness: 0.15,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Subtle grid lines
    const grid = new THREE.GridHelper(24, 48, 0x18181e, 0x111118);
    grid.position.y = 0.001;
    scene.add(grid);

    // Distant dark sky sphere
    const skyGeo = new THREE.SphereGeometry(60, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x050508, side: THREE.BackSide });
    scene.add(new THREE.Mesh(skyGeo, skyMat));
  };

  // ── RESIZE ────────────────────────────────────
  const _onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  // ── CAR SETUP ─────────────────────────────────
  const registerCarMeshes = (root) => {
    _allMeshes = [];
    root.traverse(child => {
      if (child.isMesh) {
        child.castShadow    = true;
        child.receiveShadow = true;
        _allMeshes.push(child);
      }
    });
  };

  // ── RENDER TICK ───────────────────────────────
  /** Call each frame — pure rendering only */
  const tick = () => {
    controls.update();
    renderer.render(scene, camera);
  };

  // ── QUALITY SCALING ───────────────────────────
  const setPixelRatio = (ratio) => {
    renderer.setPixelRatio(Math.max(0.5, Math.min(ratio, window.devicePixelRatio)));
  };

  // ── DISPOSE ───────────────────────────────────
  const dispose = () => {
    window.removeEventListener('resize', _onResize);
    renderer.dispose();
    controls.dispose();
  };

  // ── PUBLIC API ────────────────────────────────
  return {
    init,
    tick,
    dispose,
    registerCarMeshes,
    setPixelRatio,
    getScene:    () => scene,
    getCamera:   () => camera,
    getControls: () => controls,
    getClock:    () => clock,
    getMeshes:   () => _allMeshes,
    getRenderer: () => renderer,
  };
})();

export default RenderSystem;
