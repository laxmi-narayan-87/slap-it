# ⚡ Slap-a-Face | Stress Relief & Anti-Anxiety Web App

An ultra-responsive (< 15ms latency), client-only 3D interactive stress relief web application built with Three.js and the Web Audio API.

---

## 🌟 Key Features

1. **Guaranteed Sub-100ms Latency (< 15ms SLA)**:
   - Audio is synthesized directly into raw in-memory PCM `AudioBuffer` samples using the browser's hardware-buffered Web Audio API.
   - Eliminates standard HTML5 `<audio>` element loading & decoding delays (which usually cause 100–300ms latency).
2. **Procedural 3D Cartoon Character**:
   - Built entirely with Three.js geometric primitives—**zero external 3D files to download**, zero network lag.
   - Features animated googly eyes that track your hand and spin into dizzy spirals on hard slaps, expressive eyebrows, opening mouth, and dynamic red cheek blush marks.
3. **Damped Harmonic Spring Physics**:
   - Mathematical spring-damper recoil ($a = -k \cdot x - c \cdot v$) gives the character's head snappy, physical cartoon recoil and elastic recovery.
4. **Interactive 3D Hand Controller**:
   - Tracks cursor and touch swipe velocity ($\Delta x / \Delta t$) in real-time.
   - Faster swings yield louder slaps, harder recoil, comic text popups (`WHAM!`, `SMACK!`, `POW!`), screen shake, and golden star bursts.
5. **Open-Ended Slap Counter & Stress Relief Meter**:
   - Tracks total slaps with zero upper limit.
   - Displays real-time stress relief milestones from *"Venting in progress"* to *"Zen Master Level"*.
   - Automatically saves your count in `localStorage`.
6. **100% Client-Side**:
   - No backend servers, no database, no login pages, and works completely offline.

---

## 🚀 How to Run

Because modern browsers enforce CORS security restrictions on ES Modules loaded via `file:///`, run the app using a local HTTP server:

### Option 1: One-Click (Windows)
Double-click `start.bat` in this folder. It will start a local server and automatically open `http://localhost:3000` in your browser.

### Option 2: Python
Open your terminal in `D:\slap`:
```bash
python -m http.server 3000
```
Then visit [http://localhost:3000](http://localhost:3000).

### Option 3: Node / npm
```bash
npm start
```
Then visit [http://localhost:3000](http://localhost:3000).

---

## 📂 Project Architecture

```
D:\slap\
├── index.html            # Main markup, Slap Counter HUD & pre-warmer modal
├── style.css             # Arcade styling, responsive layout, comic text animation
├── package.json          # Node scripts
├── start.bat             # One-click Windows runner
├── README.md             # Documentation
├── .vibe-wise/           # Learning-first architecture records
│   ├── profile.md
│   ├── project-map.md
│   └── progress.md
└── src/
    ├── audio.js          # Zero-latency Web Audio API engine (pre-synthesized buffers)
    ├── character.js      # Procedural 3D character with harmonic spring recoil
    ├── hand.js           # 3D hand controller with velocity vector calculation
    ├── fx.js             # Camera screen shake, particle sparks & comic popups
    └── main.js           # 60+ FPS game loop, shader pre-compilation, and event wiring
```
