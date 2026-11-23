import * as THREE from 'three';

/**
 * 3D Interactive Hand Controller & Pointer Velocity Tracker
 * Computes instantaneous swing velocity and triggers collision events.
 */
export class HandController {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();

    // Tracking state
    this.pointerPos = new THREE.Vector2(0, 0);       // Normalized Device Coordinates [-1, 1]
    this.screenPos = { x: 0, y: 0 };                 // Pixel coordinates
    this.lastScreenPos = { x: 0, y: 0 };
    this.lastTime = performance.now();
    this.velocity = new THREE.Vector2(0, 0);          // Pixels per ms
    this.speed = 0;                                  // Scalar speed
    this.swipeDirection = new THREE.Vector3(1, 0, 0);

    // Interaction gating & rhythmic gesture cadence
    this.lastSlapTime = 0;
    this.slapCooldown = 130;                         // ms minimum between distinct slaps
    this.strokeCooldown = 140;                       // ms minimum between rhythmic aerodynamic whooshes
    this.lastWhooshTime = 0;
    this.strokeDistance = 0;                         // cumulative swing distance
    this.strokeCount = 0;                            // stroke counter for rhythmic variation cycling
    this.lastDirectionX = 0;                         // sign of dx for direction reversal rhythm
    this.prevSpeed = 0;
    this.wasInsideHitbox = false;

    // Hand plane depth in 3D scene
    this.depth = 1.6;

