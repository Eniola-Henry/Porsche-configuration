/**
 * main.js — Bootstrap & main loop
 * Wheels do NOT rotate artificially.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/loaders/GLTFLoader';

import EventBus from './core/EventBus.js';
import EntityManager from './core/EntityManager.js';
import { FSM } from './core/FSM.js';
import RenderSystem from './systems/RenderSystem.js';
import { InputManager, InteractionSystem, AnimationSystem } from './systems/InteractionAnimationSystems.js';
import AerodynamicsSystem from './systems/AerodynamicsSystem.js';
import ConfiguratorSystem from './systems/ConfiguratorSystem.js';
import { ExplodedViewSystem, PerformanceMonitor, SmokeSystem } from './systems/UtilitySystems.js';
import ModeManager from './systems/ModeManager.js';

const MODEL_URL = './assets/porsche_911_rauh-welt_free.glb';

// UI helpers
const setProgress = (pct, msg) => {
  document.getElementById('loading-bar').style.width = pct + '%';
  document.getElementById('loading-status').textContent = msg;
};
const hideLoading = () => {
  const el = document.getElementById('loading');
  el.classList.add('fade');
  setTimeout(() => el.remove(), 1000);
};

let _toastTimer;
const showToast = (msg, type = '') => {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show' + (type ? ' ' + type : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ''; }, 2800);
};
EventBus.on('UI_TOAST', ({ msg, type }) => showToast(msg, type || ''));

// Config UI bindings
const bindConfigUI = () => {
  document.querySelectorAll('.swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      EventBus.emit('CONFIG_COLOR', { color: sw.dataset.color });
    });
  });
  document.querySelectorAll('.wheel-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.wheel-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      EventBus.emit('CONFIG_WHEEL', { style: parseInt(opt.dataset.wheel, 10) });
    });
  });
  document.getElementById('toggle-lights').addEventListener('click', function() {
    this.classList.toggle('on');
    EventBus.emit('CONFIG_TOGGLE', { key: 'lights', val: this.classList.contains('on') });
  });
};

// Main loop — no wheel rotation
let _lastTs = 0;
const loop = (ts) => {
  requestAnimationFrame(loop);
  const dt = Math.min((ts - _lastTs) / 1000, 0.05);
  _lastTs = ts;
  RenderSystem.tick();
  AerodynamicsSystem.update(dt);
  SmokeSystem.tick();
  PerformanceMonitor.tick();
};

// Bootstrap
const bootstrap = async () => {
  setProgress(5, 'INITIALIZING RENDERER...');
  RenderSystem.init(document.getElementById('canvas-container'));

  setProgress(18, 'STARTING SYSTEMS...');
  AnimationSystem.init();
  InputManager.init(RenderSystem.getRenderer().domElement);
  InteractionSystem.init();
  AerodynamicsSystem.init(RenderSystem.getScene());
  SmokeSystem.init();
  ModeManager.init();
  bindConfigUI();

  setProgress(35, 'LOADING 3D ASSET...');

  await new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      MODEL_URL,
      (gltf) => {
        setProgress(82, 'BUILDING ENTITY GRAPH...');
        const model = gltf.scene;

        // Auto-fit
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const scale = 4.0 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(scale);
        model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

        RenderSystem.getScene().add(model);
        RenderSystem.registerCarMeshes(model);

        EntityManager.create('car', {
          mesh: model,
          interactable: true,
          stateMachine: new FSM('car', {
            initial: 'idle',
            states: {
              idle:       { transitions: { inspect: 'inspecting' } },
              inspecting: { transitions: { idle: 'idle' } },
            },
          }),
        });

        const meshes = RenderSystem.getMeshes();
        ConfiguratorSystem.init(meshes);
        ExplodedViewSystem.init(meshes);
        PerformanceMonitor.init(
          document.getElementById('fps-val'),
          RenderSystem.setPixelRatio
        );

        EventBus.on('INTERACT', ({ entityId }) => {
          const e = EntityManager.get(entityId);
          if (e?.components?.stateMachine?.can('inspect'))
            e.components.stateMachine.transition('inspect');
        });

        setProgress(100, 'READY');
        setTimeout(() => {
          hideLoading();
          showToast('RWB 911 READY — SELECT A MODE', 'ok');
          requestAnimationFrame(loop);
        }, 500);
        resolve();
      },
      (xhr) => {
        const pct = 35 + (xhr.loaded / (xhr.total || xhr.loaded + 1)) * 46;
        setProgress(Math.min(pct, 80), 'STREAMING GEOMETRY...');
      },
      (err) => {
        console.error('[Loader]', err);
        document.getElementById('loading-status').textContent =
          '⚠ MODEL NOT FOUND — place GLB in /assets/';
        reject(err);
      }
    );
  });
};

bootstrap().catch(console.error);
