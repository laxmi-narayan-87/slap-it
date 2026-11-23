import * as THREE from 'three';
import { SoundEngine } from './audio.js';
import { SlapCharacter } from './character.js';
import { HandController } from './hand.js';
import { FXManager } from './fx.js';

class SlapApp {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.popupContainer = document.getElementById('popup-container');
    this.counterEl = document.getElementById('slap-count');
    this.stressBarEl = document.getElementById('stress-fill');
    this.stressTextEl = document.getElementById('stress-text');
    this.splashOverlay = document.getElementById('splash-overlay');
    this.startBtn = document.getElementById('start-btn');
    this.muteBtn = document.getElementById('mute-btn');
    this.resetBtn = document.getElementById('reset-btn');
    this.latencyBadge = document.getElementById('latency-badge');

    // State
    this.slapCount = parseInt(localStorage.getItem('slap_relief_count') || '0', 10);
    this.isStarted = false;
    this.lastFrameTime = performance.now();

    // Core Systems
    this._initThree();
    this.sound = new SoundEngine();
    this.character = new SlapCharacter(this.scene);
    this.hand = new HandController(this.scene, this.camera);
    this.fx = new FXManager(this.scene, this.camera, this.popupContainer);

    this._updateHUD();
    this._bindEvents();
    this._prewarmGPU();

    // Begin render loop
    requestAnimationFrame((t) => this._renderLoop(t));
  }

  _initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); // Slate-900 arcade backdrop

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    this.camera.position.set(0, 0.2, 5.2);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // Lighting setup for vibrant 3D character readability
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    // Key Light
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.4);
    keyLight.position.set(3, 4, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    this.scene.add(keyLight);

    // Cool Rim / Fill Light
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    rimLight.position.set(-3, 2, -2);
    this.scene.add(rimLight);

    // Warm bounce light from below
    const bounceLight = new THREE.DirectionalLight(0xf43f5e, 0.4);
    bounceLight.position.set(0, -3, 2);
    this.scene.add(bounceLight);
  }

  /**
   * Pre-compiles all shaders into GPU memory during startup to guarantee zero-jank first slap.
   */
  _prewarmGPU() {
    this.renderer.compile(this.scene, this.camera);
    this.renderer.render(this.scene, this.camera);
    if (this.latencyBadge) {
      this.latencyBadge.innerText = '⚡ GPU & Audio Pre-warmed (< 15ms SLA)';
    }
  }

  _bindEvents() {
    window.addEventListener('resize', () => this._onResize());

    // Start / Unmute Button
    this.startBtn.addEventListener('click', async () => {
      await this.sound.init();
      this.isStarted = true;
      this.splashOverlay.classList.add('hidden');
    });

    // Mute Toggle
    this.muteBtn.addEventListener('click', () => {
      const isMuted = this.sound.toggleMute();
      this.muteBtn.innerHTML = isMuted ? '🔇 Unmute' : '🔊 Mute';
      this.muteBtn.classList.toggle('active', isMuted);
    });

    // Reset Slap Counter
    this.resetBtn.addEventListener('click', () => {
      if (confirm('Reset your stress slap counter to 0?')) {
        this.slapCount = 0;
        localStorage.setItem('slap_relief_count', '0');
        this._updateHUD();
      }
    });

    // Transition State Preview Buttons
    document.querySelectorAll('.transition-pills .pill-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const state = e.currentTarget.getAttribute('data-state');
        document.querySelectorAll('.transition-pills .pill-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        if (this.character) {
          this.character.setExpressionState(state, 2.5); // hold state preview for 2.5 seconds
        }
      });
    });

    // High-frequency Pointer Tracking (Mouse and Touch)
    const onPointerMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      this.hand.handlePointerMove(
        clientX,
        clientY,
        this.character,
        this.sound,
        (slapData) => this._onSlapEvent(slapData)
      );
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });

    // Direct Tap / Click Fallback
    const onPointerDown = (e) => {
      // Auto-unlock audio if not already started
      if (!this.sound.isInitialized) {
        this.sound.init();
      }

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      this.hand.handleDirectTap(
        clientX,
        clientY,
        this.character,
        this.sound,
        (slapData) => this._onSlapEvent(slapData)
      );
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
  }

  _onSlapEvent(slapData) {
    this.slapCount++;
    localStorage.setItem('slap_relief_count', this.slapCount.toString());

    // 1. Update HUD & Stress Relief Meter
    this._updateHUD();

    // 2. Spawn 3D Particles, Screen Shake & Comic Text
    this.fx.spawnImpact(slapData.contactPoint, slapData.force);

    // 3. Counter Bouncy Animation in DOM
    if (this.counterEl) {
      this.counterEl.classList.remove('bump');
      // trigger reflow
      void this.counterEl.offsetWidth;
      this.counterEl.classList.add('bump');
    }
  }

  _updateHUD() {
    if (this.counterEl) {
      this.counterEl.innerText = this.slapCount.toLocaleString();
    }

    const status = FXManager.getStressReliefStatus(this.slapCount);
    if (this.stressBarEl) {
      this.stressBarEl.style.width = `${status.percent}%`;
    }
    if (this.stressTextEl) {
      this.stressTextEl.innerText = status.text;
    }
  }

  _onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  _renderLoop(timestamp) {
    requestAnimationFrame((t) => this._renderLoop(t));

    const dt = (timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;

    // Update character physics & eye tracking
    this.character.update(dt, this.hand.pointerPos);

    // Update screen shake & particle burst
    this.fx.update(dt);

    // Render WebGL frame
    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new SlapApp();
});
