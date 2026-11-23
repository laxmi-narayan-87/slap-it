import * as THREE from 'three';

/**
 * Realistic Photo-Based 3D Character with Anatomical Depth & State Transitions
 * Uses the user's authentic photography with curved 3D geometry,
 * dynamic multi-state expression crossfading, and damped harmonic spring physics.
 */
export class SlapCharacter {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    // ----------------------------------------------------
    // 1. Damped Harmonic Spring Physics for Head Recoil
    // ----------------------------------------------------
    this.rotation = new THREE.Vector3(0, 0, 0);
    this.rotVelocity = new THREE.Vector3(0, 0, 0);
    this.targetRotation = new THREE.Vector3(0, 0, 0);

    this.position = new THREE.Vector3(0, 0, 0);
    this.posVelocity = new THREE.Vector3(0, 0, 0);
    this.targetPosition = new THREE.Vector3(0, 0, 0);

    // Spring constants tuned for realistic human head mass & cervical recoil
    this.rotStiffness = 185.0;
    this.rotDamping = 13.0;
    this.posStiffness = 150.0;
    this.posDamping = 14.5;

    // Squish & Stretch deformation
    this.squish = new THREE.Vector3(1, 1, 1);
    this.squishVelocity = new THREE.Vector3(0, 0, 0);

    // ----------------------------------------------------
    // 2. State Machine & Transition Management
    // ----------------------------------------------------
    this.currentState = 'neutral';
    this.targetState = 'neutral';
    this.transitionProgress = 1.0;  // 0.0 -> 1.0
    this.transitionSpeed = 8.0;     // Blend speed per second
    this.stateHoldTimer = 0;        // Timer to hold impact/dazed frames

    this.leftBlushIntensity = 0;
    this.rightBlushIntensity = 0;

    // Bounding Sphere for ultra-fast collision detection
    this.hitRadius = 1.35;
    this.hitCenter = new THREE.Vector3(0, 0.15, 0.1);

    this._loadTextures();
    this._buildCharacterMesh();
    this.scene.add(this.group);
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

