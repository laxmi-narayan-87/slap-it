import * as THREE from 'three';

/**
 * 3D Procedural Cartoon Character with Damped Harmonic Spring Physics
 * Zero external 3D file dependencies, instant WebGL rendering.
 */
export class SlapCharacter {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    // Harmonic Spring Physics State for Head Recoil
    this.rotation = new THREE.Vector3(0, 0, 0);
    this.rotVelocity = new THREE.Vector3(0, 0, 0);
    this.targetRotation = new THREE.Vector3(0, 0, 0);

    this.position = new THREE.Vector3(0, 0, 0);
    this.posVelocity = new THREE.Vector3(0, 0, 0);
    this.targetPosition = new THREE.Vector3(0, 0, 0);

    // Spring constants (Tuned for satisfying cartoon recoil)
    this.rotStiffness = 180.0; // Spring tightness
    this.rotDamping = 12.0;    // Friction / decay
    this.posStiffness = 140.0;
    this.posDamping = 14.0;

    // Squish & Stretch deformation
    this.squish = new THREE.Vector3(1, 1, 1);
    this.squishVelocity = new THREE.Vector3(0, 0, 0);

    // Expression & Eye Tracking
    this.pupilTarget = new THREE.Vector2(0, 0);
    this.dizzyTimer = 0;
    this.leftBlushIntensity = 0;
    this.rightBlushIntensity = 0;

