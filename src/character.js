import * as THREE from 'three';

/**
 * Living Photographic 3D Character with Environmental Embedding & Elastic Flesh Physics
 * - Seamless edge feathering & studio backdrop integration (zero rectangular borders).
 * - Real-time elastic vertex deformation (cheek dent, shockwave jiggle, jaw drop).
 * - Living idle emotion: organic breathing, natural micro-blinking, and dynamic gaze tracking.
 * - Reactive proximity flinching: braces and tightens eyelids as the hand approaches.
 * - Damped harmonic cervical spring recoil: angular & linear physical recoil on impact.
 */
export class SlapCharacter {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    // ----------------------------------------------------
    // 1. Spring Physics for Head Recoil & Wobble
    // ----------------------------------------------------
    this.rotation = new THREE.Vector3(0, 0, 0);
    this.rotVelocity = new THREE.Vector3(0, 0, 0);
    this.targetRotation = new THREE.Vector3(0, 0, 0);

    this.position = new THREE.Vector3(0, 0, 0);
    this.posVelocity = new THREE.Vector3(0, 0, 0);
    this.targetPosition = new THREE.Vector3(0, 0, 0);

    this.rotStiffness = 190.0;
    this.rotDamping = 13.5;
    this.posStiffness = 150.0;
    this.posDamping = 15.0;

    // ----------------------------------------------------
    // 2. State Machine & Emotion Management
    // ----------------------------------------------------
    this.currentTextureKey = 'neutral';
    this.nextTextureKey = 'neutral';
    this.transitionProgress = 1.0;
    this.transitionSpeed = 9.0;
    this.stateHoldTimer = 0;

    // Living Idle State (Blinking, Breathing, Emotion)
    this.blinkTimer = 2.5 + Math.random() * 2.0;
    this.blinkProgress = 0;     // 0 = open, 1 = fully closed
    this.isBlinking = false;
    this.breathingTime = 0;
    this.dazeVibration = 0;      // High-frequency head tremor after heavy slap
    this.consecutiveSlaps = 0;
    this.angerLevel = 0;        // 0.0 to 1.0 based on cumulative slaps

    this.leftBlushIntensity = 0;
    this.rightBlushIntensity = 0;

    // Bounding Sphere for Collision
    this.hitRadius = 1.35;
    this.hitCenter = new THREE.Vector3(0, 0.15, 0.1);