    this._buildHandMesh();
    this.scene.add(this.group);
  }

  _buildHandMesh() {
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xdfa888,
      roughness: 0.52,
      metalness: 0.02
    });

    // 1. Palm
    const palmGeo = new THREE.BoxGeometry(0.7, 0.8, 0.18);
    this.palm = new THREE.Mesh(palmGeo, skinMat);
    this.palm.castShadow = true;
    this.group.add(this.palm);

    // 2. Fingers (4 outstretched slap fingers)
    const fingerGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.6, 12);
    this.fingers = [];

    for (let i = 0; i < 4; i++) {
      const finger = new THREE.Mesh(fingerGeo, skinMat);
      const xOffset = -0.24 + i * 0.16;
      const heightScale = i === 1 || i === 2 ? 1.05 : 0.95;
      finger.scale.y = heightScale;
      finger.position.set(xOffset, 0.68, 0);
      finger.castShadow = true;
      this.group.add(finger);
      this.fingers.push(finger);
    }

    // 3. Thumb (Angled out)
    const thumbGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.45, 12);
    this.thumb = new THREE.Mesh(thumbGeo, skinMat);
    this.thumb.position.set(-0.44, 0.15, 0.02);
    this.thumb.rotation.z = Math.PI / 4;
    this.thumb.rotation.x = -0.15;
    this.thumb.castShadow = true;
    this.group.add(this.thumb);

    this.group.scale.set(0.9, 0.9, 0.9);
    this.group.position.set(0, -5, 0);
  }

  /**
   * Updates pointer tracking, calculates velocity, and tests collision.
   */
  handlePointerMove(clientX, clientY, character, soundEngine, onSlapCallback) {
    const now = performance.now();
    const dt = Math.max(1, now - this.lastTime);

    // Compute pixel delta & velocity (pixels per millisecond)
    const dx = clientX - this.lastScreenPos.x;
    const dy = clientY - this.lastScreenPos.y;
    this.velocity.set(dx / dt, dy / dt);
    this.speed = this.velocity.length();

    this.lastScreenPos.x = clientX;
    this.lastScreenPos.y = clientY;
    this.lastTime = now;

    // Convert to NDC [-1, 1]
    const ndcX = (clientX / window.innerWidth) * 2 - 1;
    const ndcY = -(clientY / window.innerHeight) * 2 + 1;
    this.pointerPos.set(ndcX, ndcY);

    // Map NDC coordinate to 3D position at fixed Z depth
    const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
    vec.unproject(this.camera);
    vec.sub(this.camera.position).normalize();
    const distance = (this.depth - this.camera.position.z) / vec.z;
    const target3D = this.camera.position.clone().add(vec.multiplyScalar(distance));

    this.group.position.lerp(target3D, 0.45);

    // Determine swipe vector in 3D
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      this.swipeDirection.set(dx, -dy, 0).normalize();
    }

    // Dynamic hand orientation: Flip palm towards swipe direction
    const isSwipingRight = dx > 0;
    const targetRotZ = isSwipingRight ? -0.25 - this.speed * 0.1 : 0.25 + this.speed * 0.1;
    const targetRotY = isSwipingRight ? -0.4 : 0.4;
    this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, targetRotZ, 0.3);
    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetRotY, 0.3);

    // Track gesture stroke distance
    const moveDist = Math.hypot(dx, dy);
    this.strokeDistance += moveDist;

    // Detect stroke direction change (reversal indicates a rhythmic sweep)
    const currentDirectionX = Math.sign(dx);
    const hasReversed = this.lastDirectionX !== 0 && currentDirectionX !== 0 && currentDirectionX !== this.lastDirectionX;
    if (currentDirectionX !== 0) {
      this.lastDirectionX = currentDirectionX;
    }

    // Rhythmic Aerodynamic Windup Trigger:
    // Fires on:
    // 1. Natural swing stroke apex (speed > 0.65 px/ms with substantial travel > 50px), OR
    // 2. Stroke reversal during rapid waving (reversing direction with accumulated travel > 35px at speed > 0.45 px/ms).
    // This allows fluid rhythmic waving/slashing sounds that sync with hand cadence without continuous friction.
    const hasSufficientSpeed = this.speed > 0.65;
    const isStrokeApex = hasSufficientSpeed && this.strokeDistance > 50 && (this.speed <= this.prevSpeed || this.strokeDistance > 110);
    const isRhythmicReversal = hasReversed && this.strokeDistance > 35 && this.speed > 0.45;

    if ((isStrokeApex || isRhythmicReversal) && (now - this.lastWhooshTime > this.strokeCooldown)) {
      this.lastWhooshTime = now;
      this.strokeDistance = 0;
      const intensity = Math.min(1.0, Math.max(0.35, this.speed / 2.2));
      soundEngine.playWhoosh(intensity, this.strokeCount++);
    }

    this.prevSpeed = this.speed;

    // Check Collision with Character Head
    this._checkCollision(character, soundEngine, onSlapCallback, now);
  }

  _checkCollision(character, soundEngine, onSlapCallback, now) {
    if (now - this.lastSlapTime < this.slapCooldown) return;

    const hitSphere = character.getHitSphere();
    const handWorldPos = this.group.position;
    const distToHead = handWorldPos.distanceTo(hitSphere.center);

    const isInside = distToHead < (hitSphere.radius + 0.35);
    const hasSlapSpeed = this.speed > 0.42;

    if (isInside && !this.wasInsideHitbox && hasSlapSpeed) {
      this.lastSlapTime = now;

      const force = THREE.MathUtils.clamp(this.speed * 0.75, 0.6, 2.8);
      const hitSide = this.swipeDirection.x > 0 ? 'left' : 'right';

      soundEngine.playSlap(force / 2.0);
      character.applySlapImpulse(this.swipeDirection, force, hitSide);

      if (onSlapCallback) {
        onSlapCallback({
          force,
          contactPoint: handWorldPos.clone(),
          swipeDirection: this.swipeDirection.clone(),
          hitSide
        });
      }
    }

    this.wasInsideHitbox = isInside;
  }

  handleDirectTap(clientX, clientY, character, soundEngine, onSlapCallback) {
    const now = performance.now();
    if (now - this.lastSlapTime < this.slapCooldown) return;

    const hitSphere = character.getHitSphere();
    const handWorldPos = this.group.position;
    const dist = handWorldPos.distanceTo(hitSphere.center);

    if (dist < hitSphere.radius + 0.5) {
      this.lastSlapTime = now;
      const force = 1.2;
      const swipeDir = new THREE.Vector3(Math.random() > 0.5 ? 1 : -1, 0, 0);
      const hitSide = swipeDir.x > 0 ? 'left' : 'right';

      soundEngine.playSlap(force / 2.0);
      character.applySlapImpulse(swipeDir, force, hitSide);

      if (onSlapCallback) {
        onSlapCallback({
          force,
          contactPoint: handWorldPos.clone(),
          swipeDirection: swipeDir,
          hitSide
        });
      }
    }
  }
}