    this._buildCharacter();
    this.scene.add(this.group);
  }

  _buildCharacter() {
    // 1. Neck and Torso Base
    const torsoGeo = new THREE.CylinderGeometry(0.7, 1.2, 1.4, 24);
    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.6,
      metalness: 0.1
    });
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = -1.6;
    torso.castShadow = true;
    torso.receiveShadow = true;
    this.group.add(torso);

    const neckGeo = new THREE.CylinderGeometry(0.38, 0.44, 0.6, 20);
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffccaa,
      roughness: 0.55,
      metalness: 0.05
    });
    this.skinMat = skinMat;
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = -0.75;
    this.group.add(neck);

    // 2. Head Pivot Group (This group undergoes spring recoil rotation)
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 0.2;

    // Main Cranium / Head Mesh
    const headGeo = new THREE.SphereGeometry(1.05, 32, 28);
    // Slight oval scaling for friendly face proportions
    headGeo.scale(1.0, 1.15, 0.98);
    this.headMesh = new THREE.Mesh(headGeo, skinMat);
    this.headMesh.castShadow = true;
    this.headMesh.receiveShadow = true;
    this.headGroup.add(this.headMesh);

    // 3. Hair (Stylized cartoon quiff)
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x4a2e18,
      roughness: 0.8
    });
    const hairGeo = new THREE.SphereGeometry(1.08, 24, 20);
    hairGeo.scale(1.02, 0.9, 0.95);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 0.38, -0.15);
    hair.rotation.x = -0.2;
    this.headGroup.add(hair);

    // Front Hair Bangs
    const bangGeo = new THREE.ConeGeometry(0.35, 0.7, 16);
    const bang = new THREE.Mesh(bangGeo, hairMat);
    bang.rotation.z = Math.PI / 4;
    bang.rotation.x = 0.4;
    bang.position.set(-0.25, 1.25, 0.75);
    this.headGroup.add(bang);

    // 4. Ears
    const earGeo = new THREE.SphereGeometry(0.25, 16, 16);
    earGeo.scale(0.5, 1.2, 0.8);
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(-1.08, 0, -0.05);
    const rightEar = leftEar.clone();
    rightEar.position.set(1.08, 0, -0.05);
    this.headGroup.add(leftEar);
    this.headGroup.add(rightEar);

    // 5. Cheeks & Red Slap Blush Overlays
    const blushGeo = new THREE.SphereGeometry(0.32, 20, 20);
    blushGeo.scale(1.1, 0.8, 0.4);

    this.leftBlushMat = new THREE.MeshBasicMaterial({
      color: 0xff1144,
      transparent: true,
      opacity: 0.0
    });
    this.leftBlush = new THREE.Mesh(blushGeo, this.leftBlushMat);
    this.leftBlush.position.set(-0.62, -0.22, 0.85);
    this.leftBlush.rotation.y = 0.35;
    this.headGroup.add(this.leftBlush);

    this.rightBlushMat = new THREE.MeshBasicMaterial({
      color: 0xff1144,
      transparent: true,
      opacity: 0.0
    });
    this.rightBlush = new THREE.Mesh(blushGeo, this.rightBlushMat);
    this.rightBlush.position.set(0.62, -0.22, 0.85);
    this.rightBlush.rotation.y = -0.35;
    this.headGroup.add(this.rightBlush);

    // 6. Eyes & Googly Pupils
    const eyeWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2
    });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    const eyeGeo = new THREE.SphereGeometry(0.24, 20, 20);
    eyeGeo.scale(1.0, 1.15, 0.6);

    // Left Eye
    const leftEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    leftEye.position.set(-0.38, 0.18, 0.88);
    this.headGroup.add(leftEye);

    // Right Eye
    const rightEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    rightEye.position.set(0.38, 0.18, 0.88);
    this.headGroup.add(rightEye);

    // Pupils
    const pupilGeo = new THREE.SphereGeometry(0.1, 16, 16);
    pupilGeo.scale(1, 1, 0.4);
    this.leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    this.leftPupil.position.set(-0.38, 0.18, 1.02);
    this.headGroup.add(this.leftPupil);

    this.rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    this.rightPupil.position.set(0.38, 0.18, 1.02);
    this.headGroup.add(this.rightPupil);

    // 7. Eyebrows
    const browGeo = new THREE.BoxGeometry(0.34, 0.07, 0.09);
    this.browMat = new THREE.MeshStandardMaterial({ color: 0x3a2010 });

    this.leftBrow = new THREE.Mesh(browGeo, this.browMat);
    this.leftBrow.position.set(-0.38, 0.48, 0.94);
    this.leftBrow.rotation.z = -0.08;
    this.headGroup.add(this.leftBrow);

    this.rightBrow = new THREE.Mesh(browGeo, this.browMat);
    this.rightBrow.position.set(0.38, 0.48, 0.94);
    this.rightBrow.rotation.z = 0.08;
    this.headGroup.add(this.rightBrow);

    // 8. Nose
    const noseGeo = new THREE.ConeGeometry(0.14, 0.32, 16);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, -0.05, 1.06);
    nose.rotation.x = Math.PI / 8;
    this.headGroup.add(nose);

    // 9. Mouth (Expressive ring)
    const mouthGeo = new THREE.TorusGeometry(0.16, 0.045, 12, 24, Math.PI);
    this.mouthMat = new THREE.MeshBasicMaterial({ color: 0x771122 });
    this.mouth = new THREE.Mesh(mouthGeo, this.mouthMat);
    this.mouth.position.set(0, -0.45, 0.95);
    this.mouth.rotation.x = -0.2;
    this.headGroup.add(this.mouth);

    // 10. Head Hitbox (Bounding sphere used for ultra-fast collision)
    this.hitRadius = 1.15;
    this.hitCenter = new THREE.Vector3(0, 0.2, 0.4);

    this.group.add(this.headGroup);
  }

  /**
   * Applies an instantaneous physical impulse on slap impact.
   * @param {THREE.Vector3} swipeDirection - Normalized swipe vector (e.g., right-to-left)
   * @param {number} force - Slap intensity multiplier [0.5 - 2.5]
   * @param {string} hitSide - 'left' or 'right' cheek
   */
  applySlapImpulse(swipeDirection, force, hitSide = 'left') {
    const power = Math.min(3.0, Math.max(0.6, force));

    // 1. Angular impulse: Head snaps around Yaw (Y) and Roll (Z) axes
    // If swiping right (+X), head snaps to right (+Y rotation)
    const yawImpulse = swipeDirection.x * 2.8 * power;
    const pitchImpulse = -Math.abs(swipeDirection.y || 0.3) * 1.5 * power;
    const rollImpulse = -swipeDirection.x * 0.9 * power;

    this.rotVelocity.x += pitchImpulse;
    this.rotVelocity.y += yawImpulse;
    this.rotVelocity.z += rollImpulse;

    // 2. Linear displacement recoil (Head gets pushed back and away)
    this.posVelocity.x += swipeDirection.x * 0.45 * power;
    this.posVelocity.y -= 0.15 * power;
    this.posVelocity.z -= 0.35 * power;

    // 3. Dynamic Squish and Stretch
    // Compress along slap axis, expand along perpendicular axis
    this.squishVelocity.set(-0.25 * power, 0.35 * power, -0.15 * power);

    // 4. Activate Cheek Blush Mark
    if (hitSide === 'left' || swipeDirection.x > 0) {
      this.leftBlushIntensity = Math.min(1.0, this.leftBlushIntensity + 0.65 * power);
    } else {
      this.rightBlushIntensity = Math.min(1.0, this.rightBlushIntensity + 0.65 * power);
    }

    // 5. Trigger Comedic Dizzy Eye Spin
    this.dizzyTimer = Math.min(1.8, 0.4 + power * 0.4);

    // 6. Open mouth wide in shock
    this.mouth.scale.set(1 + power * 0.6, 1 + power * 0.8, 1);
  }

  /**
   * Updates spring-damper physics every frame (60+ FPS).
   */
  update(dt, pointerNormalized) {
    // Clamp delta time to avoid physics explosion on background tab switch
    const step = Math.min(dt, 0.05);

    // --- 1. Damped Harmonic Oscillator for Rotation ---
    // a = -k * x - c * v
    const rotDisplacement = this.rotation.clone().sub(this.targetRotation);
    const rotSpringForce = rotDisplacement.multiplyScalar(-this.rotStiffness);
    const rotDampingForce = this.rotVelocity.clone().multiplyScalar(-this.rotDamping);
    const rotAcceleration = rotSpringForce.add(rotDampingForce);

    this.rotVelocity.add(rotAcceleration.multiplyScalar(step));
    this.rotation.add(this.rotVelocity.clone().multiplyScalar(step));

    this.headGroup.rotation.x = this.rotation.x;
    this.headGroup.rotation.y = this.rotation.y;
    this.headGroup.rotation.z = this.rotation.z;

    // --- 2. Damped Harmonic Oscillator for Position Recoil ---
    const posDisplacement = this.position.clone().sub(this.targetPosition);
    const posSpringForce = posDisplacement.multiplyScalar(-this.posStiffness);
    const posDampingForce = this.posVelocity.clone().multiplyScalar(-this.posDamping);
    const posAcceleration = posSpringForce.add(posDampingForce);

    this.posVelocity.add(posAcceleration.multiplyScalar(step));
    this.position.add(this.posVelocity.clone().multiplyScalar(step));

    this.headGroup.position.set(
      this.position.x,
      0.2 + this.position.y,
      this.position.z
    );

    // --- 3. Squish & Stretch Recovery ---
    const squishTarget = new THREE.Vector3(1, 1, 1);
    const squishDisp = this.squish.clone().sub(squishTarget);
    const squishAccel = squishDisp.multiplyScalar(-240).sub(this.squishVelocity.clone().multiplyScalar(18));
    this.squishVelocity.add(squishAccel.multiplyScalar(step));
    this.squish.add(this.squishVelocity.clone().multiplyScalar(step));
    this.headMesh.scale.set(
      1.0 * this.squish.x,
      1.15 * this.squish.y,
      0.98 * this.squish.z
    );

    // --- 4. Blush Fade Decay ---
    this.leftBlushIntensity = Math.max(0, this.leftBlushIntensity - step * 0.28);
    this.rightBlushIntensity = Math.max(0, this.rightBlushIntensity - step * 0.28);
    this.leftBlushMat.opacity = this.leftBlushIntensity;
    this.rightBlushMat.opacity = this.rightBlushIntensity;

    // --- 5. Eye Tracking & Dizzy State ---
    if (this.dizzyTimer > 0) {
      this.dizzyTimer -= step;
      // Googly spiral eye spin
      const spin = performance.now() * 0.02;
      const radius = 0.07;
      this.leftPupil.position.x = -0.38 + Math.cos(spin) * radius;
      this.leftPupil.position.y = 0.18 + Math.sin(spin) * radius;
      this.rightPupil.position.x = 0.38 + Math.cos(spin + Math.PI) * radius;
      this.rightPupil.position.y = 0.18 + Math.sin(spin + Math.PI) * radius;

      // Eyebrows raised in panic
      this.leftBrow.rotation.z = 0.28;
      this.rightBrow.rotation.z = -0.28;
    } else {
      // Normal gaze tracking pointer
      const targetX = THREE.MathUtils.clamp((pointerNormalized?.x || 0) * 0.06, -0.06, 0.06);
      const targetY = THREE.MathUtils.clamp((pointerNormalized?.y || 0) * 0.05, -0.05, 0.05);

      this.leftPupil.position.x = THREE.MathUtils.lerp(this.leftPupil.position.x, -0.38 + targetX, 0.15);
      this.leftPupil.position.y = THREE.MathUtils.lerp(this.leftPupil.position.y, 0.18 + targetY, 0.15);
      this.rightPupil.position.x = THREE.MathUtils.lerp(this.rightPupil.position.x, 0.38 + targetX, 0.15);
      this.rightPupil.position.y = THREE.MathUtils.lerp(this.rightPupil.position.y, 0.18 + targetY, 0.15);

      // Return eyebrows and mouth
      this.leftBrow.rotation.z = THREE.MathUtils.lerp(this.leftBrow.rotation.z, -0.08, 0.1);
      this.rightBrow.rotation.z = THREE.MathUtils.lerp(this.rightBrow.rotation.z, 0.08, 0.1);
      this.mouth.scale.lerp(new THREE.Vector3(1, 1, 1), 0.12);
    }
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
