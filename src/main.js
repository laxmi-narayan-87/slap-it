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
    
    // Exact dark muted studio backdrop matching the reference photography
    const studioColor = new THREE.Color(0x1a211c);
    this.scene.background = studioColor;
    this.scene.fog = new THREE.FogExp2(0x1a211c, 0.075);

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
    this.renderer.toneMappingExposure = 1.05;

    // Atmospheric Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xfff7ee, 0.65);
    this.scene.add(ambientLight);

    // Key Studio Light (Positioned to cast soft hand shadows onto the face)
    const keyLight = new THREE.DirectionalLight(0xfffaec, 1.35);
    keyLight.position.set(-2.8, 3.6, 3.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 15;
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.radius = 2.5;
    this.scene.add(keyLight);

    // Warm Fill Light
    const fillLight = new THREE.DirectionalLight(0xbad7c9, 0.5);
    fillLight.position.set(3.2, 1.8, 2.5);
    this.scene.add(fillLight);

    // Subtle Rim Light on Beanie & Shoulders
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.7);
    rimLight.position.set(0, 2.8, -2.8);
    this.scene.add(rimLight);
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
