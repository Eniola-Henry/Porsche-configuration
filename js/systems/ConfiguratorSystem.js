import * as THREE from 'three';
import EventBus from '../core/EventBus.js';

/**
 * ConfiguratorSystem
 * Handles real-time PBR material updates:
 * - Body colour
 * - Wheel style
 * - Accessory toggles
 *
 * FIX: better mesh classification, no wide-body hack
 */
const ConfiguratorSystem = (() => {
  let _bodyMeshes  = [];
  let _wheelMeshes = [];
  let _allMeshes   = [];

  const WHEEL_PRESETS = [
    { name: 'OEM DARK',    color: 0x1a1a1a, roughness: 0.55, metalness: 0.45 },
    { name: 'POLISHED',    color: 0xcccccc, roughness: 0.05, metalness: 0.95 },
    { name: 'BRUSHED',     color: 0x555555, roughness: 0.30, metalness: 0.80 },
  ];

  // ── MESH CLASSIFICATION ─────────────────────
  // Keywords for wheels / tires
  const WHEEL_KEYS = [
    'wheel','tire','tyre','rim','reifen','felge',
    'rad','disc','brake','rotor',
  ];
  // Keywords to skip when painting body
  const SKIP_KEYS = [
    'glass','window','windshield','windscreen',
    'light','lamp','lens','indicator','headlight','taillight',
    'interior','seat','carpet','dash','gauge',
    'rubber','chrome','exhaust',
  ];

  const _isWheelMesh = (name) =>
    WHEEL_KEYS.some(k => name.includes(k));

  const _isSkipMesh = (name) =>
    SKIP_KEYS.some(k => name.includes(k));

  // ── INIT ─────────────────────────────────────
  const init = (meshes) => {
    _allMeshes = meshes;

    meshes.forEach(m => {
      const n = (m.name || '').toLowerCase();
      if (_isWheelMesh(n)) {
        _wheelMeshes.push(m);
      } else if (!_isSkipMesh(n)) {
        _bodyMeshes.push(m);
      }
    });

    // Fallback: if nothing was classified as body, use everything non-wheel
    if (_bodyMeshes.length === 0) {
      _bodyMeshes = meshes.filter(m => !_wheelMeshes.includes(m));
    }

    console.log(`[Configurator] body: ${_bodyMeshes.length}, wheels: ${_wheelMeshes.length}`);

    // Listen for config events
    EventBus.on('CONFIG_COLOR',  ({ color })  => _applyBodyColor(color));
    EventBus.on('CONFIG_WHEEL',  ({ style })  => _applyWheelPreset(style));
    EventBus.on('CONFIG_TOGGLE', ({ key, val }) => _handleToggle(key, val));
  };

  // ── BODY COLOUR ──────────────────────────────
  const _applyBodyColor = (hexStr) => {
    const col = new THREE.Color(hexStr);
    _bodyMeshes.forEach(m => {
      _forEachMaterial(m, mat => {
        if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
          mat.color.set(col);
          mat.needsUpdate = true;
        }
      });
    });
    _showToast('COLOUR APPLIED');
  };

  // ── WHEEL STYLE ──────────────────────────────
  const _applyWheelPreset = (idx) => {
    const preset = WHEEL_PRESETS[idx];
    if (!preset) return;
    const col = new THREE.Color(preset.color);
    _wheelMeshes.forEach(m => {
      _forEachMaterial(m, mat => {
        mat.color.set(col);
        mat.roughness  = preset.roughness;
        mat.metalness  = preset.metalness;
        mat.needsUpdate = true;
      });
    });
    _showToast(`WHEELS: ${preset.name}`);
  };

  // ── TOGGLE ───────────────────────────────────
  const _handleToggle = (key, val) => {
    if (key === 'lights') {
      let found = 0;
      _allMeshes.forEach(m => {
        const n = (m.name || '').toLowerCase();
        if (n.includes('light') || n.includes('lamp') ||
            n.includes('led')   || n.includes('lens')) {
          m.visible = val;
          found++;
        }
      });
      _showToast(found > 0
        ? `LIGHTS ${val ? 'ON' : 'OFF'}`
        : 'NO LIGHT MESHES FOUND', 'info');
    }
  };

  // ── HELPERS ──────────────────────────────────
  const _forEachMaterial = (mesh, fn) => {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach(mat => { if (mat) fn(mat); });
  };

  const _showToast = (msg, type = '') => {
    EventBus.emit('UI_TOAST', { msg, type });
  };

  return { init };
})();

export default ConfiguratorSystem;