    this.currentTextureKey = 'neutral';
    this.nextTextureKey = 'neutral';
  }

  /**
   * Builds a curved 3D anatomical bust so the photo has realistic 3D depth,
   * facial volume, and cylindrical curvature when rotating.
   */
  _buildCharacterMesh() {
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.1, 0);

    // 1. Curved 3D Facial Mesh (64x48 subdivisions)
    const width = 3.6;
    const height = 2.88; // 1.25 aspect ratio matching 1024x819
    const faceGeo = new THREE.PlaneGeometry(width, height, 64, 48);

    // Displace vertices along Z to create anatomical cylindrical curvature & nose bridge
    const pos = faceGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);

      // Cylindrical head curvature: edges curve back into Z depth
      const normX = x / (width * 0.5); // [-1, 1]
      let zCurvature = Math.sqrt(Math.max(0, 1 - normX * normX * 0.72)) * 0.65 - 0.65;

      // Subtle cheek & nasal bridge prominence
      const distFromCenter = Math.hypot(x, y + 0.1);
      const noseBulge = Math.exp(-distFromCenter * 3.5) * 0.16;

      pos.setZ(i, zCurvature + noseBulge);
    }
    faceGeo.computeVertexNormals();

    // 2. Base Face Layer (Primary Texture)
    this.baseMat = new THREE.MeshStandardMaterial({
      map: this.textures.neutral,
      roughness: 0.65,
      metalness: 0.05,
      transparent: false
    });
    this.faceMesh = new THREE.Mesh(faceGeo, this.baseMat);
    this.faceMesh.castShadow = true;
    this.faceMesh.receiveShadow = true;
    this.headGroup.add(this.faceMesh);

    // 3. Crossfade Transition Overlay Mesh (Seamless blend between expressions)
    this.transitionMat = new THREE.MeshStandardMaterial({
      map: this.textures.neutral,
      roughness: 0.65,
      metalness: 0.05,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });
    this.transitionMesh = new THREE.Mesh(faceGeo, this.transitionMat);
    this.transitionMesh.position.z = 0.005; // tiny offset to prevent z-fighting
    this.headGroup.add(this.transitionMesh);

    // 4. Solid 3D Beanie Back Volume (so head has realistic solid volume when turned)
    const beanieBackGeo = new THREE.SphereGeometry(1.45, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.6);
    beanieBackGeo.scale(1.05, 1.15, 0.85);
    const beanieMat = new THREE.MeshStandardMaterial({
      color: 0x18181c, // Realistic black knit beanie
      roughness: 0.9,
      metalness: 0.0
    });
    const beanieBack = new THREE.Mesh(beanieBackGeo, beanieMat);
    beanieBack.position.set(0, 0.45, -0.4);
    beanieBack.rotation.x = -0.35;
    this.headGroup.add(beanieBack);

    // 5. Dark Hoodie Torso Base underneath
    const torsoGeo = new THREE.CylinderGeometry(1.1, 1.6, 1.8, 32);
    const hoodieMat = new THREE.MeshStandardMaterial({
      color: 0x12141a,
      roughness: 0.85,
      metalness: 0.02
    });
    this.torsoMesh = new THREE.Mesh(torsoGeo, hoodieMat);
    this.torsoMesh.position.set(0, -2.1, -0.3);
    this.torsoMesh.castShadow = true;
    this.group.add(this.torsoMesh);

    // 6. Dynamic Red Slap Handprint Decal Overlays
    const blushGeo = new THREE.PlaneGeometry(0.9, 0.9);
    const makeBlushMat = () => new THREE.MeshBasicMaterial({
      color: 0xff1035,
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
   * Smoothly transitions the model to another photographic expression state.
   */
  setExpressionState(stateKey, holdDuration = 0) {
    if (this.currentTextureKey === stateKey && this.nextTextureKey === stateKey) return;
    if (!this.textures[stateKey]) return;

    // Shift current blended state into base layer, prepare next state in transition layer
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
   * Anticipation detection: Flenches when hand approaches fast.
   */
  checkAnticipation(handWorldPos, handSpeed) {
    if (this.stateHoldTimer > 0) return; // don't override active slap impact

    const hitSphere = this.getHitSphere();
    const dist = handWorldPos.distanceTo(hitSphere.center);

    // If hand is nearby and moving with intention, tense up into anticipation frame
    if (dist < 2.4 && handSpeed > 0.65) {
      this.setExpressionState('flinch', 0.12);
    } else if (dist > 2.8 && this.nextTextureKey === 'flinch' && this.stateHoldTimer <= 0) {
      this.setExpressionState('neutral');
    }
  }

  /**
   * Applies realistic instantaneous physical impulse on slap impact.
   */
  applySlapImpulse(swipeDirection, force, hitSide = 'left') {
    const power = THREE.MathUtils.clamp(force, 0.6, 2.8);

    // 1. Physical Recoil Impulse:
    // Swiping right (+X) knocks the head right (+Y rotation, -Z roll)
    const yawImpulse = swipeDirection.x * 2.6 * power;
    const pitchImpulse = -Math.abs(swipeDirection.y || 0.25) * 1.3 * power;
    const rollImpulse = -swipeDirection.x * 0.85 * power;

    this.rotVelocity.x += pitchImpulse;
    this.rotVelocity.y += yawImpulse;
    this.rotVelocity.z += rollImpulse;

    // Linear pushback on Z (head thrown backward) and X (direction of force)
    this.posVelocity.x += swipeDirection.x * 0.38 * power;
    this.posVelocity.y -= 0.12 * power;
    this.posVelocity.z -= 0.42 * power;

    // Elastic squish
    this.squishVelocity.set(-0.2 * power, 0.28 * power, -0.15 * power);

    // 2. Select appropriate photographic transition state:
    const isHardSlap = power > 1.6;
    let targetState = 'slap_left';

    if (hitSide === 'left' || swipeDirection.x > 0) {
      targetState = isHardSlap ? 'heavy_slap_left' : 'slap_left';
      this.leftBlushIntensity = Math.min(1.0, this.leftBlushIntensity + 0.4 * power);
    } else {
      targetState = isHardSlap ? 'heavy_slap_right' : 'slap_right';
      this.rightBlushIntensity = Math.min(1.0, this.rightBlushIntensity + 0.4 * power);
    }

    // Instantly cut to impact reaction frame, hold for 0.35s
    this.setExpressionState(targetState, 0.38);

    // Schedule post-impact dazed recovery state
    setTimeout(() => {
      if (this.stateHoldTimer <= 0.08) {
        this.setExpressionState('dazed', 0.45);
      }
    }, 280);
  }

  /**
   * Updates spring-damper physics and photographic crossfade transitions (60+ FPS).
   */
  update(dt, pointerNormalized) {
    const step = Math.min(dt, 0.05);

    // --- 1. Expression State Machine Hold Timer & Recovery ---
    if (this.stateHoldTimer > 0) {
      this.stateHoldTimer -= step;
      if (this.stateHoldTimer <= 0 && this.nextTextureKey !== 'neutral') {
        this.setExpressionState('neutral');
      }
    }

    // --- 2. Smooth Crossfade Transition Progress ---
    if (this.transitionProgress < 1.0) {
      this.transitionProgress = Math.min(1.0, this.transitionProgress + step * this.transitionSpeed);
      this.transitionMat.opacity = this.transitionProgress;

      if (this.transitionProgress >= 1.0) {
        // Texture fully blended: commit nextTexture to baseMat
        this.baseMat.map = this.textures[this.nextTextureKey];
        this.baseMat.needsUpdate = true;
        this.transitionMat.opacity = 0.0;
        this.currentTextureKey = this.nextTextureKey;
      }
    }

    // --- 3. Damped Harmonic Oscillator for Rotation ---
    // Subtle organic gaze tracking when resting in neutral
    if (this.nextTextureKey === 'neutral' && pointerNormalized) {
      this.targetRotation.y = THREE.MathUtils.clamp(pointerNormalized.x * 0.12, -0.15, 0.15);
      this.targetRotation.x = THREE.MathUtils.clamp(-pointerNormalized.y * 0.08, -0.1, 0.1);
    } else {
      this.targetRotation.set(0, 0, 0);
    }

    const rotDisp = this.rotation.clone().sub(this.targetRotation);
    const rotSpringForce = rotDisp.multiplyScalar(-this.rotStiffness);
    const rotDampingForce = this.rotVelocity.clone().multiplyScalar(-this.rotDamping);
    const rotAccel = rotSpringForce.add(rotDampingForce);

    this.rotVelocity.add(rotAccel.multiplyScalar(step));
    this.rotation.add(this.rotVelocity.clone().multiplyScalar(step));

    this.headGroup.rotation.x = this.rotation.x;
    this.headGroup.rotation.y = this.rotation.y;
    this.headGroup.rotation.z = this.rotation.z;

    // --- 4. Damped Harmonic Oscillator for Position Recoil ---
    const posDisp = this.position.clone().sub(this.targetPosition);
    const posSpringForce = posDisp.multiplyScalar(-this.posStiffness);
    const posDampingForce = this.posVelocity.clone().multiplyScalar(-this.posDamping);
    const posAccel = posSpringForce.add(posDampingForce);

    this.posVelocity.add(posAccel.multiplyScalar(step));
    this.position.add(this.posVelocity.clone().multiplyScalar(step));

    this.headGroup.position.set(
      this.position.x,
      0.1 + this.position.y,
      this.position.z
    );

    // Torso subtle organic follow-through
    this.torsoMesh.rotation.y = this.rotation.y * 0.35;
    this.torsoMesh.position.x = this.position.x * 0.25;

    // --- 5. Squish & Stretch Recovery ---
    const squishTarget = new THREE.Vector3(1, 1, 1);
    const squishDisp = this.squish.clone().sub(squishTarget);
    const squishAccel = squishDisp.multiplyScalar(-240).sub(this.squishVelocity.clone().multiplyScalar(18));
    this.squishVelocity.add(squishAccel.multiplyScalar(step));
    this.squish.add(this.squishVelocity.clone().multiplyScalar(step));
    this.faceMesh.scale.copy(this.squish);
    this.transitionMesh.scale.copy(this.squish);

    // --- 6. Slap Blush Fade Decay ---
    this.leftBlushIntensity = Math.max(0, this.leftBlushIntensity - step * 0.25);
    this.rightBlushIntensity = Math.max(0, this.rightBlushIntensity - step * 0.25);
    this.leftBlushMat.opacity = this.leftBlushIntensity;
    this.rightBlushMat.opacity = this.rightBlushIntensity;
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
