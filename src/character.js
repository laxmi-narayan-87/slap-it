import * as THREE from 'three';

/**
 * Pure 3D Sculpted Anatomical Human Character (Zero Photo / Image Dependencies)
 * - 100% geometric 3D model with cranium, sculpted facial features, and organic PBR shaders.
 * - Realistic 3D eyes with movable cornea, iris, and physical 3D eyelids that blink & wince.
 * - Dynamic 3D mouth with cavity that drops open in shock.
 * - 3D knit beanie and hoodie torso.
 * - Damped harmonic spring recoil physics & real-time cheek blush impact.
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

    // Harmonic spring constants tuned for realistic human head mass
    this.rotStiffness = 185.0;
    this.rotDamping = 13.0;
    this.posStiffness = 150.0;
    this.posDamping = 14.5;

    // Squish & Stretch deformation
    this.squish = new THREE.Vector3(1, 1, 1);
    this.squishVelocity = new THREE.Vector3(0, 0, 0);

    // ----------------------------------------------------
    // 2. Living Idle & Expression State
    // ----------------------------------------------------
    this.blinkTimer = 2.5 + Math.random() * 2.0;
    this.blinkProgress = 0;
    this.isBlinking = false;
    this.breathingTime = 0;
    this.dazeVibration = 0;

    this.leftBlushIntensity = 0;
    this.rightBlushIntensity = 0;
    this.mouthOpenTarget = 0;
    this.mouthOpenCurrent = 0;
    this.winceLeft = 0;
    this.winceRight = 0;

    // Bounding sphere for collision detection
    this.hitRadius = 1.25;
    this.hitCenter = new THREE.Vector3(0, 0.2, 0.2);

    this._generateProceduralPBRTextures();
    this._build3DCharacter();
    this._buildStudioEnvironment();
    this.scene.add(this.group);
  }

  /**
   * Generates procedural PBR skin textures (pores, subtle capillary variation).
   * Completely self-contained in code, 0 image asset downloads.
   */
  _generateProceduralPBRTextures() {
    // 1. Procedural Skin Texture (512x512)
    const skinCanvas = document.createElement('canvas');
    skinCanvas.width = 512;
    skinCanvas.height = 512;
    const sCtx = skinCanvas.getContext('2d');

    // Base skin gradient
    const grad = sCtx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#f2d0b8');
    grad.addColorStop(0.5, '#e4bca2');
    grad.addColorStop(1, '#d8ac92');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 512, 512);

    // Micro-pores and subtle epidermal noise
    const imgData = sCtx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 8;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.8));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.6));
    }
    sCtx.putImageData(imgData, 0, 0);

    this.skinMap = new THREE.CanvasTexture(skinCanvas);

    // 2. Iris Texture (256x256 hazel-blue)
    const irisCanvas = document.createElement('canvas');
    irisCanvas.width = 256;
    irisCanvas.height = 256;
    const iCtx = irisCanvas.getContext('2d');

    const iGrad = iCtx.createRadialGradient(128, 128, 15, 128, 128, 120);
    iGrad.addColorStop(0, '#0a0a0a'); // Pupil
    iGrad.addColorStop(0.25, '#785b34'); // Amber ring
    iGrad.addColorStop(0.65, '#3b6e7a'); // Hazel-blue stroma
    iGrad.addColorStop(0.95, '#122730'); // Limbal ring
    iCtx.fillStyle = iGrad;
    iCtx.fillRect(0, 0, 256, 256);

    // Radial iris fibers
    for (let a = 0; a < 360; a += 2) {
      const rad = (a * Math.PI) / 180;
      iCtx.strokeStyle = a % 4 === 0 ? 'rgba(210, 185, 130, 0.4)' : 'rgba(100, 190, 210, 0.25)';
      iCtx.lineWidth = 1;
      iCtx.beginPath();
      iCtx.moveTo(128 + Math.cos(rad) * 35, 128 + Math.sin(rad) * 35);
      iCtx.lineTo(128 + Math.cos(rad) * 115, 128 + Math.sin(rad) * 115);
      iCtx.stroke();
    }

    // Pupil
    iCtx.fillStyle = '#050505';
    iCtx.beginPath();
    iCtx.arc(128, 128, 28, 0, Math.PI * 2);
    iCtx.fill();

    this.irisMap = new THREE.CanvasTexture(irisCanvas);
  }

  /**
   * Constructs the complete pure 3D sculpted human head, face, eyes, and body.
   */
  _build3DCharacter() {
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.2, 0);

    // Common PBR Materials
    this.skinMat = new THREE.MeshStandardMaterial({
      map: this.skinMap,
      color: 0xdfb49c,
      roughness: 0.62,
      metalness: 0.04
    });

    const lipMat = new THREE.MeshStandardMaterial({
      color: 0xc87570,
      roughness: 0.45,
      metalness: 0.06
    });

    const beanieMat = new THREE.MeshStandardMaterial({
      color: 0x16181d, // Deep knit black
      roughness: 0.94,
      metalness: 0.01
    });

    // ----------------------------------------------------
    // A. Sculpted 3D Cranium & Facial Base
    // ----------------------------------------------------
    const headGeo = new THREE.SphereGeometry(1.08, 48, 40);
    // Anatomical deformation: taper jaw, accentuate chin and cheekbones
    const pos = headGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Jaw taper down toward chin
      if (y < 0) {
        const taper = 1.0 + y * 0.16;
        x *= taper;
      }

      // Cheekbone prominence (y ~ 0.0 to 0.2, z > 0.4)
      if (y > -0.1 && y < 0.25 && z > 0.4) {
        z *= 1.08;
      }

      // Flat eye socket recesses (y ~ 0.15 to 0.35, z > 0.6)
      if (y > 0.1 && y < 0.38 && z > 0.6 && Math.abs(x) > 0.2 && Math.abs(x) < 0.65) {
        z *= 0.92;
      }

      pos.setXYZ(i, x * 0.98, y * 1.14, z * 1.02);
    }
    headGeo.computeVertexNormals();

    this.headMesh = new THREE.Mesh(headGeo, this.skinMat);
    this.headMesh.castShadow = true;
    this.headMesh.receiveShadow = true;
    this.headGroup.add(this.headMesh);

    // ----------------------------------------------------
    // B. Realistic 3D Nose
    // ----------------------------------------------------
    const noseGeo = new THREE.ConeGeometry(0.18, 0.42, 16);
    noseGeo.scale(1.0, 1.0, 0.65);
    const nose = new THREE.Mesh(noseGeo, this.skinMat);
    nose.position.set(0, 0.02, 1.12);
    nose.rotation.x = Math.PI / 9;
    nose.castShadow = true;
    this.headGroup.add(nose);

    // Nose tip lobule
    const tipGeo = new THREE.SphereGeometry(0.11, 16, 16);
    tipGeo.scale(1.2, 0.9, 1.0);
    const noseTip = new THREE.Mesh(tipGeo, this.skinMat);
    noseTip.position.set(0, -0.14, 1.18);
    this.headGroup.add(noseTip);

    // ----------------------------------------------------
    // C. Realistic 3D Lips & Mouth Cavity
    // ----------------------------------------------------
    this.mouthGroup = new THREE.Group();
    this.mouthGroup.position.set(0, -0.42, 1.0);

    // Upper lip with Cupid's bow contour
    const upperLipGeo = new THREE.TorusGeometry(0.19, 0.045, 12, 24, Math.PI * 0.95);
    upperLipGeo.scale(1.2, 0.7, 0.8);
    const upperLip = new THREE.Mesh(upperLipGeo, lipMat);
    upperLip.rotation.x = -Math.PI / 10;
    this.mouthGroup.add(upperLip);

    // Lower fuller lip
    const lowerLipGeo = new THREE.TorusGeometry(0.18, 0.055, 12, 24, Math.PI * 0.9);
    lowerLipGeo.scale(1.15, 0.75, 0.8);
    this.lowerLipMesh = new THREE.Mesh(lowerLipGeo, lipMat);
    this.lowerLipMesh.rotation.z = Math.PI;
    this.lowerLipMesh.position.y = -0.06;
    this.mouthGroup.add(this.lowerLipMesh);

    // Dark mouth interior cavity
    const cavityGeo = new THREE.SphereGeometry(0.15, 16, 12);
    cavityGeo.scale(1.3, 0.5, 0.6);
    const cavityMat = new THREE.MeshBasicMaterial({ color: 0x240608 });
    this.mouthCavity = new THREE.Mesh(cavityGeo, cavityMat);
    this.mouthCavity.position.set(0, -0.03, -0.05);
    this.mouthCavity.scale.set(0.01, 0.01, 0.01); // Closed by default
    this.mouthGroup.add(this.mouthCavity);

    this.headGroup.add(this.mouthGroup);

    // ----------------------------------------------------
    // D. Realistic 3D Eyes, Corneas & Movable Eyelids
    // ----------------------------------------------------
    this._build3DEyes();

    // ----------------------------------------------------
    // E. 3D Eyebrows
    // ----------------------------------------------------
    const browMat = new THREE.MeshStandardMaterial({
      color: 0x321f14,
      roughness: 0.85
    });
    const browGeo = new THREE.BoxGeometry(0.38, 0.08, 0.08);

    this.leftBrow = new THREE.Mesh(browGeo, browMat);
    this.leftBrow.position.set(0.42, 0.44, 0.98);
    this.leftBrow.rotation.set(-0.1, -0.2, 0.08);
    this.headGroup.add(this.leftBrow);

    this.rightBrow = new THREE.Mesh(browGeo, browMat);
    this.rightBrow.position.set(-0.42, 0.44, 0.98);
    this.rightBrow.rotation.set(-0.1, 0.2, -0.08);
    this.headGroup.add(this.rightBrow);

    // ----------------------------------------------------
    // F. 3D Ears
    // ----------------------------------------------------
    const earGeo = new THREE.SphereGeometry(0.28, 16, 16);
    earGeo.scale(0.35, 1.25, 0.75);
    const leftEar = new THREE.Mesh(earGeo, this.skinMat);
    leftEar.position.set(1.08, 0.08, -0.05);
    leftEar.rotation.set(0, 0.35, -0.15);
    this.headGroup.add(leftEar);

    const rightEar = leftEar.clone();
    rightEar.position.set(-1.08, 0.08, -0.05);
    rightEar.rotation.set(0, -0.35, 0.15);
    this.headGroup.add(rightEar);

    // ----------------------------------------------------
    // G. Realistic 3D Black Beanie
    // ----------------------------------------------------
    // Beanie Dome (top and back of cranium)
    const beanieGeo = new THREE.SphereGeometry(1.18, 36, 28, 0, Math.PI * 2, 0, Math.PI * 0.65);
    beanieGeo.scale(1.02, 1.08, 1.04);
    const beanie = new THREE.Mesh(beanieGeo, beanieMat);
    beanie.position.set(0, 0.45, -0.08);
    beanie.rotation.x = -0.28;
    beanie.castShadow = true;
    this.headGroup.add(beanie);

    // Folded Beanie Rim Cuff
    const cuffGeo = new THREE.TorusGeometry(1.08, 0.16, 16, 36);
    cuffGeo.scale(1.0, 1.08, 0.85);
    const cuff = new THREE.Mesh(cuffGeo, beanieMat);
    cuff.position.set(0, 0.42, 0.15);
    cuff.rotation.x = 0.32;
    cuff.castShadow = true;
    this.headGroup.add(cuff);

    // Hair strands peeking out from under beanie cuff
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x1f140e,
      roughness: 0.75
    });
    const strandGeo = new THREE.ConeGeometry(0.06, 0.28, 8);
    for (let s = -3; s <= 3; s++) {
      if (s === 0) continue;
      const strand = new THREE.Mesh(strandGeo, hairMat);
      strand.position.set(s * 0.24, 0.32, 1.02);
      strand.rotation.set(0.4, 0, s * -0.22);
      this.headGroup.add(strand);
    }

    // ----------------------------------------------------
    // H. 3D Neck & Hoodie Torso
    // ----------------------------------------------------
    const neckGeo = new THREE.CylinderGeometry(0.44, 0.54, 0.7, 24);
    const neck = new THREE.Mesh(neckGeo, this.skinMat);
    neck.position.set(0, -0.85, -0.05);
    neck.receiveShadow = true;
    this.group.add(neck);

    const torsoGeo = new THREE.CylinderGeometry(1.2, 1.75, 1.6, 32);
    const hoodieMat = new THREE.MeshStandardMaterial({
      color: 0x12141a,
      roughness: 0.88,
      metalness: 0.02
    });
    this.torsoMesh = new THREE.Mesh(torsoGeo, hoodieMat);
    this.torsoMesh.position.set(0, -1.8, -0.15);
    this.torsoMesh.receiveShadow = true;
    this.torsoMesh.castShadow = true;
    this.group.add(this.torsoMesh);

    // ----------------------------------------------------
    // I. Dynamic Red Cheek Slap Overlays
    // ----------------------------------------------------
    const blushGeo = new THREE.SphereGeometry(0.38, 20, 20);
    blushGeo.scale(1.15, 0.85, 0.35);

    const makeBlushMat = () => new THREE.MeshBasicMaterial({
      color: 0xff1538,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.leftBlushMat = makeBlushMat();
    this.leftBlushMesh = new THREE.Mesh(blushGeo, this.leftBlushMat);
    this.leftBlushMesh.position.set(0.64, -0.15, 0.92);
    this.leftBlushMesh.rotation.y = -0.32;
    this.headGroup.add(this.leftBlushMesh);

    this.rightBlushMat = makeBlushMat();
    this.rightBlushMesh = new THREE.Mesh(blushGeo, this.rightBlushMat);
    this.rightBlushMesh.position.set(-0.64, -0.15, 0.92);
    this.rightBlushMesh.rotation.y = 0.32;
    this.headGroup.add(this.rightBlushMesh);

    this.group.add(this.headGroup);
  }

  /**
   * Builds realistic 3D eyeballs with specular cornea domes and movable eyelids.
   */
  _build3DEyes() {
    const scleraMat = new THREE.MeshStandardMaterial({
      color: 0xfcfcfc,
      roughness: 0.15,
      metalness: 0.02
    });

    const irisMat = new THREE.MeshBasicMaterial({
      map: this.irisMap
    });

    const corneaMat = new THREE.MeshPhysicalMaterial({
      roughness: 0.05,
      transmission: 0.92,
      thickness: 0.1,
      transparent: true,
      opacity: 0.7,
      reflectivity: 0.8
    });

    const createEye = (isLeft) => {
      const eyePivot = new THREE.Group();
      eyePivot.position.set(isLeft ? 0.42 : -0.42, 0.22, 0.84);

      // Sclera sphere
      const scleraGeo = new THREE.SphereGeometry(0.24, 24, 24);
      const sclera = new THREE.Mesh(scleraGeo, scleraMat);
      eyePivot.add(sclera);

      // Iris disc
      const irisGeo = new THREE.CircleGeometry(0.11, 24);
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.set(0, 0, 0.235);
      eyePivot.add(iris);

      // Specular Cornea Dome
      const corneaGeo = new THREE.SphereGeometry(0.14, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const cornea = new THREE.Mesh(corneaGeo, corneaMat);
      cornea.position.set(0, 0, 0.16);
      eyePivot.add(cornea);

      // Upper Eyelid (Rotates down for natural 3D blinks and winces)
      const lidGeo = new THREE.SphereGeometry(0.255, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const upperLid = new THREE.Mesh(lidGeo, this.skinMat);
      upperLid.rotation.x = -Math.PI * 0.48; // Open rest position
      eyePivot.add(upperLid);

      // Lower Eyelid
      const lowerLid = new THREE.Mesh(lidGeo, this.skinMat);
      lowerLid.rotation.x = Math.PI * 0.48;
      eyePivot.add(lowerLid);

      this.headGroup.add(eyePivot);
      return { pivot: eyePivot, upperLid, lowerLid };
    };

    this.leftEye = createEye(true);
    this.rightEye = createEye(false);
  }

  /**
   * Sets up a rich studio backdrop so lighting and shadows integrate naturally.
   */
  _buildStudioEnvironment() {
    const studioGeo = new THREE.CylinderGeometry(14, 14, 16, 48, 1, true, -Math.PI * 0.7, Math.PI * 1.4);
    const studioMat = new THREE.MeshStandardMaterial({
      color: 0x161a18,
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.BackSide
    });
    const studioWall = new THREE.Mesh(studioGeo, studioMat);
    studioWall.receiveShadow = true;
    this.scene.add(studioWall);

    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111412,
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
   * Proximity Anticipation: Tenses neck, draws back head, and winces eyelids as hand approaches.
   */
  checkAnticipation(handWorldPos, handSpeed) {
    const hitSphere = this.getHitSphere();
    const dist = handWorldPos.distanceTo(hitSphere.center);

    if (dist < 2.5 && handSpeed > 0.5) {
      const flinch = Math.min(1.0, (2.5 - dist) / 1.5) * Math.min(1.0, handSpeed);
      this.targetPosition.z = -0.18 * flinch;
      this.targetPosition.y = -0.06 * flinch;
      this.winceLeft = Math.max(this.winceLeft, flinch * 0.45);
      this.winceRight = Math.max(this.winceRight, flinch * 0.45);
    } else if (dist > 2.8) {
      this.targetPosition.set(0, 0, 0);
    }
  }

  /**
   * Applies realistic physical impulse on slap impact.
   */
  applySlapImpulse(swipeDirection, force, hitSide = 'left') {
    const power = THREE.MathUtils.clamp(force, 0.6, 2.8);

    // 1. Angular Cervical Impulse: Head snaps around Yaw, Pitch, Roll
    const yawImpulse = swipeDirection.x * 2.8 * power;
    const pitchImpulse = -Math.abs(swipeDirection.y || 0.25) * 1.4 * power;
    const rollImpulse = -swipeDirection.x * 0.95 * power;

    this.rotVelocity.x += pitchImpulse;
    this.rotVelocity.y += yawImpulse;
    this.rotVelocity.z += rollImpulse;

    // Linear pushback on Z (head thrown back) and X
    this.posVelocity.x += swipeDirection.x * 0.45 * power;
    this.posVelocity.y -= 0.15 * power;
    this.posVelocity.z -= 0.5 * power;

    // Squish & Stretch
    this.squishVelocity.set(-0.22 * power, 0.3 * power, -0.15 * power);

    // 2. High-Frequency Head Daze Tremor
    this.dazeVibration = Math.min(1.0, 0.3 + power * 0.35);

    // 3. Realistic 3D Facial Reactions:
    // Drop mouth open in shock
    this.mouthOpenTarget = Math.min(1.0, 0.4 + power * 0.4);

    // Wince the struck eye shut
    if (hitSide === 'left' || swipeDirection.x > 0) {
      this.winceLeft = 1.0;
      this.leftBlushIntensity = Math.min(1.0, this.leftBlushIntensity + 0.55 * power);
    } else {
      this.winceRight = 1.0;
      this.rightBlushIntensity = Math.min(1.0, this.rightBlushIntensity + 0.55 * power);
    }
  }

  /**
   * Updates spring physics, 3D eyelid blinking, breathing, and gaze tracking (60+ FPS).
   */
  update(dt, pointerNormalized) {
    const step = Math.min(dt, 0.05);
    this.breathingTime += step;

    // --- 1. Organic 3D Blinking Simulation ---
    this.blinkTimer -= step;
    if (this.blinkTimer <= 0 && !this.isBlinking) {
      this.isBlinking = true;
      this.blinkProgress = 0;
    }

    let blinkLidOffset = 0;
    if (this.isBlinking) {
      this.blinkProgress += step * 8.0;
      blinkLidOffset = Math.sin(this.blinkProgress * Math.PI) * 0.85;
      if (this.blinkProgress >= 1.0) {
        this.isBlinking = false;
        this.blinkProgress = 0;
        this.blinkTimer = 2.8 + Math.random() * 2.8;
      }
    }

    // --- 2. 3D Eyelids Movement (Blinks + Winces) ---
    this.winceLeft = Math.max(0, this.winceLeft - step * 2.4);
    this.winceRight = Math.max(0, this.winceRight - step * 2.4);

    const leftLidClose = Math.min(1.0, blinkLidOffset + this.winceLeft * 0.95);
    const rightLidClose = Math.min(1.0, blinkLidOffset + this.winceRight * 0.95);

    // Rotate upper eyelids down over cornea
    this.leftEye.upperLid.rotation.x = -Math.PI * 0.48 + leftLidClose * 0.82;
    this.rightEye.upperLid.rotation.x = -Math.PI * 0.48 + rightLidClose * 0.82;

    // Eyebrows furrow on wince
    this.leftBrow.position.y = 0.44 - this.winceLeft * 0.08;
    this.rightBrow.position.y = 0.44 - this.winceRight * 0.08;

    // --- 3. Dynamic 3D Mouth Animation ---
    this.mouthOpenTarget = Math.max(0, this.mouthOpenTarget - step * 2.0);
    this.mouthOpenCurrent = THREE.MathUtils.lerp(this.mouthOpenCurrent, this.mouthOpenTarget, 0.2);

    this.lowerLipMesh.position.y = -0.06 - this.mouthOpenCurrent * 0.16;
    this.mouthCavity.scale.set(
      1.0,
      Math.max(0.01, this.mouthOpenCurrent * 1.2),
      Math.max(0.01, this.mouthOpenCurrent * 1.0)
    );

    // --- 4. 3D Gaze Tracking (Eyes follow cursor) ---
    if (pointerNormalized) {
      const gazeX = THREE.MathUtils.clamp(pointerNormalized.x * 0.4, -0.45, 0.45);
      const gazeY = THREE.MathUtils.clamp(pointerNormalized.y * 0.35, -0.35, 0.35);
      this.leftEye.pivot.rotation.y = THREE.MathUtils.lerp(this.leftEye.pivot.rotation.y, gazeX, 0.15);
      this.leftEye.pivot.rotation.x = THREE.MathUtils.lerp(this.leftEye.pivot.rotation.x, -gazeY, 0.15);
      this.rightEye.pivot.rotation.y = THREE.MathUtils.lerp(this.rightEye.pivot.rotation.y, gazeX, 0.15);
      this.rightEye.pivot.rotation.x = THREE.MathUtils.lerp(this.rightEye.pivot.rotation.x, -gazeY, 0.15);

      // Head subtle follow
      this.targetRotation.y = THREE.MathUtils.clamp(pointerNormalized.x * 0.15, -0.18, 0.18);
      this.targetRotation.x = THREE.MathUtils.clamp(-pointerNormalized.y * 0.1, -0.12, 0.12);
    }

    // --- 5. Organic Breathing & Daze Vibration ---
    const breathOffset = Math.sin(this.breathingTime * 1.8) * 0.024;

    let dazeShakeX = 0;
    let dazeShakeY = 0;
    if (this.dazeVibration > 0.01) {
      const freq = performance.now() * 0.045;
      dazeShakeY = Math.sin(freq) * 0.04 * this.dazeVibration;
      dazeShakeX = Math.cos(freq * 1.2) * 0.03 * this.dazeVibration;
      this.dazeVibration = Math.max(0, this.dazeVibration - step * 2.5);
    }

    // --- 6. Damped Harmonic Oscillator for Rotation ---
    const rotDisp = this.rotation.clone().sub(this.targetRotation);
    const rotSpring = rotDisp.multiplyScalar(-this.rotStiffness);
    const rotDamp = this.rotVelocity.clone().multiplyScalar(-this.rotDamping);
    const rotAccel = rotSpring.add(rotDamp);

    this.rotVelocity.add(rotAccel.multiplyScalar(step));
    this.rotation.add(this.rotVelocity.clone().multiplyScalar(step));

    this.headGroup.rotation.x = this.rotation.x + dazeShakeX;
    this.headGroup.rotation.y = this.rotation.y + dazeShakeY;
    this.headGroup.rotation.z = this.rotation.z;

    // --- 7. Damped Harmonic Oscillator for Position Recoil ---
    const posDisp = this.position.clone().sub(this.targetPosition);
    const posSpring = posDisp.multiplyScalar(-this.posStiffness);
    const posDamp = this.posVelocity.clone().multiplyScalar(-this.posDamping);
    const posAccel = posSpring.add(posDamp);

    this.posVelocity.add(posAccel.multiplyScalar(step));
    this.position.add(this.posVelocity.clone().multiplyScalar(step));

    this.headGroup.position.set(
      this.position.x,
      0.2 + this.position.y + breathOffset,
      this.position.z
    );

    // Torso breathing follow-through
    this.torsoMesh.position.y = -1.8 + breathOffset * 0.6;
    this.torsoMesh.rotation.y = this.rotation.y * 0.35;

    // --- 8. Squish & Stretch Recovery ---
    const squishTarget = new THREE.Vector3(1, 1, 1);
    const squishDisp = this.squish.clone().sub(squishTarget);
    const squishAccel = squishDisp.multiplyScalar(-240).sub(this.squishVelocity.clone().multiplyScalar(18));
    this.squishVelocity.add(squishAccel.multiplyScalar(step));
    this.squish.add(this.squishVelocity.clone().multiplyScalar(step));
    this.headMesh.scale.copy(this.squish);

    // --- 9. Slap Blush Fade Decay ---
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
