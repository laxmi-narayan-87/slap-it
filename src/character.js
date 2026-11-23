import * as THREE from 'three';

/**
 * Procedural Realistic 3D Human Character with Damped Harmonic Spring Physics
 * Anatomically sculpted craniofacial geometry, seamless facial features,
 * lifelike PBR skin texturing with cylindrical UV mapping, and responsive physics.
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
   * Generates high-resolution procedural PBR textures for realistic skin, iris, and lips.
   * Uses cylindrical coordinate mapping so facial features align with mathematical symmetry.
   */
  _generateProceduralTextures() {
    // 1. Realistic Skin Diffuse Canvas (1024x1024)
    // Symmetrical frontal center is at x = 512 (u = 0.5)
    const skinCanvas = document.createElement('canvas');
    skinCanvas.width = 1024;
    skinCanvas.height = 1024;
    const sCtx = skinCanvas.getContext('2d');

    // Base melanin tone with subcutaneous warmth
    const baseGrad = sCtx.createLinearGradient(0, 0, 0, 1024);
    baseGrad.addColorStop(0, '#f2ceb3');   // Crown / forehead highlight
    baseGrad.addColorStop(0.35, '#e5bba0'); // Upper face
    baseGrad.addColorStop(0.65, '#dfa888'); // Mid face & cheeks
    baseGrad.addColorStop(0.85, '#d39875'); // Jawline
    baseGrad.addColorStop(1, '#c58763');    // Submandibular shadow
    sCtx.fillStyle = baseGrad;
    sCtx.fillRect(0, 0, 1024, 1024);

    // Forehead soft illumination zone
    const foreheadGlow = sCtx.createRadialGradient(512, 280, 20, 512, 280, 220);
    foreheadGlow.addColorStop(0, 'rgba(255, 235, 220, 0.45)');
    foreheadGlow.addColorStop(1, 'rgba(255, 235, 220, 0)');
    sCtx.fillStyle = foreheadGlow;
    sCtx.fillRect(0, 0, 1024, 1024);

    // Symmetrical epidermal cheek capillary blush zones (u = 0.42 and u = 0.58)
    const cheekL = sCtx.createRadialGradient(610, 580, 20, 610, 580, 160);
    cheekL.addColorStop(0, 'rgba(235, 95, 95, 0.32)');
    cheekL.addColorStop(0.7, 'rgba(225, 110, 100, 0.15)');
    cheekL.addColorStop(1, 'rgba(225, 110, 100, 0)');
    sCtx.fillStyle = cheekL;
    sCtx.fillRect(0, 0, 1024, 1024);

    const cheekR = sCtx.createRadialGradient(414, 580, 20, 414, 580, 160);
    cheekR.addColorStop(0, 'rgba(235, 95, 95, 0.32)');
    cheekR.addColorStop(0.7, 'rgba(225, 110, 100, 0.15)');
    cheekR.addColorStop(1, 'rgba(225, 110, 100, 0)');
    sCtx.fillStyle = cheekR;
    sCtx.fillRect(0, 0, 1024, 1024);

    // Nasal bridge & tip subtle warmth
    const noseWarmth = sCtx.createRadialGradient(512, 530, 10, 512, 530, 65);
    noseWarmth.addColorStop(0, 'rgba(225, 105, 95, 0.28)');
    noseWarmth.addColorStop(1, 'rgba(225, 105, 95, 0)');
    sCtx.fillStyle = noseWarmth;
    sCtx.fillRect(0, 0, 1024, 1024);

    // Natural vermilion lip shading with Cupid's bow contour
    const lipGrad = sCtx.createLinearGradient(0, 680, 0, 750);
    lipGrad.addColorStop(0, 'rgba(195, 85, 85, 0.85)');
    lipGrad.addColorStop(0.45, 'rgba(215, 95, 95, 0.95)');
    lipGrad.addColorStop(0.55, 'rgba(150, 45, 45, 0.9)');
    lipGrad.addColorStop(1, 'rgba(185, 75, 75, 0.8)');
    sCtx.fillStyle = lipGrad;
    sCtx.beginPath();
    // Cupid's bow upper lip
    sCtx.moveTo(435, 710);
    sCtx.bezierCurveTo(460, 685, 495, 690, 505, 698);
    sCtx.lineTo(512, 703);
    sCtx.lineTo(519, 698);
    sCtx.bezierCurveTo(529, 690, 564, 685, 589, 710);
    // Lower fuller lip
    sCtx.bezierCurveTo(570, 745, 454, 745, 435, 710);
    sCtx.closePath();
    sCtx.fill();

    // Natural lip micro-striations
    for (let x = 445; x < 579; x += 4 + Math.random() * 3) {
      sCtx.strokeStyle = 'rgba(120, 30, 30, 0.25)';
      sCtx.lineWidth = 1;
      sCtx.beginPath();
      sCtx.moveTo(x, 695);
      sCtx.lineTo(x + (Math.random() - 0.5) * 4, 735);
      sCtx.stroke();
    }

    // Natural eyebrow stipples (u ~ 0.42 and u ~ 0.58)
    const drawEyebrowTexture = (centerX, isLeft) => {
      sCtx.fillStyle = 'rgba(35, 20, 14, 0.75)';
      for (let i = 0; i < 90; i++) {
        const prog = (i / 90) * 2 - 1;
        const x = centerX + prog * 65 + (Math.random() - 0.5) * 8;
        const arch = Math.sin((i / 90) * Math.PI) * 14;
        const y = 375 - arch + (Math.random() - 0.5) * 10;
        sCtx.beginPath();
        sCtx.arc(x, y, 1.2 + Math.random() * 1.0, 0, Math.PI * 2);
        sCtx.fill();
      }
    };
    drawEyebrowTexture(610, true);
    drawEyebrowTexture(414, false);

    // Micro-pore organic dermal noise
    const skinImgData = sCtx.getImageData(0, 0, 1024, 1024);
    const sData = skinImgData.data;
    for (let i = 0; i < sData.length; i += 4) {
      const noise = (Math.random() - 0.5) * 10;
      sData[i] = Math.min(255, Math.max(0, sData[i] + noise));
      sData[i + 1] = Math.min(255, Math.max(0, sData[i + 1] + noise * 0.9));
      sData[i + 2] = Math.min(255, Math.max(0, sData[i + 2] + noise * 0.8));
    }
    sCtx.putImageData(skinImgData, 0, 0);

    this.skinTexture = new THREE.CanvasTexture(skinCanvas);
    this.skinTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.skinTexture.wrapT = THREE.ClampToEdgeWrapping;

    // 2. Skin Roughness Map (Specular hydration on lips, inner eye corners, matte on cheeks)
    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = 512;
    roughCanvas.height = 512;
    const rCtx = roughCanvas.getContext('2d');
    rCtx.fillStyle = '#909090'; // default matte skin (roughness ~0.56)
    rCtx.fillRect(0, 0, 512, 512);

    // Lips gloss (roughness ~0.26)
    rCtx.fillStyle = '#424242';
    rCtx.beginPath();
    rCtx.ellipse(256, 355, 45, 18, 0, 0, Math.PI * 2);
    rCtx.fill();

    // Forehead subtle sheen
    rCtx.fillStyle = '#656565';
    rCtx.beginPath();
    rCtx.ellipse(256, 140, 75, 40, 0, 0, Math.PI * 2);
    rCtx.fill();

    this.skinRoughTexture = new THREE.CanvasTexture(roughCanvas);

    // 3. Micro-Pore Bump Map
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = 256;
    bumpCanvas.height = 256;
    const bCtx = bumpCanvas.getContext('2d');
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, 256, 256);
    const bImgData = bCtx.getImageData(0, 0, 256, 256);
    const bData = bImgData.data;
    for (let i = 0; i < bData.length; i += 4) {
      const n = (Math.random() - 0.5) * 35;
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

    // 4. Realistic Hazel/Ocean Iris Texture (512x512)
    const irisCanvas = document.createElement('canvas');
    irisCanvas.width = 512;
    irisCanvas.height = 512;
    const iCtx = irisCanvas.getContext('2d');

    // Base ocean/hazel stroma gradient
    const irisGrad = iCtx.createRadialGradient(256, 256, 30, 256, 256, 240);
    irisGrad.addColorStop(0, '#111111');   // Pupil boundary
    irisGrad.addColorStop(0.18, '#8b6938'); // Amber collarette
    irisGrad.addColorStop(0.55, '#3b7882'); // Deep ocean teal-hazel
    irisGrad.addColorStop(0.88, '#1e4854'); // Outer stroma
    irisGrad.addColorStop(0.97, '#0b1e24'); // Dark limbal ring
    irisGrad.addColorStop(1, '#051014');
    iCtx.fillStyle = irisGrad;
    iCtx.fillRect(0, 0, 512, 512);

    // Radial stroma trabeculae fibers
    for (let a = 0; a < 360; a += 1.2) {
      const rad = (a * Math.PI) / 180;
      const rInner = 60 + Math.random() * 20;
      const rOuter = 210 + Math.random() * 25;
      iCtx.strokeStyle = a % 4 === 0 ? 'rgba(215, 185, 125, 0.4)' : 'rgba(100, 195, 205, 0.22)';
      iCtx.lineWidth = 1 + Math.random() * 1.5;
      iCtx.beginPath();
      iCtx.moveTo(256 + Math.cos(rad) * rInner, 256 + Math.sin(rad) * rInner);
      iCtx.lineTo(256 + Math.cos(rad) * rOuter, 256 + Math.sin(rad) * rOuter);
      iCtx.stroke();
    }

    // Central deep black pupil
    iCtx.fillStyle = '#080808';
    iCtx.beginPath();
    iCtx.arc(256, 256, 55, 0, Math.PI * 2);
    iCtx.fill();

    this.irisTexture = new THREE.CanvasTexture(irisCanvas);
  }

  _buildCharacter() {
    // ----------------------------------------------------
    // 1. Realistic PBR Materials
    // ----------------------------------------------------
    this.skinMat = new THREE.MeshStandardMaterial({
      map: this.skinTexture,
      roughnessMap: this.skinRoughTexture,
      bumpMap: this.skinBumpTexture,
      bumpScale: 0.012,
      roughness: 0.54,
      metalness: 0.02
    });

    this.neckSkinMat = new THREE.MeshStandardMaterial({
      color: 0xdfa888,
      roughness: 0.58,
      metalness: 0.02
    });

    this.hairMat = new THREE.MeshStandardMaterial({
      color: 0x221610, // Rich dark espresso
      roughness: 0.65,
      metalness: 0.06
    });

    this.clothingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Slate crew-neck
      roughness: 0.85,
      metalness: 0.04
    });

    // ----------------------------------------------------
    // 2. Realistic Torso Bust & Neck Base
    // ----------------------------------------------------
    this.bustGroup = new THREE.Group();
    this.bustGroup.position.y = -1.55;

    const chestGeo = new THREE.CylinderGeometry(0.85, 1.35, 1.45, 32);
    chestGeo.scale(1.22, 1.0, 0.85);
    const chest = new THREE.Mesh(chestGeo, this.clothingMat);
    chest.castShadow = true;
    chest.receiveShadow = true;
    this.bustGroup.add(chest);

    const collarGeo = new THREE.TorusGeometry(0.56, 0.065, 16, 32);
    collarGeo.scale(1.0, 1.0, 0.85);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.72, 0);
    this.bustGroup.add(collar);

    const neckGeo = new THREE.CylinderGeometry(0.36, 0.46, 0.75, 28);
    neckGeo.scale(0.92, 1.0, 1.04);
    const neck = new THREE.Mesh(neckGeo, this.neckSkinMat);
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

    // Sculpted Seamless Anatomical Human Head Geometry
    const headGeo = new THREE.SphereGeometry(1.05, 96, 80);
    this._sculptRealisticHead(headGeo);

    this.headMesh = new THREE.Mesh(headGeo, this.skinMat);
    this.headMesh.castShadow = true;
    this.headMesh.receiveShadow = true;
    this.headGroup.add(this.headMesh);

    // ----------------------------------------------------
    // 4. Realistic Human Eyes (Sclera, Iris, Cornea, Eyelids)
    // ----------------------------------------------------
    const scleraMat = new THREE.MeshStandardMaterial({
      color: 0xfbf8f4,
      roughness: 0.24,
      metalness: 0.02
    });

    const corneaMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.03,
      metalness: 0.08,
      transparent: true,
      opacity: 0.88
    });

    const irisMat = new THREE.MeshBasicMaterial({
      map: this.irisTexture
    });

    const createRealisticEye = (isLeft) => {
      const eyeRig = new THREE.Group();
      const xPos = isLeft ? -0.37 : 0.37;
      eyeRig.position.set(xPos, 0.18, 0.84);

      // 1. Sclera Eyeball
      const eyeballGeo = new THREE.SphereGeometry(0.185, 28, 28);
      eyeballGeo.scale(1.0, 0.95, 0.92);
      const eyeball = new THREE.Mesh(eyeballGeo, scleraMat);
      eyeRig.add(eyeball);

      // 2. Iris Disc
      const irisGeo = new THREE.CircleGeometry(0.092, 32);
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.set(0, 0, 0.174);
      eyeRig.add(iris);

      // 3. Clear Cornea Lens Dome (Specular catchlights)
      const corneaGeo = new THREE.SphereGeometry(0.102, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.45);
      const cornea = new THREE.Mesh(corneaGeo, corneaMat);
      cornea.position.set(0, 0, 0.118);
      cornea.rotation.x = Math.PI / 2;
      eyeRig.add(cornea);

      // 4. Upper Eyelid (Reacts dynamically to slaps & winces)
      const lidGeo = new THREE.SphereGeometry(0.198, 24, 16, 0, Math.PI, 0, Math.PI * 0.55);
      lidGeo.scale(1.02, 0.95, 0.95);
      const upperLid = new THREE.Mesh(lidGeo, this.neckSkinMat);
      upperLid.rotation.x = -0.55;
      upperLid.position.set(0, 0.02, 0.02);
      eyeRig.add(upperLid);

      // Fine dark lash line
      const lashGeo = new THREE.TorusGeometry(0.175, 0.012, 8, 24, Math.PI * 0.7);
      const lashMat = new THREE.MeshBasicMaterial({ color: 0x1a120c });
      const lash = new THREE.Mesh(lashGeo, lashMat);
      lash.position.set(0, 0.07, 0.115);
      lash.rotation.z = isLeft ? 0.12 : -0.12;
      eyeRig.add(lash);

      return { rig: eyeRig, iris, cornea, upperLid };
    };

    this.leftEye = createRealisticEye(true);
    this.rightEye = createRealisticEye(false);
    this.headGroup.add(this.leftEye.rig);
    this.headGroup.add(this.rightEye.rig);

    // ----------------------------------------------------
    // 5. Realistic Eyebrows
    // ----------------------------------------------------
    const browMat = new THREE.MeshStandardMaterial({
      color: 0x22150e,
      roughness: 0.8
    });

    const createEyebrow = (isLeft) => {
      const browGroup = new THREE.Group();
      const xPos = isLeft ? -0.37 : 0.37;
      browGroup.position.set(xPos, 0.41, 0.93);

      const browGeo = new THREE.CylinderGeometry(0.038, 0.016, 0.46, 16);
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
    // 6. Realistic Human Ears
    // ----------------------------------------------------
    const createAnatomicalEar = (isLeft) => {
      const earRig = new THREE.Group();
      const xPos = isLeft ? -1.04 : 1.04;
      earRig.position.set(xPos, 0.04, -0.06);

      const helixGeo = new THREE.TorusGeometry(0.23, 0.042, 14, 24, Math.PI * 1.35);
      helixGeo.scale(0.65, 1.25, 0.7);
      const helix = new THREE.Mesh(helixGeo, this.neckSkinMat);
      helix.rotation.z = isLeft ? -0.2 : 0.2;
      helix.rotation.y = isLeft ? 0.35 : -0.35;
      earRig.add(helix);

      const lobeGeo = new THREE.SphereGeometry(0.115, 16, 16);
      lobeGeo.scale(0.6, 1.1, 0.75);
      const lobe = new THREE.Mesh(lobeGeo, this.neckSkinMat);
      lobe.position.set(0, -0.22, 0);
      earRig.add(lobe);

      return earRig;
    };

    this.leftEar = createAnatomicalEar(true);
    this.rightEar = createAnatomicalEar(false);
    this.headGroup.add(this.leftEar);
    this.headGroup.add(this.rightEar);

    // ----------------------------------------------------
    // 7. Modern Styled Realistic Hair
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
      const lockGeo = new THREE.ConeGeometry(0.15, 0.52, 12);
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
    leftSideburn.position.set(-1.01, 0.22, 0.14);
    const rightSideburn = new THREE.Mesh(sideburnGeo, this.hairMat);
    rightSideburn.position.set(1.01, 0.22, 0.14);
    hairGroup.add(leftSideburn);
    hairGroup.add(rightSideburn);

    this.headGroup.add(hairGroup);

    // ----------------------------------------------------
    // 8. Cheek Blushing Overlays (Erythema response)
    // ----------------------------------------------------
    const blushGeo = new THREE.SphereGeometry(0.36, 24, 24);
    blushGeo.scale(1.15, 0.85, 0.35);

    this.leftBlushMat = new THREE.MeshBasicMaterial({
      color: 0xee3248,
      transparent: true,
      opacity: 0.0
    });
    this.leftBlush = new THREE.Mesh(blushGeo, this.leftBlushMat);
    this.leftBlush.position.set(-0.62, -0.16, 0.84);
    this.leftBlush.rotation.y = 0.42;
    this.headGroup.add(this.leftBlush);

    this.rightBlushMat = new THREE.MeshBasicMaterial({
      color: 0xee3248,
      transparent: true,
      opacity: 0.0
    });
    this.rightBlush = new THREE.Mesh(blushGeo, this.rightBlushMat);
    this.rightBlush.position.set(0.62, -0.16, 0.84);
    this.rightBlush.rotation.y = -0.42;
    this.headGroup.add(this.rightBlush);

    // ----------------------------------------------------
    // 9. Head Hitbox
    // ----------------------------------------------------
    this.hitRadius = 1.18;
    this.hitCenter = new THREE.Vector3(0, 0.15, 0.42);

    this.group.add(this.headGroup);
  }

  /**
   * Sculpt high-detail craniofacial human anatomy directly into the head mesh vertices,
   * and apply symmetrical cylindrical UV mapping centered on the front face (+Z).
   */
  _sculptRealisticHead(geometry) {
    const pos = geometry.attributes.position;
    const uvs = geometry.attributes.uv;
    const v = new THREE.Vector3();

    // 1. First pass: Sculpt realistic anatomical face features
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      // A. Cranial proportions (natural human head oval)
      v.x *= 0.98;
      v.y *= 1.22;
      v.z *= 1.06;

      // B. Temple flattening
      if (Math.abs(v.x) > 0.65 && v.y > 0.2 && v.z > 0.2) {
        v.x *= 0.92;
      }

      // C. Orbital Eye Cavities (Hollowing sockets backward)
      const eyeDistL = Math.hypot(v.x + 0.37, v.y - 0.18);
      const eyeDistR = Math.hypot(v.x - 0.37, v.y - 0.18);
      if (v.z > 0.35) {
        if (eyeDistL < 0.26) {
          const depthL = (1 - eyeDistL / 0.26) * 0.16;
          v.z -= depthL;
        }
        if (eyeDistR < 0.26) {
          const depthR = (1 - eyeDistR / 0.26) * 0.16;
          v.z -= depthR;
        }
      }

      // D. Supraorbital Brow Ridge (Shelf above eyes)
      if (v.y > 0.28 && v.y < 0.46 && Math.abs(v.x) < 0.62 && v.z > 0.45) {
        v.z += 0.085 * (1 - Math.abs(v.y - 0.38) / 0.12);
      }

      // E. Zygomatic Cheekbones (Flaring outward & forward)
      if (Math.abs(v.x) > 0.42 && Math.abs(v.x) < 0.82 && v.y > -0.25 && v.y < 0.15 && v.z > 0.3) {
        v.z += 0.09;
        v.x *= 1.05;
      }

      // F. Seamless Sculpted Human Nose (Radix, bridge, tip, alar wings, and nostrils)
      if (Math.abs(v.x) < 0.25 && v.y > -0.22 && v.y < 0.32 && v.z > 0.45) {
        // Nasal dorsum / bridge elevation
        const bridgeT = (v.y - (-0.22)) / 0.54; // 0 at base, 1 at radix
        const bridgeWidth = 0.06 + (1 - bridgeT) * 0.07;
        const bridgeDist = Math.abs(v.x);
        if (bridgeDist < bridgeWidth) {
          const elev = (1 - bridgeDist / bridgeWidth) * (0.16 + (1 - bridgeT) * 0.12);
          v.z += elev;
        }
        // Nasal tip lobule prominence
        const tipDist = Math.hypot(v.x, v.y - (-0.08));
        if (tipDist < 0.14) {
          v.z += (1 - tipDist / 0.14) * 0.14;
        }
        // Lateral alar lobules (nostril wings)
        const alarL = Math.hypot(v.x + 0.12, v.y - (-0.12));
        const alarR = Math.hypot(v.x - 0.12, v.y - (-0.12));
        if (alarL < 0.09) v.z += (1 - alarL / 0.09) * 0.07;
        if (alarR < 0.09) v.z += (1 - alarR / 0.09) * 0.07;
      }

      // G. Philtrum groove (indentation between nose and upper lip)
      if (Math.abs(v.x) < 0.07 && v.y > -0.32 && v.y < -0.18 && v.z > 0.65) {
        v.z -= 0.035 * (1 - Math.abs(v.x) / 0.07);
      }

      // H. Sculpted Lips & Mouth Fissure
      if (Math.abs(v.x) < 0.32 && v.y > -0.48 && v.y < -0.26 && v.z > 0.55) {
        const lipDistX = Math.abs(v.x) / 0.32;
        // Upper lip Cupid's bow contour
        if (v.y > -0.35 && v.y < -0.26) {
          const upperLipY = (v.y - (-0.35)) / 0.09;
          const cupidPeak = 0.065 * (1 - lipDistX) * Math.sin(upperLipY * Math.PI);
          v.z += cupidPeak;
        }
        // Lower lip pout
        if (v.y > -0.45 && v.y < -0.34) {
          const lowerLipY = (v.y - (-0.45)) / 0.11;
          const lowerPout = 0.08 * (1 - lipDistX) * Math.sin(lowerLipY * Math.PI);
          v.z += lowerPout;
        }
      }

      // I. Defined Human Jawline & Mandible Taper
      if (v.y < -0.15) {
        const jawTaper = 1.0 - ((-v.y - 0.15) / 1.1) * 0.32;
        v.x *= Math.max(0.68, jawTaper);
      }

      // J. Chin / Mental Protuberance
      if (v.y < -0.62 && v.y > -1.05 && Math.abs(v.x) < 0.35 && v.z > 0.3) {
        v.z += 0.14 * (1 - Math.abs(v.x) / 0.35);
      }

      pos.setXYZ(i, v.x, v.y, v.z);
    }

    // 2. Second pass: Apply Cylindrical UV mapping centered at +Z (front face = u: 0.5)
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const theta = Math.atan2(-v.x, v.z);
      const u = (theta / (Math.PI * 2)) + 0.5;
      const vNorm = (v.y - (-1.25)) / 2.5;
      uvs.setXY(i, THREE.MathUtils.clamp(u, 0, 1), THREE.MathUtils.clamp(vNorm, 0, 1));
    }

    geometry.computeVertexNormals();
  }

  /**
   * Applies an instantaneous physical impulse on slap impact.
   */
  applySlapImpulse(swipeDirection, force, hitSide = 'left') {
    const power = Math.min(3.0, Math.max(0.6, force));

    // Angular recoil: Yaw (Y), Pitch (X), and Roll (Z) axes
    const yawImpulse = swipeDirection.x * 2.85 * power;
    const pitchImpulse = -Math.abs(swipeDirection.y || 0.32) * 1.55 * power;
    const rollImpulse = -swipeDirection.x * 0.95 * power;

    this.rotVelocity.x += pitchImpulse;
    this.rotVelocity.y += yawImpulse;
    this.rotVelocity.z += rollImpulse;

    // Linear displacement recoil
    this.posVelocity.x += swipeDirection.x * 0.42 * power;
    this.posVelocity.y -= 0.14 * power;
    this.posVelocity.z -= 0.32 * power;

    // Elastic tissue squish
    this.squishVelocity.set(-0.2 * power, 0.28 * power, -0.12 * power);

    // Dynamic erythema capillary blush on struck cheek
    if (hitSide === 'left' || swipeDirection.x > 0) {
      this.leftBlushIntensity = Math.min(1.0, this.leftBlushIntensity + 0.75 * power);
    } else {
      this.rightBlushIntensity = Math.min(1.0, this.rightBlushIntensity + 0.75 * power);
    }

    // Realistic wince reaction
    this.winceTimer = Math.min(1.5, 0.35 + power * 0.35);
    this.winceSide = hitSide;
  }

  /**
   * Updates spring-damper physics and facial reactions every frame.
   */
  update(dt, pointerNormalized) {
    const step = Math.min(dt, 0.05);

    // --- 1. Damped Harmonic Oscillator for Rotation ---
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

    // --- 3. Elastic Squish & Recovery ---
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

    // --- 5. Eye Gaze Tracking & Dynamic Wincing ---
    if (this.winceTimer > 0) {
      this.winceTimer -= step;
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
      this.leftEye.upperLid.rotation.x = THREE.MathUtils.lerp(this.leftEye.upperLid.rotation.x, -0.55, 0.12);
      this.rightEye.upperLid.rotation.x = THREE.MathUtils.lerp(this.rightEye.upperLid.rotation.x, -0.55, 0.12);

      this.leftBrow.rotation.z = THREE.MathUtils.lerp(this.leftBrow.rotation.z, 0, 0.1);
      this.rightBrow.rotation.z = THREE.MathUtils.lerp(this.rightBrow.rotation.z, 0, 0.1);

      const gazeX = THREE.MathUtils.clamp((pointerNormalized?.x || 0) * 0.045, -0.045, 0.045);
      const gazeY = THREE.MathUtils.clamp((pointerNormalized?.y || 0) * 0.035, -0.035, 0.035);

      this.leftEye.iris.position.x = THREE.MathUtils.lerp(this.leftEye.iris.position.x, gazeX, 0.18);
      this.leftEye.iris.position.y = THREE.MathUtils.lerp(this.leftEye.iris.position.y, gazeY, 0.18);
      this.rightEye.iris.position.x = THREE.MathUtils.lerp(this.rightEye.iris.position.x, gazeX, 0.18);
      this.rightEye.iris.position.y = THREE.MathUtils.lerp(this.rightEye.iris.position.y, gazeY, 0.18);
    }
  }

  getHitSphere() {
    const worldCenter = this.hitCenter.clone().applyMatrix4(this.headGroup.matrixWorld);
    return {
      center: worldCenter,
      radius: this.hitRadius
    };
  }
}
