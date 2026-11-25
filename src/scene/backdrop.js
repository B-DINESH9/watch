/**
 * Fixed 2D backdrop canvas (#reference-backdrop) handling the warm-gray studio gradient,
 * smooth dark-stage transition in Section 03 ("Particles" / Mechanical Heart),
 * and subtle kinetic orbital arc trails behind the exposed calibre.
 */
export class BackdropCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.darkBlend = 0;

    // Pre-seeded orbital arcs for Section 03
    this.arcs = Array.from({ length: 16 }, (_, i) => ({
      radiusNorm: 0.14 + (i / 16) * 0.42,
      startAngle: (i * 1.15) % (Math.PI * 2),
      span: 0.55 + ((i * 7) % 5) * 0.26,
      speed: (i % 2 === 0 ? 1 : -1) * (0.045 + (i % 5) * 0.015),
      alpha: 0.05 + (i % 4) * 0.032,
      lineWidth: i % 3 === 0 ? 1.25 : 0.75
    }));

    this.resize();
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
  }

  render(darkTarget, timeSec) {
    // Smooth exponential blend toward target dark-stage factor
    this.darkBlend += (darkTarget - this.darkBlend) * 0.08;
    const d = this.darkBlend;

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    const w = this.width;
    const h = this.height;
    const cx = w * 0.5;
    const cy = h * 0.5;

    // Interpolate studio gray (#ebebeb -> #dedede) to deep obsidian (#0d0d0d -> #050506)
    const lerpC = (a, b) => Math.round(a + (b - a) * d);
    const centerHex = `rgb(${lerpC(244, 24)},${lerpC(244, 24)},${lerpC(244, 26)})`;
    const outerHex = `rgb(${lerpC(230, 9)},${lerpC(230, 9)},${lerpC(230, 10)})`;

    const grad = ctx.createRadialGradient(cx, cy * 0.92, 0, cx, cy, Math.max(w, h) * 0.74);
    grad.addColorStop(0, centerHex);
    grad.addColorStop(1, outerHex);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Draw subtle animated circular arc trails during Section 03 dark-mode reveal
    if (d > 0.02) {
      const minDim = Math.min(w, h);
      ctx.save();
      ctx.translate(cx, cy);
      for (let i = 0; i < this.arcs.length; i++) {
        const arc = this.arcs[i];
        const a0 = arc.startAngle + timeSec * arc.speed;
        ctx.strokeStyle = `rgba(224, 224, 228, ${arc.alpha * d})`;
        ctx.lineWidth = arc.lineWidth;
        ctx.beginPath();
        ctx.arc(0, 0, arc.radiusNorm * minDim, a0, a0 + arc.span);
        ctx.stroke();
      }

      // Subtle micro-dust particles drifting along orbits
      for (let p = 0; p < 24; p++) {
        const orbit = (0.18 + (p / 24) * 0.36) * minDim;
        const pa = p * 1.7 + timeSec * (p % 2 === 0 ? 0.07 : -0.05);
        const px = Math.cos(pa) * orbit;
        const py = Math.sin(pa) * orbit;
        ctx.fillStyle = `rgba(215, 218, 225, ${(0.12 + (p % 3) * 0.08) * d})`;
        ctx.beginPath();
        ctx.arc(px, py, p % 4 === 0 ? 1.5 : 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  }
}
