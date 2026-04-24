# 🚗 RWB 911 — Interactive 3D Platform

**Crafted by Eli Henry**

A production-grade, modular 3D car configurator and viewer built on Three.js with a full ECS architecture, GPU aerodynamics simulation, and six interactive experience modes.

---

## ✨ Features

| Mode | Description |
|---|---|
| **ORBIT** | Default free-orbit view with damped controls |
| **HERO** | Dramatic rear angle · PORSCHE branding · Smoke FX |
| **CONFIG** | Real-time body colour, wheels, options |
| **AERO** | GPU streamline simulation (4,000 particles) · Side view |
| **EXPLODE** | Animated component separation with part labels |
| **INTERIOR** | Camera transitions inside the cabin |

---

## 🗂 Project Structure

```
rwb911/
├── index.html              ← Entry point + HTML structure
├── css/
│   └── style.css           ← All UI styling (glass morphism, animations)
├── js/
│   ├── core/
│   │   ├── EventBus.js     ← Centralized pub/sub (zero coupling)
│   │   ├── FSM.js          ← Finite State Machine engine
│   │   └── EntityManager.js← ECS-lite entity registry
│   ├── systems/
│   │   ├── RenderSystem.js ← Three.js: scene, camera, lights, controls
│   │   ├── InteractionAnimationSystems.js ← Input, Raycasting, Animation
│   │   ├── AerodynamicsSystem.js          ← GPU vertex shader particles
│   │   ├── ConfiguratorSystem.js          ← PBR material editing
│   │   ├── UtilitySystems.js              ← Explode, FPS monitor, Smoke
│   │   └── ModeManager.js                 ← Coordinates mode switching
│   └── main.js             ← Bootstrap + main loop
├── assets/
│   └── porsche_911_rauh-welt_free.glb  ← ⚠ YOU MUST PLACE THIS HERE
└── README.md
```

---

## 🚀 Local Development

### Option A — VS Code Live Server (Recommended)

1. Install the **Live Server** extension in VS Code
2. Open the `rwb911/` folder
3. Place your GLB file at `assets/porsche_911_rauh-welt_free.glb`
4. Right-click `index.html` → **Open with Live Server**
5. Opens at `http://127.0.0.1:5500`

> **Why a server?** ES modules (`import/export`) and GLB file loading require HTTP — they won't work from `file://` directly.

### Option B — Python HTTP Server

```bash
cd rwb911
python3 -m http.server 8080
# Open http://localhost:8080
```

### Option C — Node.js (npx serve)

```bash
cd rwb911
npx serve .
# Opens on http://localhost:3000
```

---

## 📦 GitHub Deployment

### Step 1 — Create the Repository

```bash
# Navigate to project folder
cd rwb911

# Initialize git
git init

# Create .gitignore
echo "*.DS_Store\nnode_modules/\n.env" > .gitignore
```

### Step 2 — Add Your GLB Model

Place `porsche_911_rauh-welt_free.glb` inside the `assets/` folder.

> ⚠️ **GitHub file size limit is 100MB**. GLB files under 100MB can be committed normally.
> If your GLB exceeds 100MB, use **Git LFS** (see below).

**For large GLB files (Git LFS):**

```bash
# Install Git LFS
git lfs install

# Track GLB files
git lfs track "*.glb"
git add .gitattributes
```

### Step 3 — Commit Everything

```bash
git add .
git commit -m "feat: initial RWB 911 interactive platform"
```

### Step 4 — Push to GitHub

```bash
# Create repo on github.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/rwb911.git
git branch -M main
git push -u origin main
```

### Step 5 — Enable GitHub Pages

1. Go to your repo on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **Deploy from a branch**
4. Choose `main` branch, `/ (root)` folder
5. Click **Save**
6. Wait ~60 seconds, then visit:
   ```
   https://YOUR_USERNAME.github.io/rwb911/
   ```

---

## ⚙️ Configuration

### Changing the 3D Model

Update the path in `js/main.js`:

```js
const MODEL_URL = './assets/your-model.glb';
```

### Adjusting Camera Presets

Edit `CAMERAS` in `js/systems/ModeManager.js`:

```js
const CAMERAS = {
  aero: { pos: { x: 8, y: 1.4, z: 0 }, tgt: { x: 0, y: 0.7, z: -0.4 } },
  // ...
};
```

### Aerodynamics Direction

If your car faces the X axis instead of Z, edit the Z-axis flow in `AerodynamicsSystem.js`:

```glsl
// Change this line in the vertex shader:
float z = mix(2.6, -3.2, t);
// To flow along X:
// float x = mix(2.6, -3.2, t);
```

### Adding Body Colours

In `index.html`, add a swatch:

```html
<div class="swatch" data-color="#ff6600" style="background:#ff6600">
  <span class="swatch-name">ORANGE</span>
</div>
```

---

## 🏗 Architecture

```
User Input (click/drag/scroll)
    ↓
InputManager → emits INPUT_CLICK / INPUT_MOUSEMOVE
    ↓
InteractionSystem → Raycaster → finds Entity
    ↓
EventBus.emit('INTERACT', { entityId, action })
    ↓
FSM.transition(action) → state change
    ↓
EventBus.emit('FSM_TRANSITION', { from, to })
    ↓
AnimationSystem → GSAP camera tween
    ↓
RenderSystem.tick() → renderer.render(scene, camera)
```

**Key principle:** No layer talks directly to another. All communication goes through `EventBus`.

---

## 🎨 Customizing the UI

All design tokens are CSS variables in `css/style.css`:

```css
:root {
  --accent:  #e8311a;   /* RWB red */
  --gold:    #c9a84c;   /* accent gold */
  --cyan:    #38bdf8;   /* aero mode colour */
  --display: 'Bebas Neue', cursive;
  --ui:      'Outfit', sans-serif;
  --mono:    'JetBrains Mono', monospace;
}
```

---

## 🛠 Tech Stack

| Library | Version | Purpose |
|---|---|---|
| Three.js | 0.128.0 | WebGL 3D rendering |
| GSAP | 3.12.2 | Camera animations |
| Bebas Neue | — | Display typography |
| Outfit | — | UI typography |
| JetBrains Mono | — | Data readouts |

All loaded via CDN — no build step required.

---

## 🔧 Performance Tips

- Target: **60 FPS** on modern hardware
- Adaptive quality auto-reduces pixel ratio if FPS drops below 28
- Keep textures at **≤ 2048×2048** in your GLB
- Use **Draco compression** when exporting from Blender for smaller file size:
  - In Blender: File → Export → glTF → **Compression: Draco**

---

## 📝 License

MIT — free to use and modify.

---

*RWB 911 Interactive Platform — Crafted by Eli Henry*
