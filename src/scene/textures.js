import * as THREE from 'three';

function heightToNormalCanvas(heightCanvas, strength = 2.0) {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const srcCtx = heightCanvas.getContext('2d');
  const src = srcCtx.getImageData(0, 0, w, h).data;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d');
  const outImg = outCtx.createImageData(w, h);
  const dst = outImg.data;

  const sample = (x, y) => {
    const cx = (x + w) % w;
    const cy = (y + h) % h;
    return src[(cy * w + cx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (sample(x + 1, y) - sample(x - 1, y)) * strength;
      const dy = (sample(x, y + 1) - sample(x, y - 1)) * strength;
      let nx = -dx;
      let ny = -dy;
      let nz = 1.0;
      const invLen = 1 / Math.hypot(nx, ny, nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (y * w + x) * 4;
      dst[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }
  outCtx.putImageData(outImg, 0, 0);
  return outCanvas;
}

/**
 * Generates an HDR-like procedural studio lighting environment via PMREMGenerator.
 * High-contrast bright softboxes separated by dark negative-fill planes produce
 * razor-sharp bevel reflections on brushed and polished watch metals.
 */
export function createStudioEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  // Bright studio cyclorama base with sculpted horizon contrast so steel links show gradient depth
  envScene.background = new THREE.Color(0x9ca2ab);

  const addPanel = (w, h, pos, lookAt, color, intensity) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const col = new THREE.Color(color).multiplyScalar(intensity);
    const mat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.lookAt(...lookAt);
    envScene.add(mesh);
  };

  // Large overhead + front-upper studio softboxes (illuminates bracelet links, lugs & hands brightly)
  addPanel(24, 14, [-1, 13, 8], [0, 0, 0], 0xffffff, 2.85);
  addPanel(18, 8, [-4, 6, 13], [0, 0, 0], 0xf6f8fc, 1.9);
  // Bright front-left & right-side studio bounce reflectors
  addPanel(8, 22, [-12, 2, 9], [0, 0, 0], 0xffffff, 2.5);
  addPanel(7, 20, [12, 2, 9], [0, 0, 0], 0xfff8ee, 2.05);
  // Subtle lower bounce card
  addPanel(22, 12, [0, -11, 10], [0, 0, 0], 0xd8dde5, 1.55);
  // Back-top rim light
  addPanel(20, 6, [0, 10, -12], [0, 0, 0], 0xffffff, 2.6);
  // Contrast flags for crisp brushed-steel bevel falloff
  addPanel(5, 18, [11, 0, 4], [0, 0, 0], 0x16181c, 1.0);
  addPanel(5, 18, [-11, 0, 4], [0, 0, 0], 0x16181c, 1.0);
  addPanel(18, 3.0, [0, 0.8, 13.5], [0, 0, 0], 0x262930, 1.0);

  // Subtle ambient ring for circular bezel sweeps
  const ringGeo = new THREE.TorusGeometry(14, 0.85, 12, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xffffff).multiplyScalar(2.0)
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(0, 2, 11);
  envScene.add(ring);

  const envRT = pmrem.fromScene(envScene, 0.04);
  pmrem.dispose();
  return envRT.texture;
}

/**
 * Generates brushed-metal normal and roughness textures for lugs, flanks, and bracelet links.
 */
export function createBrushedMetalMaps(maxAnisotropy = 8) {
  const size = 512;
  const hCanvas = document.createElement('canvas');
  hCanvas.width = size;
  hCanvas.height = size;
  const hCtx = hCanvas.getContext('2d');

  hCtx.fillStyle = '#808080';
  hCtx.fillRect(0, 0, size, size);

  // Fine longitudinal grain streaks
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 40 + Math.random() * 180;
    const v = 100 + Math.floor(Math.random() * 55);
    hCtx.strokeStyle = `rgba(${v},${v},${v},0.32)`;
    hCtx.lineWidth = 0.7 + Math.random() * 1.1;
    hCtx.beginPath();
    hCtx.moveTo(x, y);
    hCtx.lineTo(x, y + len);
    hCtx.stroke();
  }

  const normalCanvas = heightToNormalCanvas(hCanvas, 1.4);
  const normalMap = new THREE.CanvasTexture(normalCanvas);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(2, 2);
  normalMap.anisotropy = maxAnisotropy;

  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d');
  rCtx.fillStyle = '#585858';
  rCtx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 64 + Math.floor(Math.random() * 52);
    rCtx.strokeStyle = `rgba(${v},${v},${v},0.4)`;
    rCtx.lineWidth = 1;
    rCtx.beginPath();
    rCtx.moveTo(x, y);
    rCtx.lineTo(x, y + 60 + Math.random() * 140);
    rCtx.stroke();
  }
  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(2, 2);
  roughnessMap.anisotropy = maxAnisotropy;

  return { normalMap, roughnessMap };
}

