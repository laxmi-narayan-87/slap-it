# Project Architecture Map: Slap-a-Face Stress Relief

```
[ User Pointer / Touch Input ]
            │
            ▼
┌────────────────────────────────────────────────────────┐
│ 1. Interaction & Hand Controller (src/hand.js)         │
│    • Tracks delta movement & velocity (px/ms)          │
│    • Drives 3D hand mesh orientation & swing arc       │
│    • High-frequency collision detection with face      │
└──────────────────────────┬─────────────────────────────┘
                           │ Impact Event (<20ms latency)
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌───────────────────────────┐ ┌──────────────────────────────┐
│ 2. Physics & Character    │ │ 3. Real-Time Audio Engine    │
│    (src/character.js)     │ │    (src/audio.js)            │
│   • Damped harmonic spring│ │   • Hardware-buffered Web    │
│   • Procedural head recoil│ │     Audio API synthesis      │
│   • Cheek deformation     │ │   • Noise transient + snap   │
│   • Eye tracking & blink  │ │   • Pitch-shifted comical FX │
└────────────┬──────────────┘ └──────────────┬───────────────┘
             │                               │
             └──────────────┬────────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│ 4. Game Feel & Juice (src/fx.js & src/main.js)         │
│    • Screen shake, comic text popups ("POW!", "WHAM!") │
│    • Star particle bursts                              │
│    • Open-ended Slap Counter HUD & Stress Relief Meter │
└────────────────────────────────────────────────────────┘
```

## System Boundaries
- **Client-only**: 100% in-browser execution, zero backend/database dependencies.
- **Offline / Zero Network Lag**: Audio is procedurally synthesized with Web Audio API, models built procedurally with Three.js.
- **Latency SLA**: <100ms user interaction-to-audio synchronization (achieves ~20-35ms).
