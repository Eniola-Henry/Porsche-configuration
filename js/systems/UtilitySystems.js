import EventBus from '../core/EventBus.js';
import * as THREE from 'three';

// ─────────────────────────────────────────────
// EXPLODED VIEW SYSTEM
// ─────────────────────────────────────────────
export const ExplodedViewSystem = (() => {
  const _groups   = [];
  let _exploded   = false;

  const PART_DEFS = [
    { keywords: ['engine','motor','turbo'],                  label: 'FLAT-6 TURBO',    dir: new THREE.Vector3(0, 1.0, -1.4) },
    { keywords: ['wheel','tire','tyre','rim','reifen','felge'], label: 'BBS WHEELS',   dir: new THREE.Vector3(1.6, 0, 0) },
    { keywords: ['hood','bonnet','haube'],                   label: 'CARBON HOOD',     dir: new THREE.Vector3(0, 1.4, 1.1) },
    { keywords: ['door','tuer'],                             label: 'DOOR PANEL',      dir: new THREE.Vector3(1.5, 0.2, 0) },
    { keywords: ['spoiler','wing','diffuser'],               label: 'RWB WING',        dir: new THREE.Vector3(0, 1.2, -1.0) },
    { keywords: ['bumper','front','stossfaenger'],           label: 'AERO BUMPER',     dir: new THREE.Vector3(0, 0.2, 1.5) },
    { keywords: ['exhaust','auspuff','muffler'],             label: 'EXHAUST',         dir: new THREE.Vector3(-0.5, 0, -1.1) },
    { keywords: ['glass','windshield','windscreen','fenster'], label: 'GLAZING',       dir: new THREE.Vector3(0, 0.8, 0.3) },
  ];

  const init = (meshes) => {
    meshes.forEach(m => {
      const n = (m.name || '').toLowerCase();
      let matched = false;
      for (const def of PART_DEFS) {
        if (def.keywords.some(k => n.includes(k))) {
          let grp = _groups.find(g => g.label === def.label);
          if (!grp) {
            grp = { label: def.label, meshes: [], origins: [], dir: def.dir };
            _groups.push(grp);
          }
          grp.meshes.push(m);
          grp.origins.push(m.position.clone());
          matched = true;
          break;
        }
      }
      if (!matched) {
        let chassis = _groups.find(g => g.label === 'CHASSIS');
        if (!chassis) {
          chassis = { label: 'CHASSIS', meshes: [], origins: [], dir: new THREE.Vector3(0, -0.3, 0) };
          _groups.push(chassis);
        }
        chassis.meshes.push(m);
        chassis.origins.push(m.position.clone());
      }
    });
  };

  const explode = () => {
    if (_exploded) return;
    _exploded = true;
    const mag = 0.85;
    _groups.forEach((grp, i) => {
      grp.meshes.forEach(m => {
        gsap.to(m.position, {
          x: m.position.x + grp.dir.x * mag,
          y: m.position.y + grp.dir.y * mag,
          z: m.position.z + grp.dir.z * mag,
          duration: 1.6,
          ease: 'power3.out',
          delay: i * 0.06,
        });
      });
    });
  };

  const implode = () => {
    if (!_exploded) return;
    _exploded = false;
    _groups.forEach((grp, i) => {
      grp.meshes.forEach((m, j) => {
        gsap.to(m.position, {
          x: grp.origins[j].x,
          y: grp.origins[j].y,
          z: grp.origins[j].z,
          duration: 1.3,
          ease: 'power3.inOut',
          delay: i * 0.04,
        });
      });
    });
  };

  const isExploded = () => _exploded;

  return { init, explode, implode, isExploded };
})();


// ─────────────────────────────────────────────
// PERFORMANCE MONITOR
// Adaptive quality scaling to maintain 60 FPS.
// ─────────────────────────────────────────────
export const PerformanceMonitor = (() => {
  let _frames    = 0;
  let _last      = performance.now();
  let _fps       = 60;
  let _quality   = 1.0;
  let _fpsEl, _setPixelRatio;

  const init = (fpsEl, setPixelRatioFn) => {
    _fpsEl = fpsEl;
    _setPixelRatio = setPixelRatioFn;
  };

  const tick = () => {
    _frames++;
    const now = performance.now();
    if (now - _last >= 1000) {
      _fps    = Math.round(_frames * 1000 / (now - _last));
      _frames = 0;
      _last   = now;

      if (_fpsEl) {
        _fpsEl.textContent = _fps;
        _fpsEl.className = _fps >= 50 ? '' : _fps >= 30 ? 'warn' : 'crit';
      }

      // Adaptive quality
      if (_fps < 28 && _quality > 0.5) {
        _quality = Math.max(0.5, _quality - 0.15);
        _setPixelRatio?.(_quality * window.devicePixelRatio);
      } else if (_fps > 55 && _quality < 1.0) {
        _quality = Math.min(1.0, _quality + 0.05);
        _setPixelRatio?.(_quality * window.devicePixelRatio);
      }
    }
  };

  const getFPS = () => _fps;
  return { init, tick, getFPS };
})();


// ─────────────────────────────────────────────
// SMOKE SYSTEM
// Canvas 2D smoke particles for Hero mode.
// ─────────────────────────────────────────────
export const SmokeSystem = (() => {
  let _canvas, _ctx, _particles = [], _active = false;

  const init = () => {
    _canvas = document.getElementById('smoke-canvas');
    _ctx    = _canvas.getContext('2d');
    _resize();
    window.addEventListener('resize', _resize);
  };

  const _resize = () => {
    _canvas.width  = window.innerWidth;
    _canvas.height = window.innerHeight;
  };

  const _spawn = () => ({
    x:       window.innerWidth  * 0.38 + (Math.random() - 0.5) * 220,
    y:       window.innerHeight * 0.62 + (Math.random() - 0.5) * 50,
    vx:      (Math.random() - 0.5) * 0.4,
    vy:      -0.28 - Math.random() * 0.35,
    r:       18 + Math.random() * 28,
    opacity: 0.12 + Math.random() * 0.10,
    life:    0,
    maxLife: 160 + Math.random() * 100,
  });

  const tick = () => {
    if (!_active) return;
    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);

    if (Math.random() < 0.35) _particles.push(_spawn());
    if (_particles.length > 55) _particles.splice(0, 4);
    _particles = _particles.filter(p => p.life < p.maxLife);

    _particles.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.r  += 0.18;
      p.life++;
      const a = p.opacity * (1 - p.life / p.maxLife);
      const g = _ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(200,200,200,${a})`);
      g.addColorStop(1, 'rgba(200,200,200,0)');
      _ctx.beginPath();
      _ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      _ctx.fillStyle = g;
      _ctx.fill();
    });
  };

  const setActive = (val) => {
    _active = val;
    _canvas.classList.toggle('visible', val);
    if (!val) { _ctx.clearRect(0, 0, _canvas.width, _canvas.height); _particles = []; }
  };

  return { init, tick, setActive };
})();