/**
 * Generates Swiss circular-graining (perlage) maps for the movement mainplate.
 */
export function createPerlageMaps(maxAnisotropy = 8) {
  const size = 512;
  const hCanvas = document.createElement('canvas');
  hCanvas.width = size;
  hCanvas.height = size;
  const ctx = hCanvas.getContext('2d');
  ctx.fillStyle = '#787878';
  ctx.fillRect(0, 0, size, size);

  const step = 28;
  for (let row = -1; row <= size / step + 1; row++) {
    for (let col = -1; col <= size / step + 1; col++) {
      const cx = col * step + (row % 2 === 0 ? 0 : step * 0.5);
      const cy = row * step * 0.85;
      for (let r = 4; r <= 18; r += 2.2) {
        const shade = 105 + Math.floor(((r * 13) % 45));
        ctx.strokeStyle = `rgba(${shade},${shade},${shade},0.48)`;
        ctx.lineWidth = 1.05;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  const normalMap = new THREE.CanvasTexture(heightToNormalCanvas(hCanvas, 2.2));
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(1.6, 1.6);
  normalMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(hCanvas);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(1.6, 1.6);
  roughnessMap.anisotropy = maxAnisotropy;

  return { normalMap, roughnessMap };
}

/**
 * Generates Côtes de Genève + delicate scroll engraving maps for the chronograph bridge.
 */
export function createEngravedBridgeMaps(maxAnisotropy = 8) {
  const size = 512;
  const hCanvas = document.createElement('canvas');
  hCanvas.width = size;
  hCanvas.height = size;
  const ctx = hCanvas.getContext('2d');

  // Ribbed Geneva stripes
  const stripeW = 24;
  for (let x = 0; x < size; x += stripeW) {
    const grad = ctx.createLinearGradient(x, 0, x + stripeW, 0);
    grad.addColorStop(0, '#626262');
    grad.addColorStop(0.5, '#a8a8a8');
    grad.addColorStop(1, '#585858');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, stripeW, size);
  }

  // Fine engraved hairline scrolls
  ctx.strokeStyle = 'rgba(28, 28, 28, 0.72)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 9; i++) {
    const y0 = 60 + i * 48;
    ctx.beginPath();
    ctx.moveTo(40, y0);
    ctx.bezierCurveTo(160, y0 - 24, 340, y0 + 26, 472, y0 - 8);
    ctx.stroke();
  }

  const normalMap = new THREE.CanvasTexture(heightToNormalCanvas(hCanvas, 2.4));
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.anisotropy = maxAnisotropy;

  const colorMap = new THREE.CanvasTexture(hCanvas);
  colorMap.wrapS = colorMap.wrapT = THREE.RepeatWrapping;
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.anisotropy = maxAnisotropy;

  return { normalMap, colorMap };
}

/**
 * Draws the calligraphic "Dinesh" signature on any 2D canvas context.
 */
export function drawDineshSignature(ctx, cx, cy, width, strokeColor) {
  ctx.save();
  ctx.translate(cx - width * 0.5, cy - width * 0.14);
  const s = width / 440;
  ctx.scale(s, s);

  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Capital "D" sweeping stem & curved bowl
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(54, 18);
  ctx.bezierCurveTo(46, 56, 36, 98, 28, 128);
  ctx.stroke();

  ctx.lineWidth = 10.5;
  ctx.beginPath();
  ctx.moveTo(22, 34);
  ctx.bezierCurveTo(68, 4, 146, 8, 152, 58);
  ctx.bezierCurveTo(156, 102, 86, 128, 24, 122);
  ctx.stroke();

  // Flowing lowercase "i-n-e-s-h"
  ctx.lineWidth = 9.2;
  ctx.beginPath();
  // i
  ctx.moveTo(152, 88);
  ctx.bezierCurveTo(164, 78, 174, 64, 178, 52);
  ctx.bezierCurveTo(174, 78, 176, 104, 190, 104);
  // n
  ctx.bezierCurveTo(202, 104, 212, 68, 224, 62);
  ctx.bezierCurveTo(232, 58, 232, 98, 242, 100);
  ctx.bezierCurveTo(252, 102, 262, 64, 276, 62);
  ctx.bezierCurveTo(286, 60, 284, 98, 296, 100);
  // e
  ctx.bezierCurveTo(312, 98, 324, 76, 316, 64);
  ctx.bezierCurveTo(304, 56, 296, 94, 316, 100);
  // s
  ctx.bezierCurveTo(334, 96, 350, 68, 342, 62);
  ctx.bezierCurveTo(334, 58, 354, 90, 344, 102);
  ctx.bezierCurveTo(336, 108, 362, 86, 376, 56);
  // h (tall loop & arch)
  ctx.bezierCurveTo(388, 30, 396, 12, 388, 10);
  ctx.bezierCurveTo(378, 10, 372, 64, 374, 102);
  ctx.bezierCurveTo(384, 72, 398, 60, 408, 64);
  ctx.bezierCurveTo(416, 68, 412, 98, 422, 100);
  ctx.bezierCurveTo(430, 102, 438, 92, 446, 80);
  ctx.stroke();

  // Dot above "i"
  ctx.beginPath();
  ctx.arc(181, 34, 5.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Generates a crisp 1024x1024 dial texture for a given dial palette.
 */
export function createDialTexture(
  { baseColor, edgeColor, inkColor, trackColor, subDialBg, isLight },
  maxAnisotropy = 8
) {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  // Radial sunburst base
  const radGrad = ctx.createRadialGradient(cx, cy - 40, 20, cx, cy, size * 0.52);
  radGrad.addColorStop(0, baseColor);
  radGrad.addColorStop(0.76, baseColor);
  radGrad.addColorStop(1, edgeColor);
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, size, size);

  // Subtle sunray sheen lines
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 360; i++) {
    const a = (i * Math.PI) / 180;
    const alpha = (Math.sin(i * 7) * 0.5 + 0.5) * (isLight ? 0.035 : 0.045);
    ctx.strokeStyle = isLight ? `rgba(255,255,255,${alpha})` : `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5);
    ctx.stroke();
  }
  ctx.restore();

  // Outer minute / 1/5th-second track (radius maps to 1.64 watch units -> outer ~0.46*size)
  const trackOuter = size * 0.458;
  const trackInnerMajor = size * 0.432;
  const trackInnerMinor = size * 0.443;

  ctx.strokeStyle = trackColor;
  for (let i = 0; i < 300; i++) {
    const angle = (i / 300) * Math.PI * 2 - Math.PI / 2;
    const isHour = i % 25 === 0;
    const isSec = i % 5 === 0;
    const r0 = isHour ? trackInnerMajor - 6 : isSec ? trackInnerMajor : trackInnerMinor;
    ctx.lineWidth = isHour ? 3.0 : isSec ? 1.8 : 1.0;
    ctx.globalAlpha = isHour ? 0.92 : isSec ? 0.78 : 0.48;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r0, cy + Math.sin(angle) * r0);
    ctx.lineTo(cx + Math.cos(angle) * trackOuter, cy + Math.sin(angle) * trackOuter);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Inner stepped dial ring border
  ctx.strokeStyle = trackColor;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.415, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Sub-dial rings: 9 o'clock (x = -0.78/1.64) and 3 o'clock (x = +0.78/1.64)
  // Dial plate radius is 1.64 units -> UV maps [-1.64, +1.64] -> [0, size]
  const unitToPx = size / (1.64 * 2);
  const subOffset = 0.78 * unitToPx;
  const subRadius = 0.295 * unitToPx;

  const drawSubDial = (sx, sy, labels) => {
    ctx.save();
    ctx.fillStyle = subDialBg;
    ctx.beginPath();
    ctx.arc(sx, sy, subRadius, 0, Math.PI * 2);
    ctx.fill();

    // Concentric snailing grooves
    for (let r = 8; r < subRadius - 4; r += 3.5) {
      ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.045)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Outer sub-dial bevel ring
    ctx.strokeStyle = trackColor;
    ctx.globalAlpha = 0.36;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(sx, sy, subRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Sub-dial ticks
    const tickCount = labels[0] === '60' ? 60 : 30;
    for (let i = 0; i < tickCount; i++) {
      const a = (i / tickCount) * Math.PI * 2 - Math.PI / 2;
      const major = i % (tickCount / 3) === 0 || i % 5 === 0;
      const rIn = major ? subRadius - 11 : subRadius - 7;
      ctx.globalAlpha = major ? 0.8 : 0.4;
      ctx.lineWidth = major ? 1.7 : 0.9;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * rIn, sy + Math.sin(a) * rIn);
      ctx.lineTo(sx + Math.cos(a) * (subRadius - 2), sy + Math.sin(a) * (subRadius - 2));
      ctx.stroke();
    }

    // Sub-dial numerals (12, 4, 8 o'clock positions -> 60/20/40 or 30/10/20)
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = inkColor;
    ctx.font = '500 14px "Avenir Next", "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelAngles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
    labels.forEach((lbl, idx) => {
      const a = labelAngles[idx];
      const lr = subRadius - 21;
      ctx.fillText(lbl, sx + Math.cos(a) * lr, sy + Math.sin(a) * lr);
    });
    ctx.restore();
  };

  drawSubDial(cx - subOffset, cy, ['60', '20', '40']);
  drawSubDial(cx + subOffset, cy, ['30', '10', '20']);

  // Brand script signature at 12 o'clock
  drawDineshSignature(ctx, cx, cy - size * 0.215, 134, inkColor);

  ctx.fillStyle = inkColor;
  ctx.globalAlpha = 0.52;
  ctx.font = '600 10px "Avenir Next", "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CHRONOGRAPH', cx, cy - size * 0.165);

  // SWISS MADE micro-print near 6 o'clock bottom track
  ctx.font = '600 10px "Avenir Next", "Helvetica Neue", Arial, sans-serif';
  ctx.globalAlpha = 0.52;
  ctx.fillText('SWISS MADE', cx, cy + size * 0.404);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates an accurate planar annular tachymeter bezel texture (radius 1.65 to 1.985).
 */
export function createTachymeterTexture(
  bgColor = '#141518',
  numColor = '#ececec',
  maxAnisotropy = 8
) {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  // Subtle concentric metallic sheen
  const ringGrad = ctx.createRadialGradient(cx, cy, size * 0.38, cx, cy, size * 0.5);
  ringGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
  ringGrad.addColorStop(0.5, 'rgba(255,255,255,0.0)');
  ringGrad.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = ringGrad;
  ctx.fillRect(0, 0, size, size);

  // Map outer bezel radius 1.96 -> 0.49*size, inner 1.66 -> 0.415*size
  const rInner = size * 0.422;
  const rText = size * 0.456;

  // Tachymeter values: angle = (3600 / value) / 60 * 2*PI - PI/2
  const entries = [
    [500, '500'],
    [400, '400'],
    [350, '350'],
    [300, '300'],
    [275, '275'],
    [250, '250'],
    [225, '225'],
    [200, '200'],
    [180, '180'],
    [160, '160'],
    [150, '150'],
    [140, '140'],
    [130, '130'],
    [120, '120'],
    [110, '110'],
    [100, '100'],
    [90, '90'],
    [85, '85'],
    [80, '80'],
    [75, '75'],
    [70, '70'],
    [65, '65'],
    [60, '60']
  ];

  ctx.fillStyle = numColor;
  ctx.strokeStyle = numColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  entries.forEach(([val, label]) => {
    const sec = 3600 / val;
    const angle = (sec / 60) * Math.PI * 2 - Math.PI / 2;

    // Precision dot / tick
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * rInner, cy + Math.sin(angle) * rInner);
    ctx.lineTo(cx + Math.cos(angle) * (rInner + 11), cy + Math.sin(angle) * (rInner + 11));
    ctx.stroke();

    ctx.save();
    ctx.translate(cx + Math.cos(angle) * rText, cy + Math.sin(angle) * rText);
    ctx.rotate(angle + Math.PI / 2);
    ctx.font = '600 17px "Avenir Next", "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(label, 0, 0);
    ctx.restore();
  });

  // TACHYMÈTRE inscription near 1 o'clock (~18 deg)
  const titleChars = 'TACHYMÈTRE'.split('');
  titleChars.forEach((ch, idx) => {
    const a = -Math.PI / 2 + 0.14 + idx * 0.036;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * rText, cy + Math.sin(a) * rText);
    ctx.rotate(a + Math.PI / 2);
    ctx.font = '600 12px "Avenir Next", "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates an engraved clasp crest texture ("A" monogram + hairline borders).
 */
export function createClaspTexture(baseHex = '#bfc3c8', engraveHex = '#3a3d42') {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Brushed horizontal grain
  for (let i = 0; i < 1600; i++) {
    const y = Math.random() * size;
    const x = Math.random() * size;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 80, y);
    ctx.stroke();
  }

  // Engraved "A" crest + AUREN
  ctx.strokeStyle = engraveHex;
  ctx.fillStyle = engraveHex;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = size / 2;
  const cy = size / 2;
  ctx.beginPath();
  ctx.arc(cx, cy - 18, 66, 0, Math.PI * 2);
  ctx.stroke();

  // Stylized D monogram inside clasp crest
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(cx - 20, cy - 48);
  ctx.lineTo(cx - 20, cy + 16);
  ctx.bezierCurveTo(cx + 30, cy + 18, cx + 32, cy - 48, cx - 20, cy - 48);
  ctx.stroke();

  ctx.font = '600 22px "Avenir Next", "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DINESH', cx, cy + 88);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
