import * as THREE from 'three';

export const SERVICE_LAYERS = [
  {
    id: 'caseback',
    name: 'Caseback',
    description:
      'Screw-down stainless steel caseback and AR-coated sapphire crystal sealing the calibre to 5 bar.'
  },
  {
    id: 'chronograph',
    name: 'Chronograph',
    description:
      'Column wheel, horizontal coupling clutch, reset hammers, and the engraved Y-shaped chronograph bridge.'
  },
  {
    id: 'regulation',
    name: 'Regulation',
    description:
      'Open-heart 6 o’clock balance assembly oscillating at 18,000 vph beneath a three-spoke carriage.'
  },
  {
    id: 'movement',
    name: 'Movement',
    description:
      'Circular-grained mainplate, mainspring barrel, and hand-finished wheel train holding timekeeping in alignment.'
  },
  {
    id: 'case',
    name: 'Case',
    description:
      '39.7 mm sculpted mid-case with lyre lugs, tachymeter bezel, fluted crown, pushers, and flat-link bracelet.'
  },
  {
    id: 'dial',
    name: 'Dial & hands',
    description:
      'Stepped sunray dial with open-heart aperture, applied faceted indices, sub-registers, and dauphine hands.'
  }
];

function applyPlanarXYUV(geometry, halfExtent) {
  const pos = geometry.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  const span = halfExtent * 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uv[i * 2] = (x + halfExtent) / span;
    uv[i * 2 + 1] = (y + halfExtent) / span;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function createGearGeometry(outerR, rootR, boreR, teeth, thickness, spokeCount = 5) {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;

  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.18;
    const a2 = a0 + step * 0.32;
    const a3 = a0 + step * 0.54;
    const a4 = a0 + step * 0.68;

    const p0x = Math.cos(a0) * rootR;
    const p0y = Math.sin(a0) * rootR;
    if (i === 0) shape.moveTo(p0x, p0y);
    else shape.lineTo(p0x, p0y);

    shape.lineTo(Math.cos(a1) * rootR, Math.sin(a1) * rootR);
    shape.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
    shape.lineTo(Math.cos(a3) * outerR, Math.sin(a3) * outerR);
    shape.lineTo(Math.cos(a4) * rootR, Math.sin(a4) * rootR);
  }
  shape.closePath();

  if (spokeCount > 0 && rootR - boreR > 0.12) {
    const rimIn = rootR * 0.8;
    const hubOut = Math.max(boreR + 0.04, rootR * 0.28);
    if (rimIn > hubOut + 0.03) {
      const spokeStep = (Math.PI * 2) / spokeCount;
      const spokeHalfAngle = 0.16;
      for (let s = 0; s < spokeCount; s++) {
        const startA = s * spokeStep + spokeHalfAngle;
        const endA = (s + 1) * spokeStep - spokeHalfAngle;
        if (endA > startA + 0.1) {
          const hole = new THREE.Path();
          hole.absarc(0, 0, hubOut, startA, endA, false);
          hole.absarc(0, 0, rimIn, endA, startA, true);
          hole.closePath();
          shape.holes.push(hole);
        }
      }
    }
  } else if (boreR > 0.01) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, boreR, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.006,
    bevelThickness: 0.006,
    curveSegments: 24
  });
  geo.translate(0, 0, -thickness * 0.5);
  return geo;
}

function createAnnulusShape(outerR, innerR) {
  const s = new THREE.Shape();
  s.absarc(0, 0, outerR, 0, Math.PI * 2, false);
  const h = new THREE.Path();
  h.absarc(0, 0, innerR, 0, Math.PI * 2, true);
  s.holes.push(h);
  return s;
}

function createLugGeometry() {
  // Sculptural angular lyre lug extending in +Y from r=1.72 to y=2.48
  const shape = new THREE.Shape();
  shape.moveTo(0.90, 1.56);
  shape.lineTo(1.36, 1.48);
  shape.quadraticCurveTo(1.32, 2.02, 1.24, 2.46);
  shape.lineTo(0.92, 2.50);
  shape.quadraticCurveTo(0.91, 2.08, 0.88, 1.68);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.56,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.04,
    bevelThickness: 0.05,
    curveSegments: 18
  });
  geo.translate(0, 0, -0.34);
  return geo;
}

function createHandGeometry(length, baseW, tipW, tailLen, thickness) {
  const s = new THREE.Shape();
  s.moveTo(-baseW * 0.6, -tailLen);
  s.lineTo(-baseW, 0.08);
  s.lineTo(-tipW, length);
  s.lineTo(0, length + 0.07);
  s.lineTo(tipW, length);
  s.lineTo(baseW, 0.08);
  s.lineTo(baseW * 0.6, -tailLen);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.005,
    bevelThickness: 0.006
  });
  geo.translate(0, 0, -thickness * 0.5);
  return geo;
}

function createHairspringGeometry() {
  const points = [];
  const turns = 4.5;
  const steps = 160;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * turns * Math.PI * 2;
    const r = 0.045 + t * 0.215;
    points.push(new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, 0));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, 140, 0.006, 6, false);
}

/**
 * Builds the complete procedural 3D open-heart chronograph and returns the root group,
 * animated mechanism handles, layer collections, reassembly part list, and ghost silhouette.
 */
