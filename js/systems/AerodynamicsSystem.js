import * as THREE from 'three';

/**
 * AerodynamicsSystem
 * GPU-based particle streamlines that flow along the car's
 * longitudinal axis (front → rear). Best viewed from the side.
 *
 * FIX: particles now flow along Z axis (car length), not scattered.
 */
const AerodynamicsSystem = (() => {
  let _particleSystem = null;
  let _active         = false;
  const COUNT         = 4000;

  // ── VERTEX SHADER ──────────────────────────
  // Each particle flows from front (+Z) to rear (-Z)
  // Height and lateral position define which "streamline" it follows
  const VERT = `
    attribute float aLife;
    attribute float aSpeed;
    attribute float aHeight;
    attribute float aLateral;

    uniform float uTime;
    uniform float uOpacity;

    varying float vAlpha;
    varying float vT;

    #define PI 3.14159265

    void main() {
      // t: 0 = front nose, 1 = past rear
      float t = mod(uTime * aSpeed * 0.22 + aLife, 1.0);

      // ── Z: front (+2.6) → rear (-3.2) ──
      float z = mix(2.6, -3.2, t);

      // ── X: slight lateral spread, wider near body edge ──
      float x = aLateral * 0.95;

      // ── Y: follow car silhouette profile + small offset ──
      // Profile: front bumper ~0.55, hood ~0.75, roof ~1.25, rear deck ~0.90, tail ~0.55
      float profile =
        0.55
        + 0.70 * sin(clamp(t, 0.0, 1.0) * PI * 0.85 + 0.12)
        - 0.08 * sin(t * PI * 2.2);

      // Underbody particles hug the floor
      float y;
      if (aHeight < 0.0) {
        y = 0.02 + (-aHeight) * 0.14;
      } else {
        y = profile * aHeight + (1.0 - aHeight) * 0.08;
      }

      // ── Wake turbulence past rear ──
      float wake = smoothstep(0.78, 1.0, t);
      float wt   = (t - 0.78) / 0.22;
      y += sin(uTime * 9.0 + aLife * 18.0) * wake * 0.10;
      x += cos(uTime * 6.5 + aLife * 12.0) * wake * 0.08;

      vec4 mvPos = modelViewMatrix * vec4(x, y, z, 1.0);
      gl_Position = projectionMatrix * mvPos;

      // ── Alpha: fade in at nose, fade out at tail ──
      float fade = sin(t * PI);
      vAlpha = fade * uOpacity * 0.85;
      vT = t;

      float dist = max(-mvPos.z, 0.5);
      gl_PointSize = max(1.2, (2.2 + aSpeed * 2.0) * (220.0 / dist));
    }
  `;

  // ── FRAGMENT SHADER ────────────────────────
  const FRAG = `
    varying float vAlpha;
    varying float vT;

    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);
      if (d > 0.5) discard;

      float softness = 1.0 - d * 2.0;
      float alpha    = softness * softness * vAlpha;

      // Colour gradient: deep blue → cyan → near-white at high speed
      vec3 col = mix(
        vec3(0.10, 0.45, 1.00),
        vec3(0.65, 0.92, 1.00),
        vT * 0.7
      );

      gl_FragColor = vec4(col, alpha);
    }
  `;

  // ── BUILD GEOMETRY ─────────────────────────
  const _buildGeometry = () => {
    const life    = new Float32Array(COUNT);
    const speed   = new Float32Array(COUNT);
    const height  = new Float32Array(COUNT);
    const lateral = new Float32Array(COUNT);
    const pos     = new Float32Array(COUNT * 3); // dummy positions

    for (let i = 0; i < COUNT; i++) {
      life[i]  = Math.random();
      speed[i] = 0.28 + Math.random() * 0.72;

      // Height: negative = underbody, 0–1 = surface to above roof
      const zone = Math.random();
      if (zone < 0.12) {
        // Underbody
        height[i]  = -(0.05 + Math.random() * 0.6);
        lateral[i] = (Math.random() - 0.5) * 1.2;
      } else if (zone < 0.55) {
        // Top / over the car
        height[i]  = 0.55 + Math.random() * 0.45;
        lateral[i] = (Math.random() - 0.5) * 0.5;
      } else {
        // Sides — wider spread
        height[i]  = 0.1 + Math.random() * 0.75;
        lateral[i] = (Math.random() > 0.5 ? 1 : -1) * (0.85 + Math.random() * 0.4);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos,     3));
    geo.setAttribute('aLife',    new THREE.BufferAttribute(life,    1));
    geo.setAttribute('aSpeed',   new THREE.BufferAttribute(speed,   1));
    geo.setAttribute('aHeight',  new THREE.BufferAttribute(height,  1));
    geo.setAttribute('aLateral', new THREE.BufferAttribute(lateral, 1));
    return geo;
  };

  // ── INIT ───────────────────────────────────
  const init = (scene) => {
    const geo = _buildGeometry();
    const mat = new THREE.ShaderMaterial({
      vertexShader:   VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:    { value: 0 },
        uOpacity: { value: 0 },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    });

    _particleSystem = new THREE.Points(geo, mat);
    scene.add(_particleSystem);
  };

  // ── UPDATE (called each frame) ─────────────
  const update = (dt) => {
    if (!_particleSystem || !_active) return;
    _particleSystem.material.uniforms.uTime.value += dt;
  };

  // ── TOGGLE ─────────────────────────────────
  const setActive = (val) => {
    _active = val;
    if (!_particleSystem) return;
    gsap.to(_particleSystem.material.uniforms.uOpacity, {
      value: val ? 1.0 : 0.0,
      duration: 1.1,
    });
  };

  return { init, update, setActive };
})();

export default AerodynamicsSystem;
