import * as THREE from 'three';
import EventBus from '../core/EventBus.js';
import EntityManager from '../core/EntityManager.js';
import RenderSystem from './RenderSystem.js';

// ─────────────────────────────────────────────
// INPUT MANAGER
// Converts raw DOM input → abstract events only.
// No logic. No animation. No raycasting.
// ─────────────────────────────────────────────
export const InputManager = (() => {
  const init = (domElement) => {
    const toNDC = (clientX, clientY) => ({
      x:  (clientX / window.innerWidth)  * 2 - 1,
      y: -(clientY / window.innerHeight) * 2 + 1,
    });

    domElement.addEventListener('click', e => {
      EventBus.emit('INPUT_CLICK', { ndc: toNDC(e.clientX, e.clientY) });
    });

    domElement.addEventListener('mousemove', e => {
      EventBus.emit('INPUT_MOUSEMOVE', { ndc: toNDC(e.clientX, e.clientY) });
    });

    window.addEventListener('keydown', e => {
      EventBus.emit('INPUT_KEY', { key: e.key, code: e.code });
    });
  };

  return { init };
})();


// ─────────────────────────────────────────────
// INTERACTION SYSTEM
// Flow: InputEvent → Raycaster → EntityHit → INTERACT emit
// ─────────────────────────────────────────────
export const InteractionSystem = (() => {
  const raycaster = new THREE.Raycaster();
  const _vec2     = new THREE.Vector2();

  const init = () => {
    // Click → raycast → find entity → emit INTERACT
    EventBus.on('INPUT_CLICK', ({ ndc }) => {
      _vec2.set(ndc.x, ndc.y);
      raycaster.setFromCamera(_vec2, RenderSystem.getCamera());

      const hits = raycaster.intersectObjects(RenderSystem.getMeshes(), false);
      if (!hits.length) return;

      const carEntity = EntityManager.getByName('car');
      if (carEntity) {
        EventBus.emit('INTERACT', {
          entityId: carEntity.id,
          action: 'click',
          hitPoint: hits[0].point,
        });
      }
    });

    // Hover → cursor style only
    EventBus.on('INPUT_MOUSEMOVE', ({ ndc }) => {
      _vec2.set(ndc.x, ndc.y);
      raycaster.setFromCamera(_vec2, RenderSystem.getCamera());
      const hits = raycaster.intersectObjects(RenderSystem.getMeshes(), false);
      const canvas = RenderSystem.getRenderer().domElement;
      canvas.style.cursor = hits.length ? 'crosshair' : 'default';
    });
  };

  return { init };
})();


// ─────────────────────────────────────────────
// ANIMATION SYSTEM
// Driven by FSM_TRANSITION events and ANIM_REQUEST events.
// Never called directly from input.
// ─────────────────────────────────────────────
export const AnimationSystem = (() => {
  const init = () => {
    // React to FSM changes
    EventBus.on('FSM_TRANSITION', ({ id, to }) => {
      document.getElementById('fsm-val').textContent = to.toUpperCase();
    });
  };

  /**
   * Tween camera to a new position/target.
   * @param {{ x,y,z }} pos
   * @param {{ x,y,z }} target
   * @param {number} duration
   */
  const tweenCamera = (pos, target, duration = 1.6) => {
    const camera   = RenderSystem.getCamera();
    const controls = RenderSystem.getControls();

    gsap.to(camera.position, { ...pos, duration, ease: 'power2.inOut' });
    if (target) {
      gsap.to(controls.target, { ...target, duration, ease: 'power2.inOut' });
    }
  };

  return { init, tweenCamera };
})();