export function buildWatch(materials) {
  const root = new THREE.Group();
  root.name = 'AurenOpenHeart';

  const ghostRoot = new THREE.Group();
  ghostRoot.name = 'AurenGhostSilhouette';

  const layerGroups = {
    caseback: new THREE.Group(),
    chronograph: new THREE.Group(),
    regulation: new THREE.Group(),
    movement: new THREE.Group(),
    case: new THREE.Group(),
    dial: new THREE.Group()
  };

  Object.entries(layerGroups).forEach(([id, g]) => {
    g.name = `layer_${id}`;
    root.add(g);
  });

  const parts = [];
  let partCounter = 0;

  const registerPart = (mesh, layerId, orderNorm, scatterDir, includeGhost = false) => {
    const idx = partCounter++;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData.layerId = layerId;
    mesh.userData.originalMat = mesh.material;
    mesh.userData.assembledPos = mesh.position.clone();
    mesh.userData.assembledRot = mesh.rotation.clone();
    mesh.userData.reassemblyOrder = orderNorm;

    // Deterministic spherical + staging scatter offset for Section 08 (kept well below top-left title)
    const angle = idx * 2.3999632; // golden angle
    const radius = 1.95 + ((idx * 17) % 11) * 0.16;
    const baseScatter = scatterDir
      ? scatterDir.clone()
      : new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius * 0.56 - 0.68,
          ((idx % 7) - 3) * 0.42
        );
    mesh.userData.scatterOffset = baseScatter;
    mesh.userData.scatterRot = new THREE.Euler(
      Math.sin(idx * 1.3) * 0.9,
      Math.cos(idx * 0.9) * 0.9,
      Math.sin(idx * 2.1) * 0.7
    );

    parts.push(mesh);

    if (includeGhost) {
      const gm = new THREE.Mesh(mesh.geometry, materials.ghost);
      gm.position.copy(mesh.position);
      gm.rotation.copy(mesh.rotation);
      gm.scale.copy(mesh.scale);
      ghostRoot.add(gm);
    }

    return mesh;
  };

  const addPart = (parent, geo, mat, pos, rot, layerId, order, includeGhost = false, scatter = null) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    parent.add(m);
    return registerPart(m, layerId, order, scatter, includeGhost);
  };

  // Helper to place tiny blued screws & ruby jewel bearings
  const screwGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.032, 16);
  screwGeo.rotateX(Math.PI / 2);
  const jewelGeo = new THREE.CylinderGeometry(0.046, 0.046, 0.03, 16);
  jewelGeo.rotateX(Math.PI / 2);
  const chatonGeo = new THREE.TorusGeometry(0.048, 0.014, 10, 20);

  // =========================================================================
  // 1. CASEBACK MODULE (sculpted chamfered steel ring + exhibition sapphire)
  // =========================================================================
  const cbGroup = layerGroups.caseback;

  const cbProfile = [
    new THREE.Vector2(1.48, -0.58),
    new THREE.Vector2(1.76, -0.58),
    new THREE.Vector2(1.90, -0.52),
    new THREE.Vector2(1.90, -0.44),
    new THREE.Vector2(1.48, -0.44)
  ];
  const cbRingGeo = new THREE.LatheGeometry(cbProfile, 72);
  cbRingGeo.rotateX(Math.PI / 2);
  const cbRingMesh = addPart(cbGroup, cbRingGeo, materials.caseBrushed, [0, 0, 0], null, 'caseback', 0.64, false, new THREE.Vector3(0, -2.5, -2.6));
  cbRingMesh.userData.trayRole = 'caseback';

  // Caseback spanner notches (6 around perimeter)
  const notchGeo = new THREE.BoxGeometry(0.11, 0.07, 0.05);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const nm = addPart(
      cbGroup,
      notchGeo,
      materials.casePolished,
      [Math.cos(a) * 1.73, Math.sin(a) * 1.73, -0.59],
      [0, 0, a],
      'caseback',
      0.66
    );
    nm.userData.trayRole = 'caseback';
  }

  // Caseback gasket
  const gasketGeo = new THREE.TorusGeometry(1.52, 0.024, 12, 64);
  const gm = addPart(cbGroup, gasketGeo, materials.gasket, [0, 0, -0.45], null, 'caseback', 0.62);
  gm.userData.trayRole = 'caseback';

  // Exhibition sapphire crystal
  const cbCrystalGeo = new THREE.CylinderGeometry(1.48, 1.48, 0.05, 64);
  cbCrystalGeo.rotateX(Math.PI / 2);
  const cm = addPart(cbGroup, cbCrystalGeo, materials.sapphireBack, [0, 0, -0.54], null, 'caseback', 0.67);
  cm.userData.trayRole = 'caseback';

  // =========================================================================
  // 2. MOVEMENT MODULE (z = -0.24 to +0.08)
  // =========================================================================
  const mvGroup = layerGroups.movement;

  // Perlage mainplate with open-heart aperture at (0, -0.82)
  const mainplateShape = new THREE.Shape();
  mainplateShape.absarc(0, 0, 1.61, 0, Math.PI * 2, false);
  const apertureHole = new THREE.Path();
  apertureHole.absarc(0, -0.82, 0.47, 0, Math.PI * 2, true);
  mainplateShape.holes.push(apertureHole);

  const mainplateGeo = new THREE.ExtrudeGeometry(mainplateShape, {
    depth: 0.09,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    curveSegments: 64
  });
  mainplateGeo.translate(0, 0, -0.045);
  applyPlanarXYUV(mainplateGeo, 1.62);
  addPart(mvGroup, mainplateGeo, materials.mainplate, [0, 0, -0.04], null, 'movement', 0.04);

  // Mainspring Barrel & Ratchet Wheel (upper-left)
  const barrelDrumGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.16, 40);
  barrelDrumGeo.rotateX(Math.PI / 2);
  addPart(mvGroup, barrelDrumGeo, materials.steelGear, [-0.54, 0.56, -0.14], null, 'movement', 0.07);

  const ratchetGeo = createGearGeometry(0.42, 0.37, 0.07, 32, 0.038, 0);
  const ratchetWheel = addPart(mvGroup, ratchetGeo, materials.steelGear, [-0.54, 0.56, -0.23], null, 'movement', 0.09);

  const crownWheelGeo = createGearGeometry(0.28, 0.24, 0.06, 24, 0.036, 0);
  const crownWheel = addPart(mvGroup, crownWheelGeo, materials.steelGear, [0.12, 0.88, -0.22], null, 'movement', 0.11);

  // Going train gears (center, third, fourth)
  const centerGear = addPart(
    mvGroup,
    createGearGeometry(0.44, 0.39, 0.06, 36, 0.034, 5),
    materials.brassGear,
    [0, 0, -0.18],
    null,
    'movement',
    0.13
  );
  const thirdGear = addPart(
    mvGroup,
    createGearGeometry(0.32, 0.28, 0.05, 28, 0.032, 5),
    materials.brassGear,
    [0.52, -0.24, -0.19],
    null,
    'movement',
    0.15
  );
  const fourthGear = addPart(
    mvGroup,
    createGearGeometry(0.29, 0.25, 0.04, 24, 0.032, 4),
    materials.brassGear,
    [-0.58, -0.22, -0.2],
    null,
    'movement',
    0.17
  );

  // Movement jewels & blued screws
  const mvJewelCoords = [
    [0, 0, -0.21],
    [0.52, -0.24, -0.22],
    [-0.58, -0.22, -0.23],
    [-0.54, 0.56, -0.26],
    [0.12, 0.88, -0.25]
  ];
  mvJewelCoords.forEach((p, idx) => {
    addPart(mvGroup, jewelGeo, materials.rubyJewel, p, null, 'movement', 0.18 + idx * 0.01);
    addPart(mvGroup, chatonGeo, materials.brassGear, p, null, 'movement', 0.18 + idx * 0.01);
  });

  const mvScrewCoords = [
    [-0.95, 0.15, -0.15],
    [0.98, 0.12, -0.15],
    [-0.85, 0.92, -0.15],
    [0.85, 0.82, -0.15],
    [-1.08, -0.58, -0.15],
    [1.05, -0.56, -0.15]
  ];
  mvScrewCoords.forEach((p, idx) => {
    addPart(mvGroup, screwGeo, materials.bluedSteel, p, null, 'movement', 0.2 + idx * 0.01);
  });

  // =========================================================================
  // 3. REGULATION MODULE (Open-Heart 6 o'clock Tourbillon / Balance, y = -0.82)
  // =========================================================================
  const regGroup = layerGroups.regulation;

  // Lower rear balance cock supporting from behind
  const rearCockShape = new THREE.Shape();
  rearCockShape.moveTo(-0.72, -1.15);
  rearCockShape.quadraticCurveTo(-0.35, -1.3, 0.12, -1.24);
  rearCockShape.quadraticCurveTo(0.28, -1.18, 0.16, -0.82);
  rearCockShape.quadraticCurveTo(0.05, -0.68, -0.12, -0.78);
  rearCockShape.quadraticCurveTo(-0.42, -0.96, -0.72, -1.04);
  rearCockShape.closePath();
  const rearCockGeo = new THREE.ExtrudeGeometry(rearCockShape, {
    depth: 0.07,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.01,
    bevelThickness: 0.01
  });
  rearCockGeo.translate(0, 0, -0.035);
  applyPlanarXYUV(rearCockGeo, 1.5);
  addPart(regGroup, rearCockGeo, materials.engravedBridge, [0, 0, -0.26], null, 'regulation', 0.24);

  // Front open-heart arched tourbillon bridge spanning 6 o'clock aperture
  const frontBridgeShape = new THREE.Shape();
  frontBridgeShape.moveTo(-0.51, -0.85);
  frontBridgeShape.lineTo(-0.14, -0.85);
  frontBridgeShape.absarc(0, -0.82, 0.13, Math.PI, 0, true);
  frontBridgeShape.lineTo(0.51, -0.85);
  frontBridgeShape.lineTo(0.51, -0.79);
  frontBridgeShape.lineTo(0.14, -0.79);
  frontBridgeShape.absarc(0, -0.82, 0.11, 0, Math.PI, false);
  frontBridgeShape.lineTo(-0.51, -0.79);
  frontBridgeShape.closePath();

  const frontBridgeGeo = new THREE.ExtrudeGeometry(frontBridgeShape, {
    depth: 0.042,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.008,
    bevelThickness: 0.008
  });
  frontBridgeGeo.translate(0, 0, -0.021);
  addPart(regGroup, frontBridgeGeo, materials.casePolished, [0, 0, 0.11], null, 'regulation', 0.34);

  // Two polished bridge screws flanking the 6 o'clock aperture
  addPart(regGroup, screwGeo, materials.bluedSteel, [-0.45, -0.82, 0.13], null, 'regulation', 0.35);
  addPart(regGroup, screwGeo, materials.bluedSteel, [0.45, -0.82, 0.13], null, 'regulation', 0.35);

  // Escape wheel visible inside aperture edge
  const escapeWheel = addPart(
    regGroup,
    createGearGeometry(0.18, 0.14, 0.03, 15, 0.026, 3),
    materials.brassGear,
    [0.24, -0.58, -0.02],
    null,
    'regulation',
    0.27
  );

  // Oscillating Balance Wheel Assembly (at 0, -0.82, z = 0.03)
  const balanceAssembly = new THREE.Group();
  balanceAssembly.position.set(0, -0.82, 0.03);
  regGroup.add(balanceAssembly);

  const balanceRimGeo = new THREE.TorusGeometry(0.32, 0.028, 12, 48);
  addPart(balanceAssembly, balanceRimGeo, materials.brassGear, [0, 0, 0], null, 'regulation', 0.29);

  // 3-spoke tourbillon/balance arms
  const spokeGeo = new THREE.BoxGeometry(0.62, 0.032, 0.022);
  for (let i = 0; i < 3; i++) {
    addPart(
      balanceAssembly,
      spokeGeo,
      materials.casePolished,
      [0, 0, 0],
      [0, 0, (i * Math.PI) / 3],
      'regulation',
      0.3
    );
  }

  // Timing weights around balance rim
  const weightGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.04, 10);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    addPart(
      balanceAssembly,
      weightGeo,
      materials.brassGear,
      [Math.cos(a) * 0.34, Math.sin(a) * 0.34, 0],
      [0, 0, a + Math.PI / 2],
      'regulation',
      0.31
    );
  }

  // Blued steel hairspring spiral
  const hairspring = addPart(
    regGroup,
    createHairspringGeometry(),
    materials.bluedSteel,
    [0, -0.82, 0.06],
    null,
    'regulation',
    0.32
  );

  // Center shock-protected ruby jewel at heart of aperture (refined horological scale)
  const smallJewelGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.025, 16);
  smallJewelGeo.rotateX(Math.PI / 2);
  const smallChatonGeo = new THREE.TorusGeometry(0.026, 0.008, 10, 20);
  addPart(regGroup, smallJewelGeo, materials.rubyJewel, [0, -0.82, 0.125], null, 'regulation', 0.36);
  addPart(regGroup, smallChatonGeo, materials.brassGear, [0, -0.82, 0.125], null, 'regulation', 0.36);

  // =========================================================================
  // 4. CHRONOGRAPH MODULE (z = -0.42 to -0.25)
  // =========================================================================
  const chGroup = layerGroups.chronograph;

  // Signature Y-shaped engraved chronograph bridge
  const yBridgeShape = new THREE.Shape();
  yBridgeShape.moveTo(-0.22, -0.34);
  yBridgeShape.quadraticCurveTo(-0.3, 0.12, -0.88, 0.62);
  yBridgeShape.quadraticCurveTo(-0.74, 0.84, -0.52, 0.78);
  yBridgeShape.quadraticCurveTo(-0.14, 0.36, 0, 0.24);
  yBridgeShape.quadraticCurveTo(0.16, 0.36, 0.56, 0.76);
  yBridgeShape.quadraticCurveTo(0.76, 0.82, 0.88, 0.6);
  yBridgeShape.quadraticCurveTo(0.32, 0.14, 0.22, -0.34);
  yBridgeShape.quadraticCurveTo(0, -0.52, -0.22, -0.34);
  yBridgeShape.closePath();

  const yBridgeGeo = new THREE.ExtrudeGeometry(yBridgeShape, {
    depth: 0.075,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.015,
    bevelThickness: 0.016,
    curveSegments: 24
  });
  yBridgeGeo.translate(0, 0, -0.037);
  applyPlanarXYUV(yBridgeGeo, 1.2);
  addPart(chGroup, yBridgeGeo, materials.engravedBridge, [0, 0.06, -0.34], null, 'chronograph', 0.42);

  // 8-pillar Column Wheel at (0.64, 0.24)
  const colBaseGeo = createGearGeometry(0.18, 0.15, 0.04, 16, 0.04, 0);
  addPart(chGroup, colBaseGeo, materials.steelGear, [0.66, 0.18, -0.31], null, 'chronograph', 0.38);

  const pillarGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.09, 10);
  pillarGeo.rotateX(Math.PI / 2);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    addPart(
      chGroup,
      pillarGeo,
      materials.casePolished,
      [0.66 + Math.cos(a) * 0.11, 0.18 + Math.sin(a) * 0.11, -0.36],
      null,
      'chronograph',
      0.39
    );
  }
  addPart(chGroup, screwGeo, materials.bluedSteel, [0.66, 0.18, -0.41], null, 'chronograph', 0.4);

  // Coupling yoke & steel chronograph levers
  const leverShape = new THREE.Shape();
  leverShape.moveTo(-0.55, 0.02);
  leverShape.lineTo(0.45, 0.06);
  leverShape.lineTo(0.56, 0.14);
  leverShape.lineTo(0.48, 0.19);
  leverShape.lineTo(-0.55, 0.08);
  leverShape.closePath();
  const leverGeo = new THREE.ExtrudeGeometry(leverShape, {
    depth: 0.028,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.005,
    bevelThickness: 0.005
  });
  leverGeo.translate(0, 0, -0.014);
  addPart(chGroup, leverGeo, materials.steelGear, [-0.04, -0.18, -0.3], [0, 0, 0.18], 'chronograph', 0.41);

  // Chronograph central seconds runner wheel + minute counter wheel
  const chronoRunner = addPart(
    chGroup,
    createGearGeometry(0.27, 0.24, 0.04, 30, 0.028, 5),
    materials.steelGear,
    [0, 0, -0.28],
    null,
    'chronograph',
    0.43
  );
  addPart(chGroup, jewelGeo, materials.rubyJewel, [0, 0.06, -0.385], null, 'chronograph', 0.44);
  addPart(chGroup, screwGeo, materials.bluedSteel, [-0.66, 0.66, -0.385], null, 'chronograph', 0.45);
  addPart(chGroup, screwGeo, materials.bluedSteel, [0.68, 0.64, -0.385], null, 'chronograph', 0.45);
  addPart(chGroup, screwGeo, materials.bluedSteel, [0, -0.34, -0.385], null, 'chronograph', 0.45);

  // =========================================================================
  // 5. CASE & ARTICULATED BRACELET MODULE
  // =========================================================================
  const caseGroup = layerGroups.case;

  // Sculpted mid-case barrel via LatheGeometry (Y-axis -> rotated X PI/2 to align along Z)
  const caseProfile = [
    new THREE.Vector2(1.66, -0.44),
    new THREE.Vector2(1.89, -0.44),
    new THREE.Vector2(1.96, -0.32),
    new THREE.Vector2(1.985, -0.06),
    new THREE.Vector2(1.97, 0.18),
    new THREE.Vector2(1.91, 0.30),
    new THREE.Vector2(1.66, 0.30)
  ];
  const midCaseGeo = new THREE.LatheGeometry(caseProfile, 72);
  midCaseGeo.rotateX(Math.PI / 2);
  const mcMesh = addPart(caseGroup, midCaseGeo, materials.caseBrushed, [0, 0, 0], null, 'case', 0.50, true);
  mcMesh.userData.trayRole = 'midCase';

  // Polished outer case chamfer ring
  const chamferGeo = new THREE.TorusGeometry(1.93, 0.048, 16, 72);
  const chMesh = addPart(caseGroup, chamferGeo, materials.casePolished, [0, 0, 0.28], null, 'case', 0.52, true);
  chMesh.userData.trayRole = 'midCase';

  // 4 Sculpted Lyre Lugs (mirrored X and Y)
  const baseLugGeo = createLugGeometry();
  const lugConfigs = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1]
  ];
  lugConfigs.forEach(([sx, sy], idx) => {
    const lugMesh = new THREE.Mesh(baseLugGeo, materials.caseBrushed);
    lugMesh.scale.set(sx, sy, 1);
    caseGroup.add(lugMesh);
    registerPart(lugMesh, 'case', 0.53 + idx * 0.01, null, true);
    lugMesh.userData.trayRole = 'midCase';
  });

  // Tachymeter bezel metallic rim + planar UV-mapped tachymeter ring
  const bezelRimGeo = new THREE.ExtrudeGeometry(createAnnulusShape(1.985, 1.64), {
    depth: 0.16,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.02,
    bevelThickness: 0.025,
    curveSegments: 72
  });
  bezelRimGeo.translate(0, 0, -0.08);
  const bzRimMesh = addPart(caseGroup, bezelRimGeo, materials.casePolished, [0, 0, 0.36], null, 'case', 0.57, true);
  bzRimMesh.userData.trayRole = 'bezel';

  const tachyDiscGeo = new THREE.RingGeometry(1.66, 1.96, 72, 1);
  applyPlanarXYUV(tachyDiscGeo, 2.0);
  const bzDiscMesh = addPart(caseGroup, tachyDiscGeo, materials.tachymeter, [0, 0, 0.468], null, 'case', 0.58);
  bzDiscMesh.userData.trayRole = 'bezel';

  // Fluted Winding Crown at 3 o'clock (x = 2.13)
  const crownGroup = new THREE.Group();
  crownGroup.position.set(2.12, 0, -0.04);
  caseGroup.add(crownGroup);

  const crownTubeGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.26, 20);
  crownTubeGeo.rotateZ(Math.PI / 2);
  addPart(crownGroup, crownTubeGeo, materials.casePolished, [-0.14, 0, 0], null, 'case', 0.59, true);

  const crownBodyGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.22, 32);
  crownBodyGeo.rotateZ(Math.PI / 2);
  addPart(crownGroup, crownBodyGeo, materials.casePolished, [0.04, 0, 0], null, 'case', 0.60, true);

  // 18 radial crown flutes
  const fluteGeo = new THREE.BoxGeometry(0.2, 0.032, 0.035);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    addPart(
      crownGroup,
      fluteGeo,
      materials.caseBrushed,
      [0.04, Math.cos(a) * 0.24, Math.sin(a) * 0.24],
      [a, 0, 0],
      'case',
      0.605
    );
  }

  // Two stepped chronograph pushers at 2 o'clock (+30 deg) & 4 o'clock (-30 deg)
  const pusherCollarGeo = new THREE.CylinderGeometry(0.11, 0.125, 0.16, 24);
  pusherCollarGeo.rotateZ(Math.PI / 2);
  const pusherCapGeo = new THREE.CylinderGeometry(0.145, 0.135, 0.14, 24);
  pusherCapGeo.rotateZ(Math.PI / 2);

  [Math.PI / 6, -Math.PI / 6].forEach((ang, idx) => {
    const px = Math.cos(ang) * 2.02;
    const py = Math.sin(ang) * 2.02;
    addPart(
      caseGroup,
      pusherCollarGeo,
      materials.caseBrushed,
      [px, py, -0.04],
      [0, 0, ang],
      'case',
      0.61 + idx * 0.01,
      true
    );
    addPart(
      caseGroup,
      pusherCapGeo,
      materials.casePolished,
      [Math.cos(ang) * 2.15, Math.sin(ang) * 2.15, -0.04],
      [0, 0, ang],
      'case',
      0.615 + idx * 0.01,
      true
    );
  });

  // Domed front sapphire crystal
  const domePts = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const r = t * 1.66;
    const h = 0.12 * (1 - t * t * 0.88);
    domePts.push(new THREE.Vector2(r, h));
  }
  const frontCrystalGeo = new THREE.LatheGeometry(domePts, 64);
  frontCrystalGeo.rotateX(Math.PI / 2);
  addPart(caseGroup, frontCrystalGeo, materials.sapphireFront, [0, 0, 0.45], null, 'case', 0.96);

  // =========================================================================
  // ARTICULATED FLAT-LINK BRACELET + ENGRAVED FOLDING CLASP (Smooth 20-link oval loop)
  // =========================================================================
  const braceletGroup = new THREE.Group();
  braceletGroup.name = 'bracelet_assembly';
  caseGroup.add(braceletGroup);

  const linkCountPerSide = 10;
  const linkLen = 0.41;
  const linkThick = 0.17;

  const outerLinkGeo = new THREE.BoxGeometry(0.41, linkLen * 0.91, linkThick);
  const centerLinkGeo = new THREE.BoxGeometry(0.84, linkLen * 0.93, linkThick * 1.08);
  const pinSlotGeo = new THREE.BoxGeometry(1.56, linkLen * 0.11, linkThick * 0.55);

  const buildBraceletLink = (sideSign, index) => {
    const linkGroup = new THREE.Group();
    const taper = 1 - Math.min(index, 7) * 0.012;
    linkGroup.scale.set(taper, 1, 1);

    const orderBase = 0.72 + (index / linkCountPerSide) * 0.22 + (sideSign < 0 ? 0.02 : 0);

    const m1 = addPart(linkGroup, outerLinkGeo, materials.braceletOuter, [-0.66, 0, 0], null, 'case', orderBase, false);
    const m2 = addPart(linkGroup, centerLinkGeo, materials.braceletCenter, [0, 0, 0.008], null, 'case', orderBase + 0.01, false);
    const m3 = addPart(linkGroup, outerLinkGeo, materials.braceletOuter, [0.66, 0, 0], null, 'case', orderBase, false);
    const m4 = addPart(linkGroup, pinSlotGeo, materials.caseBrushed, [0, -sideSign * linkLen * 0.48, 0], null, 'case', orderBase, false);
    [m1, m2, m3, m4].forEach((m) => {
      m.userData.trayRole = 'braceletLink';
      m.userData.linkIndex = index;
      m.userData.sideSign = sideSign;
    });

    braceletGroup.add(linkGroup);
    return { group: linkGroup, sideSign, index };
  };

  // End-links fitted cleanly into the 19mm lug opening
  const endLinkOuterGeo = new THREE.BoxGeometry(0.42, 0.36, 0.28);
  const endLinkCenterGeo = new THREE.BoxGeometry(0.84, 0.38, 0.3);

  const endLinks = [];
  [1, -1].forEach((sideSign) => {
    const eg = new THREE.Group();
    eg.position.set(0, sideSign * 1.98, -0.06);
    braceletGroup.add(eg);
    addPart(eg, endLinkOuterGeo, materials.braceletOuter, [-0.65, 0, 0], null, 'case', 0.69, false);
    addPart(eg, endLinkCenterGeo, materials.braceletCenter, [0, 0, 0.01], null, 'case', 0.7, false);
    addPart(eg, endLinkOuterGeo, materials.braceletOuter, [0.65, 0, 0], null, 'case', 0.69, false);
    endLinks.push({ group: eg, sideSign });
  });

  const braceletLinks = [];
  for (let i = 0; i < linkCountPerSide; i++) {
    braceletLinks.push(buildBraceletLink(1, i));
    braceletLinks.push(buildBraceletLink(-1, i));
  }

  // Engraved folding clasp
  const claspGroup = new THREE.Group();
  braceletGroup.add(claspGroup);
  const claspBodyGeo = new THREE.BoxGeometry(1.52, 1.08, 0.22);
  addPart(claspGroup, claspBodyGeo, materials.braceletOuter, [0, 0, 0], null, 'case', 0.94, false);

  const claspPlateGeo = new THREE.PlaneGeometry(1.46, 1.02);
  addPart(claspGroup, claspPlateGeo, materials.clasp, [0, 0, -0.115], [0, Math.PI, 0], 'case', 0.95);

  /**
   * Smoothly poses all 20 bracelet links + clasp across 3 articulated states:
   * - loop (flatness=0, openness=0): smooth continuous oval loop (both great from front & side disassembly)
   * - open (openness=1): opened straight behind lugs so exhibition caseback is 100% clear
   * - flat (flatness=1): uncurled horizontally flat strip centered on the clasp
   */
  const updateBraceletArticulation = (flatness = 0, openness = 0) => {
    endLinks.forEach(({ group, sideSign }) => {
      group.position.set(0, sideSign * THREE.MathUtils.lerp(1.98, 2.15, flatness), -0.06);
      group.rotation.set(sideSign * openness * 0.22, 0, 0);
    });

    // Parametric smooth oval wrist-loop curve from top/bottom lug around to back clasp
    const evalLoopPoint = (sideSign, t) => {
      // Cubic Bezier from P0=(y:1.98, z:-0.08) -> P1=(y:3.25, z:-0.15) -> P2=(y:3.05, z:-3.35) -> P3=(y:0.52, z:-3.45)
      const u = 1 - t;
      const yAbs =
        u * u * u * 2.08 +
        3 * u * u * t * 3.32 +
        3 * u * t * t * 2.95 +
        t * t * t * 0.42;
      const z =
        u * u * u * -0.08 +
        3 * u * u * t * -0.18 +
        3 * u * t * t * -3.38 +
        t * t * t * -3.45;
      return { y: sideSign * yAbs, z };
    };

    braceletLinks.forEach(({ group, sideSign, index }) => {
      const t = (index + 0.5) / linkCountPerSide;
      const p0 = evalLoopPoint(sideSign, Math.max(0, t - 0.02));
      const p1 = evalLoopPoint(sideSign, Math.min(1, t + 0.02));
      const p = evalLoopPoint(sideSign, t);

      const loopY = p.y;
      const loopZ = p.z;
      // Exact outward-facing tangent orientation in YZ plane for both top (+1) and bottom (-1)
      const dy = p1.y - p0.y;
      const dz = p1.z - p0.z;
      const loopRotX = sideSign * Math.atan2(dz, sideSign * dy);

      // Opened exhibition caseback pose
      const openY = sideSign * (2.28 + index * 0.42);
      const openZ = -0.2 - index * 0.06;
      const openRotX = sideSign * 0.1;

      // Flat horizontal-ready pose centered on clasp (clasp faces -Z, so rotate X by PI)
      const flatY = sideSign * (0.72 + (linkCountPerSide - 1 - index) * 0.42);
      const flatZ = -3.45;
      const flatRotX = sideSign * Math.PI;

      let y = THREE.MathUtils.lerp(loopY, openY, openness);
      let z = THREE.MathUtils.lerp(loopZ, openZ, openness);
      let rx = THREE.MathUtils.lerp(loopRotX, openRotX, openness);

      y = THREE.MathUtils.lerp(y, flatY, flatness);
      z = THREE.MathUtils.lerp(z, flatZ, flatness);
      rx = THREE.MathUtils.lerp(rx, flatRotX, flatness);

      group.position.set(0, y, z);
      group.rotation.set(rx, 0, 0);
    });

    const claspZ = THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(-3.46, -0.95, openness),
      -3.44,
      flatness
    );
    const claspY = THREE.MathUtils.lerp(0, -6.4 * openness, openness);
    claspGroup.position.set(0, claspY * (1 - flatness), claspZ);
    claspGroup.visible = openness < 0.85 || flatness > 0.1;
  };

  updateBraceletArticulation(0, 0);

  // =========================================================================
  // 6. DIAL & HANDS MODULE (z = +0.10 to +0.34)
  // =========================================================================
  const dialGroup = layerGroups.dial;

  // Main stepped dial plate with circular open-heart cutout at (0, -0.82)
  const dialShape = new THREE.Shape();
  dialShape.absarc(0, 0, 1.64, 0, Math.PI * 2, false);
  const dialHole = new THREE.Path();
  dialHole.absarc(0, -0.82, 0.48, 0, Math.PI * 2, true);
  dialShape.holes.push(dialHole);

  const dialGeo = new THREE.ExtrudeGeometry(dialShape, {
    depth: 0.045,
    bevelEnabled: false,
    curveSegments: 72
  });
  dialGeo.translate(0, 0, -0.022);
  applyPlanarXYUV(dialGeo, 1.64);
  addPart(dialGroup, dialGeo, materials.dial, [0, 0, 0.14], null, 'dial', 0.68, true);

  // Chamfered double metallic bezel framing the 6 o'clock open-heart cutout
  const openHeartRingGeo = new THREE.TorusGeometry(0.49, 0.026, 16, 56);
  addPart(dialGroup, openHeartRingGeo, materials.casePolished, [0, -0.82, 0.175], null, 'dial', 0.7);
  const openHeartInnerGeo = new THREE.TorusGeometry(0.42, 0.015, 14, 56);
  addPart(dialGroup, openHeartInnerGeo, materials.caseBrushed, [0, -0.82, 0.165], null, 'dial', 0.705);

  // Outer angled chapter / rehaut ring
  const rehautGeo = new THREE.CylinderGeometry(1.65, 1.59, 0.14, 64, 1, true);
  rehautGeo.rotateX(Math.PI / 2);
  addPart(dialGroup, rehautGeo, materials.caseBrushed, [0, 0, 0.22], null, 'dial', 0.69);

  // Applied metallic hour baton indices (slender champagne-silver batons; skipping 6 o'clock)
  const singleBatonGeo = new THREE.BoxGeometry(0.032, 0.22, 0.03);
  const lumeStripGeo = new THREE.BoxGeometry(0.012, 0.16, 0.012);

  for (let h = 0; h < 12; h++) {
    if (h === 6) continue; // open-heart aperture occupies 6 o'clock
    const angle = -(h / 12) * Math.PI * 2; // 0 is 12 o'clock (+Y)
    const isQuarter = h === 0 || h === 3 || h === 9;
    const r = isQuarter ? 1.25 : 1.28;
    const shorten = h === 3 || h === 9 ? 0.76 : 1.0;

    if (h === 0) {
      // Double baton at 12 o'clock
      [-0.028, 0.028].forEach((dx) => {
        addPart(dialGroup, singleBatonGeo, materials.indices, [dx, r, 0.18], null, 'dial', 0.72);
        addPart(dialGroup, lumeStripGeo, materials.lume, [dx, r, 0.195], null, 'dial', 0.725);
      });
    } else {
      const ix = -Math.sin(angle) * r;
      const iy = Math.cos(angle) * r;
      const b = addPart(
        dialGroup,
        singleBatonGeo,
        materials.indices,
        [ix, iy, 0.18],
        [0, 0, angle],
        'dial',
        0.72 + h * 0.005
      );
      b.scale.y = shorten;
      if (shorten === 1.0) {
        addPart(
          dialGroup,
          lumeStripGeo,
          materials.lume,
          [ix, iy, 0.195],
          [0, 0, angle],
          'dial',
          0.725 + h * 0.005
        );
      }
    }
  }

  // Sub-dial hands (9 o'clock running seconds & 3 o'clock 30-min chronograph)
  const subHandGeo = createHandGeometry(0.24, 0.018, 0.005, 0.06, 0.012);
  const subSecHand = addPart(dialGroup, subHandGeo, materials.hands, [-0.78, 0, 0.185], [0, 0, 0.8], 'dial', 0.76);
  const subMinHand = addPart(dialGroup, subHandGeo, materials.hands, [0.78, 0, 0.185], [0, 0, 0], 'dial', 0.76);

  // Central Hour, Minute & Chronograph Seconds Hands
  const hourHandGeo = createHandGeometry(0.88, 0.052, 0.014, 0.18, 0.024);
  const minHandGeo = createHandGeometry(1.26, 0.04, 0.011, 0.22, 0.022);
  const secHandGeo = createHandGeometry(1.42, 0.015, 0.004, 0.34, 0.014);

  const hourHand = addPart(
    dialGroup,
    hourHandGeo,
    materials.hands,
    [0, 0, 0.225],
    [0, 0, 0.96], // ~10:10 aesthetic watchmaker angle
    'dial',
    0.79
  );
  const minHand = addPart(
    dialGroup,
    minHandGeo,
    materials.hands,
    [0, 0, 0.265],
    [0, 0, -0.96],
    'dial',
    0.8
  );
  const secHand = addPart(
    dialGroup,
    secHandGeo,
    materials.hands,
    [0, 0, 0.305],
    [0, 0, 0],
    'dial',
    0.81
  );

  // Central hand cap
  const capGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.12, 20);
  capGeo.rotateX(Math.PI / 2);
  addPart(dialGroup, capGeo, materials.casePolished, [0, 0, 0.27], null, 'dial', 0.82);

  // =========================================================================
  // ANIMATION & STATE CONTROLS
  // =========================================================================
  let currentGhostMode = false;

  const setGhostSilhouetteVisible = (visible, opacity = 0.13) => {
    ghostRoot.visible = visible;
    materials.ghost.opacity = opacity;
  };

  /**
   * Updates animated horological mechanics (balance wheel at 18,000 vph = 2.5 Hz,
   * hairspring breathing, escape wheel, going train, and running seconds).
   */
  const tickMovement = (elapsedSeconds) => {
    // 18,000 vph = 5 beats/sec = 2.5 full cycles/sec
    const omega = elapsedSeconds * Math.PI * 2 * 2.5;
    balanceAssembly.rotation.z = Math.sin(omega) * 2.35;
    const springPulse = 1 + Math.sin(omega) * 0.032;
    hairspring.scale.set(springPulse, springPulse, 1);

    // Subtle mechanical advance on escape wheel & gear train
    escapeWheel.rotation.z = -elapsedSeconds * 1.1;
    fourthGear.rotation.z = -elapsedSeconds * 0.1047;
    thirdGear.rotation.z = elapsedSeconds * 0.04;
    centerGear.rotation.z = -elapsedSeconds * 0.008;
    ratchetWheel.rotation.z = elapsedSeconds * 0.003;
    crownWheel.rotation.z = -elapsedSeconds * 0.005;
    chronoRunner.rotation.z = -elapsedSeconds * 0.1047;

    // Hands: classic 10:10 pose; central chronograph needle rests vertically at 12 o'clock
    // while running sub-seconds (9 o'clock) sweeps smoothly at 1 Hz
    hourHand.rotation.z = 0.96 - elapsedSeconds * 0.000145;
    minHand.rotation.z = -0.96 - elapsedSeconds * 0.00174;
    secHand.rotation.z = 0;
    subSecHand.rotation.z = 0.8 - elapsedSeconds * ((Math.PI * 2) / 60);
    subMinHand.rotation.z = 0;
  };

  /**
   * Section 02 Disassembly: separates all 6 service modules wide horizontally across the viewport
   * AND detaches the closed oval bracelet loop cleanly to the far left behind the Caseback,
   * matching the reference exploded diagram.
   */
  const layerOrder = ['caseback', 'chronograph', 'regulation', 'movement', 'case', 'dial'];
  const layerSpreadZ = {
    caseback: -3.35,
    chronograph: -1.75,
    regulation: -0.35,
    movement: 1.55,
    case: 3.15,
    dial: 4.75
  };

  const applyDisassembly = (amount, selectedLayerId = null) => {
    layerOrder.forEach((id) => {
      const g = layerGroups[id];
      // Lift Regulation slightly toward vertical center when exploded so it frames evenly
      const yLift = id === 'regulation' ? 0.55 * amount : 0;
      g.position.set(0, yLift, layerSpreadZ[id] * amount);
    });
    // Position bracelet loop cleanly behind Caseback with clear separation from Caseback ring
    braceletGroup.position.set(0, 0, (-layerSpreadZ.case - 4.25) * amount);

    const isIsolating = Boolean(selectedLayerId);
    if (isIsolating || currentGhostMode) {
      parts.forEach((mesh) => {
        if (!isIsolating) {
          mesh.material = mesh.userData.originalMat;
        } else {
          mesh.material =
            mesh.userData.layerId === selectedLayerId ? mesh.userData.originalMat : materials.ghost;
        }
      });
      currentGhostMode = isIsolating;
    }
  };

  /**
   * Section 03 Particles / Mechanical Heart: gradually fades out the outer case & dial
   * early in the section to spotlight the bare movement, then reveals a frosted shell.
   */
  const applyHeartReveal = (shellMode = 'normal') => {
    if (shellMode === 'bare') {
      layerGroups.case.visible = false;
      layerGroups.dial.visible = false;
      layerGroups.caseback.visible = false;
      currentGhostMode = true;
    } else if (shellMode === 'frosted') {
      layerGroups.case.visible = true;
      layerGroups.dial.visible = false;
      layerGroups.caseback.visible = true;
      braceletGroup.visible = true;
      parts.forEach((mesh) => {
        if (mesh.userData.layerId === 'case' || mesh.userData.layerId === 'caseback') {
          mesh.material = materials.frostedShell;
        } else {
          mesh.material = mesh.userData.originalMat;
        }
      });
      currentGhostMode = true;
    } else {
      layerGroups.case.visible = true;
      layerGroups.dial.visible = true;
      layerGroups.caseback.visible = true;
      braceletGroup.visible = true;
      if (currentGhostMode) {
        parts.forEach((mesh) => {
          mesh.material = mesh.userData.originalMat;
        });
        currentGhostMode = false;
      }
    }
  };

  /**
   * Section 08 Coming Together: stages Case, Bezel, and Caseback along a clean bottom
   * watchmaker tray (progress 0..0.44), flies movement & dial parts into the ghost
   * silhouette first, then lifts Case/Bezel/Caseback and streams bracelet links upward.
   */
  const applyReassembly = (progress) => {
    layerOrder.forEach((id) => layerGroups[id].position.set(0, 0, 0));
    braceletGroup.position.set(0, 0, 0);

    updateBraceletArticulation(0, 0);

    // Individual bracelet links slide smoothly upward from below the watch (0.64 -> 0.98)
    braceletLinks.forEach(({ group, sideSign, index }) => {
      const start = 0.64 + (index / linkCountPerSide) * 0.22;
      const localT = THREE.MathUtils.clamp((progress - start) / 0.14, 0, 1);
      const ease = 1 - Math.pow(1 - localT, 3);
      const inv = 1 - ease;
      if (inv > 0.001) {
        group.position.y -= inv * (3.6 + index * 0.22);
        group.position.x += inv * sideSign * ((index % 2 === 0 ? -1 : 1) * 0.12);
        group.rotation.x += inv * sideSign * 0.5;
      }
      group.visible = localT > 0.02 || index < 2;
    });

    endLinks.forEach(({ group }) => {
      const localT = THREE.MathUtils.clamp((progress - 0.62) / 0.16, 0, 1);
      const inv = 1 - (1 - Math.pow(1 - localT, 3));
      group.position.y -= inv * 3.0;
      group.visible = localT > 0.02;
    });

    const claspT = THREE.MathUtils.clamp((progress - 0.84) / 0.14, 0, 1);
    const claspInv = 1 - (1 - Math.pow(1 - claspT, 3));
    claspGroup.position.y -= claspInv * 3.4;
    claspGroup.visible = claspT > 0.02;

    parts.forEach((mesh) => {
      const role = mesh.userData.trayRole;
      if (role === 'braceletLink') return;

      const ap = mesh.userData.assembledPos;
      const ar = mesh.userData.assembledRot;

      // Major outer rings stage side-by-side along the lower watchmaker tray first (00:20)
      if (role === 'midCase' || role === 'bezel' || role === 'caseback') {
        const trayX = role === 'midCase' ? -2.75 : role === 'bezel' ? 0.0 : 2.75;
        const trayY = -2.25;
        const trayZ = 0.55;
        const start = role === 'midCase' ? 0.36 : role === 'bezel' ? 0.44 : 0.52;
        const localT = THREE.MathUtils.clamp((progress - start) / 0.24, 0, 1);
        const ease = 1 - Math.pow(1 - localT, 3);
        const inv = 1 - ease;

        mesh.position.set(
          THREE.MathUtils.lerp(ap.x + trayX, ap.x, ease),
          THREE.MathUtils.lerp(ap.y + trayY, ap.y, ease),
          THREE.MathUtils.lerp(ap.z + trayZ, ap.z, ease)
        );
        mesh.rotation.set(ar.x - 0.32 * inv, ar.y, ar.z);
        return;
      }

      // Movement, Chronograph, Regulation, Dial & hardware fly smoothly from orderly lower offsets
      const start = mesh.userData.reassemblyOrder * 0.48;
      const span = 0.24;
      const localT = THREE.MathUtils.clamp((progress - start) / span, 0, 1);
      const ease = 1 - Math.pow(1 - localT, 3);
      const inv = 1 - ease;

      const sc = mesh.userData.scatterOffset;
      mesh.position.set(
        ap.x + sc.x * 0.52 * inv,
        ap.y + (sc.y - 0.35) * 0.58 * inv,
        ap.z + sc.z * 0.45 * inv
      );
      const sr = mesh.userData.scatterRot;
      mesh.rotation.set(ar.x + sr.x * inv, ar.y + sr.y * inv, ar.z + sr.z * inv);
    });
  };

  const resetParts = () => {
    parts.forEach((mesh) => {
      mesh.position.copy(mesh.userData.assembledPos);
      mesh.rotation.copy(mesh.userData.assembledRot);
    });
    braceletLinks.forEach(({ group }) => {
      group.visible = true;
    });
    endLinks.forEach(({ group }) => {
      group.visible = true;
    });
    claspGroup.visible = true;
    layerOrder.forEach((id) => layerGroups[id].position.set(0, 0, 0));
    braceletGroup.position.set(0, 0, 0);
  };

  return {
    root,
    ghostRoot,
    layerGroups,
    parts,
    tickMovement,
    updateBraceletArticulation,
    applyDisassembly,
    applyHeartReveal,
    applyReassembly,
    resetParts,
    setGhostSilhouetteVisible
  };
}
