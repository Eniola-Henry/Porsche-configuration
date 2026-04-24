import EventBus from '../core/EventBus.js';
import { FSM } from '../core/FSM.js';
import RenderSystem from './RenderSystem.js';
import AerodynamicsSystem from './AerodynamicsSystem.js';
import { ExplodedViewSystem, SmokeSystem } from './UtilitySystems.js';
import { AnimationSystem } from './InteractionAnimationSystems.js';

/**
 * ModeManager
 * Controls the 6 experience modes via FSM.
 * Each mode change triggers: camera tween + system enable/disable + UI update.
 */
const ModeManager = (() => {
  // ── MODE FSM ─────────────────────────────────
  const MODES = ['orbit','hero','config','aero','explode','interior'];

  const _fsm = new FSM('modes', {
    initial: 'orbit',
    states: Object.fromEntries(
      MODES.map(m => [
        m,
        {
          transitions: Object.fromEntries(
            MODES.filter(o => o !== m).map(o => [`to_${o}`, o])
          ),
          lockMs: 400,
        }
      ])
    ),
  });

  // ── CAMERA PRESETS ────────────────────────────
  // Aero: SIDE VIEW so streamlines are clearly visible
  const CAMERAS = {
    orbit:    { pos: { x: 5.5, y: 2.2, z: 7.5 }, tgt: { x: 0, y: 0.6, z: 0   } },
    hero:     { pos: { x:-6.5, y: 1.5, z:-5.0 }, tgt: { x: 0, y: 0.9, z: 0   } },
    config:   { pos: { x: 4.0, y: 2.0, z: 5.5 }, tgt: { x: 0, y: 0.8, z: 0   } },
    aero:     { pos: { x: 8.0, y: 1.4, z: 0.0 }, tgt: { x: 0, y: 0.7, z:-0.4 } }, // ← pure side view
    explode:  { pos: { x: 7.0, y: 4.0, z: 7.0 }, tgt: { x: 0, y: 0.5, z: 0   } },
    interior: { pos: { x: 0.3, y: 1.0, z: 0.2 }, tgt: { x: 0, y: 0.9, z:-1.0 } },
  };

  let _currentMode = 'orbit';

  // ── SWITCH ───────────────────────────────────
  const switchTo = (mode) => {
    if (!MODES.includes(mode) || mode === _currentMode) return;
    if (!_fsm.can(`to_${mode}`)) return;

    _exit(_currentMode);
    _fsm.transition(`to_${mode}`);
    _currentMode = mode;
    _enter(mode);

    // Sync tab UI
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.remove('active', 'aero-active');
      if (btn.dataset.mode === mode) {
        btn.classList.add(mode === 'aero' ? 'aero-active' : 'active');
      }
    });
    document.getElementById('mode-val').textContent = mode.toUpperCase();
  };

  // ── EXIT MODE ────────────────────────────────
  const _exit = (mode) => {
    const controls = RenderSystem.getControls();

    if (mode === 'hero') {
      document.getElementById('hero-overlay').classList.remove('visible');
      SmokeSystem.setActive(false);
    }
    if (mode === 'config') {
      document.getElementById('config-panel').classList.remove('visible');
    }
    if (mode === 'aero') {
      document.getElementById('aero-panel').classList.remove('visible');
      AerodynamicsSystem.setActive(false);
    }
    if (mode === 'explode') {
      ExplodedViewSystem.implode();
    }
    if (mode === 'interior') {
      controls.minDistance = 2;
      controls.maxDistance = 16;
    }
  };

  // ── ENTER MODE ───────────────────────────────
  const _enter = (mode) => {
    const cam = CAMERAS[mode];
    AnimationSystem.tweenCamera(cam.pos, cam.tgt, 1.65);

    switch (mode) {
      case 'hero':
        setTimeout(() => {
          document.getElementById('hero-overlay').classList.add('visible');
          SmokeSystem.setActive(true);
        }, 900);
        break;

      case 'config':
        setTimeout(() =>
          document.getElementById('config-panel').classList.add('visible'),
        450);
        break;

      case 'aero':
        AerodynamicsSystem.setActive(true);
        setTimeout(() =>
          document.getElementById('aero-panel').classList.add('visible'),
        450);
        EventBus.emit('UI_TOAST', { msg: 'SIDE VIEW — STREAMLINE SIMULATION ACTIVE', type: 'info' });
        break;

      case 'explode':
        setTimeout(() => ExplodedViewSystem.explode(), 900);
        EventBus.emit('UI_TOAST', { msg: 'EXPLODED VIEW — DRAG TO ROTATE' });
        break;

      case 'interior':
        const controls = RenderSystem.getControls();
        controls.minDistance = 0.05;
        controls.maxDistance = 0.8;
        EventBus.emit('UI_TOAST', { msg: 'INTERIOR MODE — SCROLL TO LOOK', type: 'info' });
        break;

      default:
        break;
    }
  };

  // ── INIT ─────────────────────────────────────
  const init = () => {
    // Bind mode tab clicks
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTo(btn.dataset.mode));
    });

    // Panel close buttons
    document.querySelectorAll('.panel-close').forEach(btn => {
      btn.addEventListener('click', () => switchTo('orbit'));
    });

    // Auto-rotate toggle
    const arBtn = document.getElementById('auto-rotate-btn');
    arBtn.addEventListener('click', () => {
      const controls = RenderSystem.getControls();
      controls.autoRotate = !controls.autoRotate;
      arBtn.classList.toggle('active', controls.autoRotate);
      EventBus.emit('UI_TOAST', {
        msg:  controls.autoRotate ? 'AUTO-ROTATE ON' : 'AUTO-ROTATE OFF',
        type: controls.autoRotate ? 'ok' : '',
      });
    });
  };

  return { init, switchTo, getMode: () => _currentMode };
})();

export default ModeManager;
