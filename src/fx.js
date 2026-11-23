import * as THREE from 'three';

/**
 * Visual Effects & Juice System
 * Handles 3D particle bursts, camera screen shake, and comic impact DOM popups.
 */
export class FXManager {
  constructor(scene, camera, containerElement) {
    this.scene = scene;
    this.camera = camera;
    this.container = containerElement;

    // Camera Screen Shake State
    this.shakeIntensity = 0;
    this.cameraBasePos = camera.position.clone();

    // 3D Star / Spark Particle Pool
    this.particles = [];
    this._initParticlePool();

    // Comic Onomatopoeia Text Bank
    this.comicWords = ['WHAM!', 'SLAP!', 'POW!', 'SMACK!', 'CRACK!', 'BOOM!', 'ZAP!'];
    this.comicColors = ['#ff3366', '#ffaa00', '#00e5ff', '#ff0055', '#76ff03', '#ffd600'];
  }

  _initParticlePool() {
    const starGeo = new THREE.BufferGeometry();
    const starCount = 60;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = -999; // off-screen initially

      // Golden yellow / orange sparkles
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.85 + Math.random() * 0.15;
      colors[i * 3 + 2] = 0.1;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Simple procedural circular point texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    const starTexture = new THREE.CanvasTexture(canvas);

    this.particleMat = new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      map: starTexture,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.pointCloud = new THREE.Points(starGeo, this.particleMat);
    this.scene.add(this.pointCloud);

    // Array of particle physics data
    this.particleData = Array.from({ length: starCount }, () => ({
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: 0.5
    }));
  }

  /**
   * Spawns an impactful burst of juice on slap collision.
   */
  spawnImpact(contactPoint, force) {
    // 1. Trigger Screen Shake
    this.shakeIntensity = Math.min(0.24, 0.08 + force * 0.06);

    // 2. Emit 3D Sparks & Stars
    this._burstParticles(contactPoint, force);

    // 3. Spawn Animated Comic Text Popup
    this._spawnComicText(contactPoint, force);
  }

  _burstParticles(origin, force) {
    const posAttr = this.pointCloud.geometry.attributes.position;
    const burstCount = Math.min(35, Math.floor(15 + force * 8));

    this.particleMat.opacity = 1.0;

    for (let i = 0; i < burstCount; i++) {
      const p = this.particleData[i];
      posAttr.setXYZ(i, origin.x, origin.y, origin.z);

      // Random spherical explosion vector
      const phi = Math.random() * Math.PI * 2;
      const theta = (Math.random() - 0.5) * Math.PI;
      const speed = (2.5 + Math.random() * 4.0) * force;

      p.velocity.set(
        Math.cos(phi) * Math.cos(theta) * speed,
        Math.sin(theta) * speed + 1.5, // upward bias
        Math.sin(phi) * Math.cos(theta) * speed + 0.5
      );

      p.life = 0;
      p.maxLife = 0.35 + Math.random() * 0.3;
    }

    posAttr.needsUpdate = true;
  }

  _spawnComicText(contactPoint3D, force) {
    if (!this.container) return;

    // Convert 3D world pos to screen 2D coordinates
    const screenVec = contactPoint3D.clone().project(this.camera);
    const x = ((screenVec.x + 1) * window.innerWidth) / 2;
    const y = ((-screenVec.y + 1) * window.innerHeight) / 2;

    const el = document.createElement('div');
    el.className = 'comic-popup';

    // Pick random word and vibrant comic color
    const word = this.comicWords[Math.floor(Math.random() * this.comicWords.length)];
    const color = this.comicColors[Math.floor(Math.random() * this.comicColors.length)];
    const rotation = (Math.random() - 0.5) * 40; // degrees

    el.innerText = word;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color;
    el.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(${0.7 + force * 0.4})`;

    this.container.appendChild(el);

    // Remove element after CSS animation completes
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 600);
  }

  /**
   * Updates screen shake and particle simulation.
   */
  update(dt) {
    const step = Math.min(dt, 0.05);

    // --- Screen Shake Decay ---
    if (this.shakeIntensity > 0.001) {
      const offsetX = (Math.random() * 2 - 1) * this.shakeIntensity;
      const offsetY = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.camera.position.x = this.cameraBasePos.x + offsetX;
      this.camera.position.y = this.cameraBasePos.y + offsetY;
      // Exponential decay
      this.shakeIntensity *= Math.pow(0.04, step);
    } else {
      this.camera.position.copy(this.cameraBasePos);
      this.shakeIntensity = 0;
    }

    // --- Particle Animation ---
    const posAttr = this.pointCloud.geometry.attributes.position;
    let anyActive = false;

    for (let i = 0; i < this.particleData.length; i++) {
      const p = this.particleData[i];
      if (p.life < p.maxLife) {
        anyActive = true;
        p.life += step;

        // Apply gravity and velocity
        p.velocity.y -= 9.8 * step;
        const currentX = posAttr.getX(i) + p.velocity.x * step;
        const currentY = posAttr.getY(i) + p.velocity.y * step;
        const currentZ = posAttr.getZ(i) + p.velocity.z * step;

        posAttr.setXYZ(i, currentX, currentY, currentZ);
      }
    }

    if (anyActive) {
      posAttr.needsUpdate = true;
      this.particleMat.opacity = Math.max(0, this.particleMat.opacity - step * 1.8);
    }
  }

  /**
   * Helper that translates slap count into stress relief title and percentage.
   */
  static getStressReliefStatus(count) {
    if (count === 0) return { percent: 0, text: 'Stress Level: High 😫' };
    if (count < 5) return { percent: 10, text: 'Vent in progress... 😤' };
    if (count < 15) return { percent: 25, text: 'Tension easing up... 😌' };
    if (count < 30) return { percent: 50, text: 'Blood pressure dropping 📉' };
    if (count < 60) return { percent: 75, text: 'Feeling much calmer 🍃' };
    if (count < 100) return { percent: 90, text: 'Pure Serenity 🧘' };
    return { percent: 100, text: 'Zen Master Level Achieved ✨' };
  }
}