    this._generateAlphaMask();
    this._loadTextures();
    this._buildCharacterMesh();
    this._buildStudioBackdrop();
    this.scene.add(this.group);
  }

  /**
   * Generates a feathered radial/box alpha vignette texture.
   * Completely dissolves the rectangular photo borders into the 3D environment.
   */
  _generateAlphaMask() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Fill transparent black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 512, 512);

    // Soft feathered ellipse matching the human silhouette
    const grad = ctx.createRadialGradient(256, 256, 110, 256, 256, 248);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.70, 'rgba(255, 255, 255, 0.98)');
    grad.addColorStop(0.88, 'rgba(255, 255, 255, 0.55)');
    grad.addColorStop(0.97, 'rgba(255, 255, 255, 0.12)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    // Slightly wider at bottom for shoulders/hoodie
    ctx.ellipse(256, 256, 240, 246, 0, 0, Math.PI * 2);
    ctx.fill();

    this.alphaMaskTexture = new THREE.CanvasTexture(canvas);
    this.alphaMaskTexture.generateMipmaps = true;
    this.alphaMaskTexture.minFilter = THREE.LinearMipmapLinearFilter;
  }

  /**
   * Pre-loads all realistic photographic transition states.
   */
  _loadTextures() {
    const loader = new THREE.TextureLoader();
    const load = (path) => {
      const tex = loader.load(path);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      return tex;
    };

    this.textures = {
      neutral: load('assets/neutral.jpg'),
      flinch: load('assets/flinch.jpg'),
      slap_left: load('assets/slap_left.jpg'),
      slap_right: load('assets/slap_right.jpg'),
      heavy_slap_left: load('assets/heavy_slap_left.jpg'),
      heavy_slap_right: load('assets/heavy_slap_right.jpg'),
      dazed: load('assets/dazed.jpg')
    };
  }

  /**
   * Builds the curved 3D facial mesh with interactive vertex arrays for real-time flesh elasticity.
   */
  _buildCharacterMesh() {
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.1, 0);

    // 1. High-Density Curved Facial Plane (64x48 subdivisions = 3,185 interactive vertices)
    this.meshWidth = 3.6;
    this.meshHeight = 2.88;
    this.faceGeo = new THREE.PlaneGeometry(this.meshWidth, this.meshHeight, 64, 48);

    // Compute base anatomical curvature along X & Y
    const pos = this.faceGeo.attributes.position;
    this.vertexCount = pos.count;
    this.basePositions = new Float32Array(this.vertexCount * 3);
    this.vertexVelocities = new Float32Array(this.vertexCount); // Z velocities for flesh bounce
    this.vertexDisplacements = new Float32Array(this.vertexCount); // Current delta Z

    for (let i = 0; i < this.vertexCount; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);

      // Cylindrical skull curvature: edges curve backward into Z depth
      const normX = x / (this.meshWidth * 0.5);
      const zCurve = Math.sqrt(Math.max(0, 1 - normX * normX * 0.75)) * 0.62 - 0.62;

      // Subtle nasal bridge prominence
      const distFromCenter = Math.hypot(x, y + 0.1);
      const noseBulge = Math.exp(-distFromCenter * 3.6) * 0.14;

      const finalZ = zCurve + noseBulge;
      pos.setZ(i, finalZ);

      // Store base coordinate
      this.basePositions[i * 3] = x;
      this.basePositions[i * 3 + 1] = y;
      this.basePositions[i * 3 + 2] = finalZ;
    }
    this.faceGeo.computeVertexNormals();

    // 2. Base Face Material (feathered alpha vignette + PBR shading)
    this.baseMat = new THREE.MeshStandardMaterial({
      map: this.textures.neutral,
      alphaMap: this.alphaMaskTexture,
      transparent: true,
      roughness: 0.68,
      metalness: 0.04,
      depthWrite: true,
      alphaTest: 0.02
    });
    this.faceMesh = new THREE.Mesh(this.faceGeo, this.baseMat);
    this.faceMesh.castShadow = true;
    this.faceMesh.receiveShadow = true;
    this.headGroup.add(this.faceMesh);

    // 3. Crossfade Transition Mesh (smooth expression morphing)
    this.transitionGeo = this.faceGeo.clone();
    this.transitionMat = new THREE.MeshStandardMaterial({
      map: this.textures.neutral,
      alphaMap: this.alphaMaskTexture,
      transparent: true,
      opacity: 0.0,
      roughness: 0.68,
      metalness: 0.04,
      depthWrite: false
    });
    this.transitionMesh = new THREE.Mesh(this.transitionGeo, this.transitionMat);
    this.transitionMesh.position.z = 0.006; // Prevent z-fighting
    this.transitionMesh.receiveShadow = true;
    this.headGroup.add(this.transitionMesh);

    // 4. Solid Beanie Back Shell (gives the head true 3D volume when rotated)
    const beanieBackGeo = new THREE.SphereGeometry(1.48, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.62);
    beanieBackGeo.scale(1.06, 1.16, 0.88);
    const beanieMat = new THREE.MeshStandardMaterial({
      color: 0x14161a,
      roughness: 0.92,
      metalness: 0.0
    });
    const beanieBack = new THREE.Mesh(beanieBackGeo, beanieMat);
    beanieBack.position.set(0, 0.42, -0.42);
    beanieBack.rotation.x = -0.36;
    this.headGroup.add(beanieBack);

    // 5. Dark Torso / Hoodie Base
    const torsoGeo = new THREE.CylinderGeometry(1.25, 1.85, 2.0, 32);
    const hoodieMat = new THREE.MeshStandardMaterial({
      color: 0x101318,
      roughness: 0.88,
      metalness: 0.02
    });
    this.torsoMesh = new THREE.Mesh(torsoGeo, hoodieMat);
    this.torsoMesh.position.set(0, -2.15, -0.28);
    this.torsoMesh.receiveShadow = true;
    this.torsoMesh.castShadow = true;
    this.group.add(this.torsoMesh);

    // 6. Dynamic Red Cheek Flush Overlays (Additive vascular blush)
    const blushGeo = new THREE.PlaneGeometry(0.9, 0.9);
    const makeBlushMat = () => new THREE.MeshBasicMaterial({
      color: 0xff1538,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.leftBlushMat = makeBlushMat();
    this.leftBlushMesh = new THREE.Mesh(blushGeo, this.leftBlushMat);
    this.leftBlushMesh.position.set(0.68, -0.15, 0.08);
    this.leftBlushMesh.rotation.y = -0.25;
    this.headGroup.add(this.leftBlushMesh);

    this.rightBlushMat = makeBlushMat();
    this.rightBlushMesh = new THREE.Mesh(blushGeo, this.rightBlushMat);
    this.rightBlushMesh.position.set(-0.68, -0.15, 0.08);
    this.rightBlushMesh.rotation.y = 0.25;
    this.headGroup.add(this.rightBlushMesh);

    this.group.add(this.headGroup);
  }

  /**
   * Builds an expansive curved studio backdrop that matches the photograph's ambient lighting and tone.
   * Completely embeds the character into a physical studio environment.
   */
  _buildStudioBackdrop() {
    // Large curved studio cyc wall
    const studioGeo = new THREE.CylinderGeometry(14, 14, 16, 48, 1, true, -Math.PI * 0.7, Math.PI * 1.4);
    const studioMat = new THREE.MeshStandardMaterial({
      color: 0x1c241f, // Exact muted dark charcoal/olive tone from reference photo
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.BackSide
    });
    const studioWall = new THREE.Mesh(studioGeo, studioMat);
    studioWall.position.set(0, 0, 0);
    studioWall.receiveShadow = true;
    this.scene.add(studioWall);

    // Soft floor plane
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x141a16,
      roughness: 0.98,
      metalness: 0.0
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  /**
   * Sets photographic expression state with smooth crossfading.
   */
  setExpressionState(stateKey, holdDuration = 0) {
    if (this.currentTextureKey === stateKey && this.nextTextureKey === stateKey) return;
    if (!this.textures[stateKey]) return;

    this.baseMat.map = this.textures[this.nextTextureKey] || this.textures[this.currentTextureKey];
    this.baseMat.needsUpdate = true;

    this.transitionMat.map = this.textures[stateKey];
    this.transitionMat.opacity = 0.0;
    this.transitionMat.needsUpdate = true;

    this.currentTextureKey = this.nextTextureKey;
    this.nextTextureKey = stateKey;
    this.transitionProgress = 0.0;
    this.stateHoldTimer = holdDuration;
  }

  /**
   * Real-Time Proximity Flinching:
   * When the hand approaches rapidly, character tenses up, pulls head back, and squints.
   */
  checkAnticipation(handWorldPos, handSpeed) {
    if (this.stateHoldTimer > 0) return;

    const hitSphere = this.getHitSphere();
    const dist = handWorldPos.distanceTo(hitSphere.center);

    // Proportional flinch: head draws back away from threat
    if (dist < 2.5 && handSpeed > 0.5) {
      const flinchIntensity = Math.min(1.0, (2.5 - dist) / 1.5) * Math.min(1.0, handSpeed);
      this.targetPosition.z = -0.15 * flinchIntensity;
      this.targetPosition.y = -0.05 * flinchIntensity;
      this.setExpressionState('flinch', 0.14);
    } else if (dist > 2.8 && this.nextTextureKey === 'flinch' && this.stateHoldTimer <= 0) {
      this.targetPosition.set(0, 0, 0);
      this.setExpressionState('neutral');
    }
  }

  /**
   * Applies realistic physical impulse & organic elastic flesh deformation.
   */
  applySlapImpulse(swipeDirection, force, hitSide = 'left') {
    const power = THREE.MathUtils.clamp(force, 0.6, 2.8);
    this.consecutiveSlaps++;
    this.angerLevel = Math.min(1.0, this.angerLevel + 0.15 * power);

    // 1. Angular Cervical Impulse (Head whips sharply)
    const yawImpulse = swipeDirection.x * 2.8 * power;
    const pitchImpulse = -Math.abs(swipeDirection.y || 0.25) * 1.4 * power;
    const rollImpulse = -swipeDirection.x * 0.95 * power;

    this.rotVelocity.x += pitchImpulse;
    this.rotVelocity.y += yawImpulse;
    this.rotVelocity.z += rollImpulse;

    // Linear pushback on Z and X
    this.posVelocity.x += swipeDirection.x * 0.42 * power;
    this.posVelocity.y -= 0.15 * power;
    this.posVelocity.z -= 0.48 * power;

    // 2. High-Frequency Head Daze Tremor
    this.dazeVibration = Math.min(1.0, 0.25 + power * 0.35);

    // 3. Elastic Flesh Vertex Deformation:
    // Impart inward dent & ripple impulse to vertices near the impact cheek
    const contactX = hitSide === 'left' ? 0.65 : -0.65;
    const contactY = -0.15;
    this._dentFlesh(contactX, contactY, power);

    // 4. Select Photographic Reaction State
    const isHardSlap = power > 1.6;
    let targetState = 'slap_left';

    if (hitSide === 'left' || swipeDirection.x > 0) {
      targetState = isHardSlap ? 'heavy_slap_left' : 'slap_left';
      this.leftBlushIntensity = Math.min(1.0, this.leftBlushIntensity + 0.45 * power);
    } else {
      targetState = isHardSlap ? 'heavy_slap_right' : 'slap_right';
      this.rightBlushIntensity = Math.min(1.0, this.rightBlushIntensity + 0.45 * power);
    }

    this.setExpressionState(targetState, 0.36);

    // Schedule dazed recovery state
    setTimeout(() => {
      if (this.stateHoldTimer <= 0.08) {
        this.setExpressionState('dazed', 0.5);
      }
    }, 280);
  }

  /**
   * Elastic Flesh Dynamics:
   * Inward displacement & radial shockwave velocity applied directly to mesh vertices.
   */
  _dentFlesh(cx, cy, power) {
    const radius = 0.85;
    for (let i = 0; i < this.vertexCount; i++) {
      const vx = this.basePositions[i * 3];
      const vy = this.basePositions[i * 3 + 1];
      const dist = Math.hypot(vx - cx, vy - cy);

      if (dist < radius) {
        const falloff = Math.exp(-(dist * dist) / (radius * radius * 0.4));
        // Push vertex inward into Z
        this.vertexDisplacements[i] -= 0.38 * power * falloff;
        // Impart spring velocity for natural skin rebound
        this.vertexVelocities[i] -= 22.0 * power * falloff;
      }
    }
  }

  /**
   * Updates spring physics, flesh elasticity, natural blinks, and breathing every frame.
   */
  update(dt, pointerNormalized) {
    const step = Math.min(dt, 0.05);
    this.breathingTime += step;

    // --- 1. Natural Organic Blinking Simulation ---
    this.blinkTimer -= step;
    if (this.blinkTimer <= 0 && !this.isBlinking) {
      this.isBlinking = true;
      this.blinkProgress = 0;
    }

    if (this.isBlinking) {
      // 140ms natural blink cycle
      this.blinkProgress += step * 7.5;
      if (this.blinkProgress >= 1.0) {
        this.isBlinking = false;
        this.blinkProgress = 0;
        this.blinkTimer = 2.8 + Math.random() * 2.5; // Next blink in 2.8-5.3s
      }
    }

    // --- 2. Expression Hold Timer & Recovery ---
    if (this.stateHoldTimer > 0) {
      this.stateHoldTimer -= step;
      if (this.stateHoldTimer <= 0 && this.nextTextureKey !== 'neutral') {
        this.setExpressionState('neutral');
      }
    }

    // --- 3. Smooth Expression Crossfade Progress ---
    if (this.transitionProgress < 1.0) {
      this.transitionProgress = Math.min(1.0, this.transitionProgress + step * this.transitionSpeed);
      this.transitionMat.opacity = this.transitionProgress;

      if (this.transitionProgress >= 1.0) {
        this.baseMat.map = this.textures[this.nextTextureKey];
        this.baseMat.needsUpdate = true;
        this.transitionMat.opacity = 0.0;
        this.currentTextureKey = this.nextTextureKey;
      }
    }

    // --- 4. Organic Living Idle: Breathing & Dynamic Gaze Tracking ---
    const breathOffset = Math.sin(this.breathingTime * 1.8) * 0.022;

    if (this.nextTextureKey === 'neutral' && pointerNormalized) {
      // Smooth organic head turn following cursor
      this.targetRotation.y = THREE.MathUtils.clamp(pointerNormalized.x * 0.14, -0.18, 0.18);
      this.targetRotation.x = THREE.MathUtils.clamp(-pointerNormalized.y * 0.09, -0.12, 0.12);
    } else if (this.stateHoldTimer <= 0) {
      this.targetRotation.set(0, 0, 0);
    }

    // High-frequency daze vibration (head tremor after hard slap)
    let dazeShakeY = 0;
    let dazeShakeX = 0;
    if (this.dazeVibration > 0.01) {
      const shakeFreq = performance.now() * 0.04;
      dazeShakeY = Math.sin(shakeFreq) * 0.035 * this.dazeVibration;
      dazeShakeX = Math.cos(shakeFreq * 1.3) * 0.025 * this.dazeVibration;
      this.dazeVibration = Math.max(0, this.dazeVibration - step * 2.2);
    }

    // Damped Harmonic Spring for Rotation
    const rotDisp = this.rotation.clone().sub(this.targetRotation);
    const rotSpring = rotDisp.multiplyScalar(-this.rotStiffness);
    const rotDamp = this.rotVelocity.clone().multiplyScalar(-this.rotDamping);
    const rotAccel = rotSpring.add(rotDamp);

    this.rotVelocity.add(rotAccel.multiplyScalar(step));
    this.rotation.add(this.rotVelocity.clone().multiplyScalar(step));

    this.headGroup.rotation.x = this.rotation.x + dazeShakeX;
    this.headGroup.rotation.y = this.rotation.y + dazeShakeY;
    this.headGroup.rotation.z = this.rotation.z;

    // Damped Harmonic Spring for Position Recoil
    const posDisp = this.position.clone().sub(this.targetPosition);
    const posSpring = posDisp.multiplyScalar(-this.posStiffness);
    const posDamp = this.posVelocity.clone().multiplyScalar(-this.posDamping);
    const posAccel = posSpring.add(posDamp);

    this.posVelocity.add(posAccel.multiplyScalar(step));
    this.position.add(this.posVelocity.clone().multiplyScalar(step));

    this.headGroup.position.set(
      this.position.x,
      0.1 + this.position.y + breathOffset,
      this.position.z
    );

    // Torso breathing follow-through
    this.torsoMesh.position.y = -2.15 + breathOffset * 0.6;
    this.torsoMesh.rotation.y = this.rotation.y * 0.35;

    // --- 5. Real-Time Elastic Flesh Physics (Vertex Mesh Updates) ---
    // Update each vertex along Z using damped harmonic spring equation
    const posAttr = this.faceGeo.attributes.position;
    const transPosAttr = this.transitionGeo.attributes.position;
    const kFlesh = 280.0; // Flesh spring tightness
    const dFlesh = 18.0;  // Flesh damping

    // Natural blink deformation: pull eyelid vertices down during blink
    const blinkAmount = this.isBlinking ? Math.sin(this.blinkProgress * Math.PI) * 0.045 : 0;

    let hasFleshMovement = false;

    for (let i = 0; i < this.vertexCount; i++) {
      const dispZ = this.vertexDisplacements[i];

      if (Math.abs(dispZ) > 0.001 || Math.abs(this.vertexVelocities[i]) > 0.01) {
        hasFleshMovement = true;
        const accelZ = -kFlesh * dispZ - dFlesh * this.vertexVelocities[i];
        this.vertexVelocities[i] += accelZ * step;
        this.vertexDisplacements[i] += this.vertexVelocities[i] * step;
      } else {
        this.vertexDisplacements[i] = 0;
        this.vertexVelocities[i] = 0;
      }

      // Check if vertex is in eye region for blinking
      const vx = this.basePositions[i * 3];
      const vy = this.basePositions[i * 3 + 1];
      const isEyeRegion = Math.abs(vy - 0.22) < 0.2 && (Math.abs(vx - 0.45) < 0.35 || Math.abs(vx + 0.45) < 0.35);
      const blinkDeltaY = isEyeRegion ? -blinkAmount : 0;

      const baseZ = this.basePositions[i * 3 + 2];
      const finalZ = baseZ + this.vertexDisplacements[i];
      const finalY = vy + blinkDeltaY;

      posAttr.setY(i, finalY);
      posAttr.setZ(i, finalZ);

      transPosAttr.setY(i, finalY);
      transPosAttr.setZ(i, finalZ);
    }

    if (hasFleshMovement || this.isBlinking) {
      posAttr.needsUpdate = true;
      transPosAttr.needsUpdate = true;
      this.faceGeo.computeVertexNormals();
      this.transitionGeo.computeVertexNormals();
    }

    // --- 6. Cheek Vascular Flush Decay ---
    this.leftBlushIntensity = Math.max(0, this.leftBlushIntensity - step * 0.22);
    this.rightBlushIntensity = Math.max(0, this.rightBlushIntensity - step * 0.22);
    this.leftBlushMat.opacity = this.leftBlushIntensity;
    this.rightBlushMat.opacity = this.rightBlushIntensity;

    this.angerLevel = Math.max(0, this.angerLevel - step * 0.05);
  }

  /**
   * Returns world bounding sphere for collision detection.
   */
  getHitSphere() {
    const worldCenter = this.hitCenter.clone().applyMatrix4(this.headGroup.matrixWorld);
    return {
      center: worldCenter,
      radius: this.hitRadius
    };
  }
}
