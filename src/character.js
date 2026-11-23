import * as THREE from 'three';

/**
 * Procedural Realistic 3D Human Character with Damped Harmonic Spring Physics
 * Zero external 3D file dependencies, instant WebGL rendering with lifelike PBR materials.
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

    // Spring constants tuned for realistic human head mass & cervical spring recoil
    this.rotStiffness = 190.0;
    this.rotDamping = 13.5;
    this.posStiffness = 150.0;
    this.posDamping = 15.0;

    // Subtle skin squish & tissue elasticity
    this.squish = new THREE.Vector3(1, 1, 1);
    this.squishVelocity = new THREE.Vector3(0, 0, 0);

    // Facial expressions, gaze, and wince state
    this.winceTimer = 0;
    this.winceSide = 'left';
    this.leftBlushIntensity = 0;
    this.rightBlushIntensity = 0;
    this.mouthOpenTarget = 0;
    this.mouthOpenCurrent = 0;

    this._generateProceduralTextures();
    this._buildCharacter();
    this.scene.add(this.group);
  }

  /**
   * Generates high-resolution procedural PBR textures for realistic skin, iris, lips, and hair.
   */
  _generateProceduralTextures() {
    // 1. Realistic Skin Diffuse & Micro-Pore Texture
    const skinCanvas = document.createElement('canvas');
    skinCanvas.width = 512;
    skinCanvas.height = 512;
    const sCtx = skinCanvas.getContext('2d');

    // Base melanin tone with subcutaneous warmth
    const skinGrad = sCtx.createRadialGradient(256, 230, 80, 256, 256, 320);
    skinGrad.addColorStop(0, '#eac0a2'); // Forehead / nose highlight
    skinGrad.addColorStop(0.4, '#e2ab88'); // Natural cheek tone
    skinGrad.addColorStop(0.75, '#d69774'); // Jawline / temple contour
    skinGrad.addColorStop(1, '#c28564'); // Shadow perimeter
    sCtx.fillStyle = skinGrad;
    sCtx.fillRect(0, 0, 512, 512);

    // Subtle epidermal blushing on cheek zones
    const cheekGradL = sCtx.createRadialGradient(160, 290, 10, 160, 290, 85);
    cheekGradL.addColorStop(0, 'rgba(225, 95, 95, 0.28)');
    cheekGradL.addColorStop(1, 'rgba(225, 95, 95, 0)');
    sCtx.fillStyle = cheekGradL;
    sCtx.fillRect(0, 0, 512, 512);

    const cheekGradR = sCtx.createRadialGradient(352, 290, 10, 352, 290, 85);
    cheekGradR.addColorStop(0, 'rgba(225, 95, 95, 0.28)');
    cheekGradR.addColorStop(1, 'rgba(225, 95, 95, 0)');
    sCtx.fillStyle = cheekGradR;
    sCtx.fillRect(0, 0, 512, 512);

    // Skin pore micro-noise
    const skinImgData = sCtx.getImageData(0, 0, 512, 512);
    const sData = skinImgData.data;
    for (let i = 0; i < sData.length; i += 4) {
      const noise = (Math.random() - 0.5) * 14;
      sData[i] = Math.min(255, Math.max(0, sData[i] + noise));
      sData[i + 1] = Math.min(255, Math.max(0, sData[i + 1] + noise * 0.9));
      sData[i + 2] = Math.min(255, Math.max(0, sData[i + 2] + noise * 0.8));
    }
    sCtx.putImageData(skinImgData, 0, 0);

    this.skinTexture = new THREE.CanvasTexture(skinCanvas);
    this.skinTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.skinTexture.wrapT = THREE.ClampToEdgeWrapping;

    // Skin Pore Bump Map
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = 256;
    bumpCanvas.height = 256;
    const bCtx = bumpCanvas.getContext('2d');
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, 256, 256);
    const bImgData = bCtx.getImageData(0, 0, 256, 256);
    const bData = bImgData.data;
    for (let i = 0; i < bData.length; i += 4) {
      const n = (Math.random() - 0.5) * 40;
      const v = Math.min(255, Math.max(0, 128 + n));
      bData[i] = v;
      bData[i + 1] = v;
      bData[i + 2] = v;
    }
    bCtx.putImageData(bImgData, 0, 0);
    this.skinBumpTexture = new THREE.CanvasTexture(bumpCanvas);
    this.skinBumpTexture.wrapS = THREE.RepeatWrapping;
    this.skinBumpTexture.wrapT = THREE.RepeatWrapping;
    this.skinBumpTexture.repeat.set(4, 4);

    // 2. Realistic Eye Iris Texture (Limbal ring, radial stroma fibers, pupil)
    const irisCanvas = document.createElement('canvas');
    irisCanvas.width = 256;
    irisCanvas.height = 256;
    const iCtx = irisCanvas.getContext('2d');

    // Base hazel/blue-grey ocean iris
    const irisGrad = iCtx.createRadialGradient(128, 128, 15, 128, 128, 120);
    irisGrad.addColorStop(0, '#101010'); // Pupil edge
    irisGrad.addColorStop(0.2, '#936a38'); // Amber collarette
    irisGrad.addColorStop(0.55, '#3b757f'); // Ocean hazel-blue stroma
    irisGrad.addColorStop(0.88, '#244855'); // Deep limbal transition
    irisGrad.addColorStop(1, '#0b161b'); // Dark outer limbal ring
    iCtx.fillStyle = irisGrad;
    iCtx.beginPath();
    iCtx.arc(128, 128, 124, 0, Math.PI * 2);
    iCtx.fill();

    // Radial stroma fibers (iris striations)
    iCtx.save();
    iCtx.translate(128, 128);
    for (let a = 0; a < 140; a++) {
      const angle = (a / 140) * Math.PI * 2;
      iCtx.rotate(angle);
      iCtx.strokeStyle = a % 2 === 0 ? 'rgba(220, 240, 255, 0.22)' : 'rgba(215, 175, 110, 0.25)';
      iCtx.lineWidth = 1 + Math.random() * 1.5;
      iCtx.beginPath();
      iCtx.moveTo(25 + Math.random() * 10, 0);
      iCtx.lineTo(115 - Math.random() * 8, 0);
      iCtx.stroke();
      iCtx.rotate(-angle);
    }
    iCtx.restore();

    // Deep black central pupil
    iCtx.fillStyle = '#060709';
    iCtx.beginPath();
    iCtx.arc(128, 128, 38, 0, Math.PI * 2);
    iCtx.fill();

    this.irisTexture = new THREE.CanvasTexture(irisCanvas);

    // 3. Realistic Lip Texture (Vermilion striations & hydration sheen)
    const lipCanvas = document.createElement('canvas');
    lipCanvas.width = 256;
    lipCanvas.height = 128;
    const lCtx = lipCanvas.getContext('2d');
    const lipGrad = lCtx.createLinearGradient(0, 0, 0, 128);
    lipGrad.addColorStop(0, '#c76664');
    lipGrad.addColorStop(0.5, '#ba5755');
    lipGrad.addColorStop(1, '#9b4140');
    lCtx.fillStyle = lipGrad;
    lCtx.fillRect(0, 0, 256, 128);

    // Vertical natural lip creases
    for (let x = 8; x < 248; x += 3 + Math.random() * 4) {
      lCtx.strokeStyle = 'rgba(110, 30, 30, 0.35)';
      lCtx.lineWidth = 1;
      lCtx.beginPath();
      lCtx.moveTo(x, 4);
      lCtx.lineTo(x + (Math.random() - 0.5) * 3, 124);
      lCtx.stroke();
    }
    this.lipTexture = new THREE.CanvasTexture(lipCanvas);
  }

  _buildCharacter() {
    // ----------------------------------------------------
    // 1. Realistic PBR Materials
    // ----------------------------------------------------
    this.skinMat = new THREE.MeshStandardMaterial({
      map: this.skinTexture,
      bumpMap: this.skinBumpTexture,
      bumpScale: 0.012,
      roughness: 0.52,
      metalness: 0.02
    });

    this.hairMat = new THREE.MeshStandardMaterial({
      color: 0x241812, // Rich dark chestnut/espresso
      roughness: 0.65,
      metalness: 0.08
    });

    this.clothingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Premium slate crew-neck
      roughness: 0.85,
      metalness: 0.05
    });

    this.lipMat = new THREE.MeshStandardMaterial({
      map: this.lipTexture,
      roughness: 0.38, // Slight lip moisture gloss
      metalness: 0.04
    });

    // ----------------------------------------------------
    // 2. Realistic Torso Bust & Clavicles Base
    // ----------------------------------------------------
    this.bustGroup = new THREE.Group();
    this.bustGroup.position.y = -1.55;

    // Anatomical chest and shoulders
    const chestGeo = new THREE.CylinderGeometry(0.85, 1.35, 1.45, 32);
    chestGeo.scale(1.22, 1.0, 0.85); // Natural ribcage depth
    const chest = new THREE.Mesh(chestGeo, this.clothingMat);
    chest.castShadow = true;
    chest.receiveShadow = true;
    this.bustGroup.add(chest);

    // Crew-neck collar rim
    const collarGeo = new THREE.TorusGeometry(0.56, 0.065, 16, 32);
    collarGeo.scale(1.0, 1.0, 0.85);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.72, 0);
    this.bustGroup.add(collar);

    // Realistic Anatomical Neck (Sternocleidomastoid tendons)
    const neckGeo = new THREE.CylinderGeometry(0.36, 0.46, 0.75, 28);
    neckGeo.scale(0.92, 1.0, 1.04);
    const neck = new THREE.Mesh(neckGeo, this.skinMat);
    neck.position.y = -0.72;
    neck.castShadow = true;
    neck.receiveShadow = true;
    this.group.add(neck);
    this.group.add(this.bustGroup);

    // ----------------------------------------------------
    // 3. Head Pivot Group (Spring recoil dynamics)
    // ----------------------------------------------------
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 0.2;

    // Sculpted Anatomical Human Head Geometry
    const headGeo = new THREE.SphereGeometry(1.04, 64, 48);
    this._sculptAnatomicalFace(headGeo);

    this.headMesh = new THREE.Mesh(headGeo, this.skinMat);
    this.headMesh.castShadow = true;
    this.headMesh.receiveShadow = true;
    this.headGroup.add(this.headMesh);

    // ----------------------------------------------------
    // 4. Realistic Sculpted Human Nose
    // ----------------------------------------------------
    const noseGroup = new THREE.Group();
    noseGroup.position.set(0, -0.02, 0.96);

    // Nasal bridge (dorsum)
    const bridgeGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.42, 16);
    bridgeGeo.scale(0.85, 1.0, 1.15);
    const bridge = new THREE.Mesh(bridgeGeo, this.skinMat);
    bridge.position.set(0, 0.11, 0.05);
    bridge.rotation.x = 0.22;
    noseGroup.add(bridge);

    // Nasal tip bulb (lobule)
    const tipGeo = new THREE.SphereGeometry(0.125, 20, 20);
    tipGeo.scale(1.0, 0.9, 1.1);
    const tip = new THREE.Mesh(tipGeo, this.skinMat);
    tip.position.set(0, -0.08, 0.15);
    noseGroup.add(tip);

    // Nostril wings (alar lobules)
    const alaGeo = new THREE.SphereGeometry(0.085, 16, 16);
    alaGeo.scale(0.85, 0.8, 0.9);
    const leftAla = new THREE.Mesh(alaGeo, this.skinMat);
    leftAla.position.set(-0.13, -0.11, 0.07);
    const rightAla = new THREE.Mesh(alaGeo, this.skinMat);
    rightAla.position.set(0.13, -0.11, 0.07);
    noseGroup.add(leftAla);
    noseGroup.add(rightAla);

    // Shaded nostril cavities
    const nostrilCavityMat = new THREE.MeshBasicMaterial({ color: 0x1c0f0b });
    const nostrilGeo = new THREE.SphereGeometry(0.045, 12, 12);
    nostrilGeo.scale(0.8, 0.5, 1.2);
    const leftNostril = new THREE.Mesh(nostrilGeo, nostrilCavityMat);
    leftNostril.position.set(-0.065, -0.15, 0.08);
    const rightNostril = new THREE.Mesh(nostrilGeo, nostrilCavityMat);
    rightNostril.position.set(0.065, -0.15, 0.08);
    noseGroup.add(leftNostril);
    noseGroup.add(rightNostril);

    this.headGroup.add(noseGroup);

    // ----------------------------------------------------
    // 5. Realistic Human Eyes (Sclera, Iris, Cornea, Eyelids)
    // ----------------------------------------------------
    const scleraMat = new THREE.MeshStandardMaterial({
      color: 0xfcf9f6,
      roughness: 0.22,
      metalness: 0.02
    });

    const corneaMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.04,
      metalness: 0.08,
      transparent: true,
      opacity: 0.88
    });

    const irisMat = new THREE.MeshBasicMaterial({
      map: this.irisTexture
    });

    // Eye sockets helper function
    const createRealisticEye = (isLeft) => {
      const eyeRig = new THREE.Group();
      const xPos = isLeft ? -0.37 : 0.37;
      eyeRig.position.set(xPos, 0.18, 0.86);

      // 1. Sclera Eyeball
      const eyeballGeo = new THREE.SphereGeometry(0.19, 28, 28);
      eyeballGeo.scale(1.0, 0.95, 0.92);
      const eyeball = new THREE.Mesh(eyeballGeo, scleraMat);
      eyeRig.add(eyeball);

      // 2. Iris Disc
      const irisGeo = new THREE.CircleGeometry(0.095, 32);
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.set(0, 0, 0.178);
      eyeRig.add(iris);

      // 3. Clear Cornea Lens Dome (Specular catchlights)
      const corneaGeo = new THREE.SphereGeometry(0.105, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.45);
      const cornea = new THREE.Mesh(corneaGeo, corneaMat);
      cornea.position.set(0, 0, 0.12);
      cornea.rotation.x = Math.PI / 2;
      eyeRig.add(cornea);

      // 4. Upper Eyelid / Lash Fold (Reacts dynamically to slaps & winces)
      const lidGeo = new THREE.SphereGeometry(0.205, 24, 16, 0, Math.PI, 0, Math.PI * 0.55);
      lidGeo.scale(1.02, 0.95, 0.95);
      const upperLid = new THREE.Mesh(lidGeo, this.skinMat);
      upperLid.rotation.x = -0.55;
      upperLid.position.set(0, 0.02, 0.02);
      eyeRig.add(upperLid);

      // Fine dark lash line
      const lashGeo = new THREE.TorusGeometry(0.18, 0.012, 8, 24, Math.PI * 0.7);
      const lashMat = new THREE.MeshBasicMaterial({ color: 0x1f140e });
      const lash = new THREE.Mesh(lashGeo, lashMat);
      lash.position.set(0, 0.07, 0.12);
      lash.rotation.z = isLeft ? 0.12 : -0.12;
      eyeRig.add(lash);

      return { rig: eyeRig, iris, cornea, upperLid };
    };

    this.leftEye = createRealisticEye(true);
    this.rightEye = createRealisticEye(false);
    this.headGroup.add(this.leftEye.rig);
    this.headGroup.add(this.rightEye.rig);

    // ----------------------------------------------------
    // 6. Realistic Eyebrows
    // ----------------------------------------------------
    const browMat = new THREE.MeshStandardMaterial({
      color: 0x22150e,
      roughness: 0.8
    });

    const createEyebrow = (isLeft) => {
      const browGroup = new THREE.Group();
      const xPos = isLeft ? -0.37 : 0.37;
      browGroup.position.set(xPos, 0.41, 0.93);

      const browGeo = new THREE.CylinderGeometry(0.042, 0.018, 0.46, 16);
      browGeo.scale(0.85, 1.0, 0.55);
      const brow = new THREE.Mesh(browGeo, browMat);
      brow.rotation.z = isLeft ? Math.PI / 2 - 0.12 : -Math.PI / 2 + 0.12;
      brow.rotation.y = isLeft ? -0.22 : 0.22;
      browGroup.add(brow);
      return browGroup;
    };

    this.leftBrow = createEyebrow(true);
    this.rightBrow = createEyebrow(false);
    this.headGroup.add(this.leftBrow);
    this.headGroup.add(this.rightBrow);

    // ----------------------------------------------------
    // 7. Realistic Human Mouth & Lips
    // ----------------------------------------------------
    this.mouthGroup = new THREE.Group();
    this.mouthGroup.position.set(0, -0.42, 0.89);

    // Upper lip with Cupid's bow contour
    const upperLipGeo = new THREE.CylinderGeometry(0.052, 0.042, 0.44, 20);
    upperLipGeo.scale(0.9, 0.7, 1.0);
    this.upperLip = new THREE.Mesh(upperLipGeo, this.lipMat);
    this.upperLip.rotation.z = Math.PI / 2;
    this.upperLip.position.set(0, 0.038, 0.04);
    this.mouthGroup.add(this.upperLip);

    // Lower fuller lip
    const lowerLipGeo = new THREE.CylinderGeometry(0.065, 0.052, 0.42, 20);
    lowerLipGeo.scale(0.95, 0.85, 1.1);
    this.lowerLip = new THREE.Mesh(lowerLipGeo, this.lipMat);
    this.lowerLip.rotation.z = Math.PI / 2;
    this.lowerLip.position.set(0, -0.045, 0.035);
    this.mouthGroup.add(this.lowerLip);

    // Realistic inner mouth cavity and teeth ridge
    const teethMat = new THREE.MeshStandardMaterial({ color: 0xf3f1ee, roughness: 0.3 });
    const teethGeo = new THREE.BoxGeometry(0.3, 0.045, 0.08);
    this.teeth = new THREE.Mesh(teethGeo, teethMat);
    this.teeth.position.set(0, 0.005, -0.02);
    this.mouthGroup.add(this.teeth);

    this.mouth = this.mouthGroup; // backward compatibility
    this.headGroup.add(this.mouthGroup);

    // ----------------------------------------------------
    // 8. Realistic Human Ears
    // ----------------------------------------------------
    const createAnatomicalEar = (isLeft) => {
      const earRig = new THREE.Group();
      const xPos = isLeft ? -1.06 : 1.06;
      earRig.position.set(xPos, 0.04, -0.06);

      // Outer Helix Rim
      const helixGeo = new THREE.TorusGeometry(0.24, 0.045, 14, 24, Math.PI * 1.35);
      helixGeo.scale(0.65, 1.25, 0.7);
      const helix = new THREE.Mesh(helixGeo, this.skinMat);
      helix.rotation.z = isLeft ? -0.2 : 0.2;
      helix.rotation.y = isLeft ? 0.35 : -0.35;
      earRig.add(helix);

      // Concha Bowl & Lobule (Earlobe)
      const lobeGeo = new THREE.SphereGeometry(0.12, 16, 16);
      lobeGeo.scale(0.6, 1.1, 0.75);
      const lobe = new THREE.Mesh(lobeGeo, this.skinMat);
      lobe.position.set(0, -0.22, 0);
      earRig.add(lobe);

      return earRig;
    };

    this.leftEar = createAnatomicalEar(true);
    this.rightEar = createAnatomicalEar(false);
    this.headGroup.add(this.leftEar);
    this.headGroup.add(this.rightEar);

    // ----------------------------------------------------
    // 9. Modern Styled Realistic Hair
    // ----------------------------------------------------
    const hairGroup = new THREE.Group();

    // Main cranial hair volume
    const cranialHairGeo = new THREE.SphereGeometry(1.08, 36, 28);
    cranialHairGeo.scale(1.02, 0.98, 1.04);
    const cranialHair = new THREE.Mesh(cranialHairGeo, this.hairMat);
    cranialHair.position.set(0, 0.35, -0.12);
    cranialHair.castShadow = true;
    hairGroup.add(cranialHair);

    // Styled modern textured hair quiff / top sweep
    const topHairGeo = new THREE.CylinderGeometry(0.55, 0.95, 0.85, 24);
    topHairGeo.scale(1.15, 0.7, 1.25);
    const topHair = new THREE.Mesh(topHairGeo, this.hairMat);
    topHair.position.set(0.06, 1.06, 0.18);
    topHair.rotation.x = -0.32;
    topHair.rotation.z = -0.1;
    topHair.castShadow = true;
    hairGroup.add(topHair);

    // Front textured hair fringe strands
    for (let f = -3; f <= 3; f++) {
      const lockGeo = new THREE.ConeGeometry(0.16, 0.55, 12);
      lockGeo.scale(0.75, 1.0, 0.45);
      const lock = new THREE.Mesh(lockGeo, this.hairMat);
      lock.position.set(f * 0.16 + 0.05, 1.15, 0.68 + Math.abs(f) * -0.05);
      lock.rotation.x = 0.55 + Math.random() * 0.1;
      lock.rotation.z = (f * -0.12) + (Math.random() - 0.5) * 0.1;
      hairGroup.add(lock);
    }

    // Sideburns and temple tapers
    const sideburnGeo = new THREE.BoxGeometry(0.08, 0.38, 0.16);
    const leftSideburn = new THREE.Mesh(sideburnGeo, this.hairMat);
    leftSideburn.position.set(-1.02, 0.22, 0.14);
    const rightSideburn = new THREE.Mesh(sideburnGeo, this.hairMat);
    rightSideburn.position.set(1.02, 0.22, 0.14);
    hairGroup.add(leftSideburn);
    hairGroup.add(rightSideburn);

    this.headGroup.add(hairGroup);

    // ----------------------------------------------------
    // 10. Organic Cheek Blushing Overlays (Erythema capillary response)
    // ----------------------------------------------------
    const blushGeo = new THREE.SphereGeometry(0.38, 24, 24);
    blushGeo.scale(1.15, 0.85, 0.35);

    this.leftBlushMat = new THREE.MeshBasicMaterial({
      color: 0xff2448,
      transparent: true,
      opacity: 0.0
    });
    this.leftBlush = new THREE.Mesh(blushGeo, this.leftBlushMat);
    this.leftBlush.position.set(-0.62, -0.16, 0.84);
    this.leftBlush.rotation.y = 0.42;
    this.headGroup.add(this.leftBlush);

    this.rightBlushMat = new THREE.MeshBasicMaterial({
      color: 0xff2448,
      transparent: true,
      opacity: 0.0
    });
    this.rightBlush = new THREE.Mesh(blushGeo, this.rightBlushMat);
    this.rightBlush.position.set(0.62, -0.16, 0.84);
    this.rightBlush.rotation.y = -0.42;
    this.headGroup.add(this.rightBlush);

    // ----------------------------------------------------
    // 11. Head Hitbox (Bounding sphere matching realistic facial dimensions)
    // ----------------------------------------------------
    this.hitRadius = 1.18;
    this.hitCenter = new THREE.Vector3(0, 0.15, 0.42);

    this.group.add(this.headGroup);
  }

  /**
   * Mathematically sculpts a high-tessellation sphere into lifelike human facial anatomy.
   */
  _sculptAnatomicalFace(geometry) {
    const pos = geometry.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      // 1. Overall Head Proportions (Cranial oval)
      v.x *= 0.98;
      v.y *= 1.22;
      v.z *= 1.06;

      // 2. Temples flattening
      if (Math.abs(v.x) > 0.65 && v.y > 0.2 && v.z > 0.2) {
        v.x *= 0.92;
      }

      // 3. Eye Orbit Cavities (Recessing orbits backward)
      const eyeDistL = Math.hypot(v.x + 0.37, v.y - 0.22);
      const eyeDistR = Math.hypot(v.x - 0.37, v.y - 0.22);
      if (v.z > 0.4) {
        if (eyeDistL < 0.28) {
          const depthL = (1 - eyeDistL / 0.28) * 0.16;
          v.z -= depthL;
        }
        if (eyeDistR < 0.28) {
          const depthR = (1 - eyeDistR / 0.28) * 0.16;
          v.z -= depthR;
        }
      }

      // 4. Supraorbital Brow Ridge (Shelf above eyes)
      if (v.y > 0.32 && v.y < 0.48 && Math.abs(v.x) < 0.65 && v.z > 0.5) {
        v.z += 0.08 * (1 - Math.abs(v.y - 0.4) / 0.12);
      }

      // 5. Zygomatic Cheekbones (Flaring outward & forward)
      if (Math.abs(v.x) > 0.45 && Math.abs(v.x) < 0.85 && v.y > -0.25 && v.y < 0.15 && v.z > 0.3) {
        v.z += 0.09;
        v.x *= 1.05;
      }

      // 6. Defined Human Jawline & Mandible Taper
      if (v.y < -0.15) {
        const jawTaper = 1.0 - ((-v.y - 0.15) / 1.1) * 0.32;
        v.x *= Math.max(0.68, jawTaper);
      }

      // 7. Chin / Mental Protuberance
      if (v.y < -0.65 && v.y > -1.05 && Math.abs(v.x) < 0.35 && v.z > 0.3) {
        v.z += 0.14 * (1 - Math.abs(v.x) / 0.35);
      }

      // 8. Philtrum Groove (Subtle indentation between nose and upper lip)
      if (Math.abs(v.x) < 0.08 && v.y > -0.42 && v.y < -0.22 && v.z > 0.7) {
        v.z -= 0.04;
      }

      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geometry.computeVertexNormals();
  }

  /**
   * Applies an instantaneous physical impulse on slap impact.
   * @param {THREE.Vector3} swipeDirection - Normalized swipe vector
   * @param {number} force - Slap intensity multiplier [0.5 - 2.8]
   * @param {string} hitSide - 'left' or 'right' cheek
   */
  applySlapImpulse(swipeDirection, force, hitSide = 'left') {
    const power = Math.min(3.0, Math.max(0.6, force));

    // 1. Angular impulse: Head snaps around Yaw (Y), Pitch (X), and Roll (Z) axes
    const yawImpulse = swipeDirection.x * 2.85 * power;
    const pitchImpulse = -Math.abs(swipeDirection.y || 0.32) * 1.55 * power;
    const rollImpulse = -swipeDirection.x * 0.95 * power;

    this.rotVelocity.x += pitchImpulse;
    this.rotVelocity.y += yawImpulse;
    this.rotVelocity.z += rollImpulse;

    // 2. Linear displacement recoil (Head gets pushed away from impact)
    this.posVelocity.x += swipeDirection.x * 0.42 * power;
    this.posVelocity.y -= 0.14 * power;
    this.posVelocity.z -= 0.32 * power;

    // 3. Dynamic tissue squish and recoil
    this.squishVelocity.set(-0.2 * power, 0.28 * power, -0.12 * power);

    // 4. Activate realistic erythema cheek blush
    if (hitSide === 'left' || swipeDirection.x > 0) {
      this.leftBlushIntensity = Math.min(1.0, this.leftBlushIntensity + 0.7 * power);
    } else {
      this.rightBlushIntensity = Math.min(1.0, this.rightBlushIntensity + 0.7 * power);
    }

    // 5. Trigger realistic wince / flinch reaction
    this.winceTimer = Math.min(1.5, 0.35 + power * 0.35);
    this.winceSide = hitSide;

    // 6. Shock intake of breath (Mouth opens)
    this.mouthOpenTarget = Math.min(1.0, 0.4 + power * 0.3);
  }

  /**
   * Updates spring-damper physics and lifelike facial expressions every frame (60+ FPS).
   */
  update(dt, pointerNormalized) {
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

    // --- 3. Subtle Elastic Squish & Recovery ---
    const squishTarget = new THREE.Vector3(1, 1, 1);
    const squishDisp = this.squish.clone().sub(squishTarget);
    const squishAccel = squishDisp.multiplyScalar(-240).sub(this.squishVelocity.clone().multiplyScalar(18));
    this.squishVelocity.add(squishAccel.multiplyScalar(step));
    this.squish.add(this.squishVelocity.clone().multiplyScalar(step));
    this.headMesh.scale.set(this.squish.x, this.squish.y, this.squish.z);

    // --- 4. Blush Capillary Decay ---
    this.leftBlushIntensity = Math.max(0, this.leftBlushIntensity - step * 0.22);
    this.rightBlushIntensity = Math.max(0, this.rightBlushIntensity - step * 0.22);
    this.leftBlushMat.opacity = this.leftBlushIntensity;
    this.rightBlushMat.opacity = this.rightBlushIntensity;

    // --- 5. Lifelike Eye Gaze & Dynamic Wincing / Squinting ---
    if (this.winceTimer > 0) {
      this.winceTimer -= step;

      // Realistic flinch: squints eye on struck side
      const winceAmount = Math.sin((this.winceTimer / 1.5) * Math.PI);
      if (this.winceSide === 'left') {
        this.leftEye.upperLid.rotation.x = THREE.MathUtils.lerp(-0.55, 0.45, winceAmount);
        this.rightEye.upperLid.rotation.x = THREE.MathUtils.lerp(-0.55, 0.1, winceAmount);
        this.leftBrow.rotation.z = -0.22;
      } else {
        this.rightEye.upperLid.rotation.x = THREE.MathUtils.lerp(-0.55, 0.45, winceAmount);
        this.leftEye.upperLid.rotation.x = THREE.MathUtils.lerp(-0.55, 0.1, winceAmount);
        this.rightBrow.rotation.z = 0.22;
      }
    } else {
      // Normal relaxed eyelids
      this.leftEye.upperLid.rotation.x = THREE.MathUtils.lerp(this.leftEye.upperLid.rotation.x, -0.55, 0.12);
      this.rightEye.upperLid.rotation.x = THREE.MathUtils.lerp(this.rightEye.upperLid.rotation.x, -0.55, 0.12);

      // Eyebrows return to natural resting arch
      this.leftBrow.rotation.z = THREE.MathUtils.lerp(this.leftBrow.rotation.z, 0, 0.1);
      this.rightBrow.rotation.z = THREE.MathUtils.lerp(this.rightBrow.rotation.z, 0, 0.1);

      // Realistic Human Micro-Gaze Tracking
      const gazeX = THREE.MathUtils.clamp((pointerNormalized?.x || 0) * 0.045, -0.045, 0.045);
      const gazeY = THREE.MathUtils.clamp((pointerNormalized?.y || 0) * 0.035, -0.035, 0.035);

      this.leftEye.iris.position.x = THREE.MathUtils.lerp(this.leftEye.iris.position.x, gazeX, 0.18);
      this.leftEye.iris.position.y = THREE.MathUtils.lerp(this.leftEye.iris.position.y, gazeY, 0.18);
      this.rightEye.iris.position.x = THREE.MathUtils.lerp(this.rightEye.iris.position.x, gazeX, 0.18);
      this.rightEye.iris.position.y = THREE.MathUtils.lerp(this.rightEye.iris.position.y, gazeY, 0.18);
    }

    // --- 6. Mouth Parting / Recovery on Impact ---
    this.mouthOpenTarget = Math.max(0, this.mouthOpenTarget - step * 1.6);
    this.mouthOpenCurrent = THREE.MathUtils.lerp(this.mouthOpenCurrent, this.mouthOpenTarget, 0.18);
    this.lowerLip.position.y = -0.045 - this.mouthOpenCurrent * 0.09;
    this.teeth.visible = this.mouthOpenCurrent > 0.05;
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
