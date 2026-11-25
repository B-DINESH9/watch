import * as THREE from 'three';
import { BackdropCanvas } from './backdrop.js';
import {
  BRACELET_PALETTES,
  DIAL_PALETTES,
  FINISH_PRESETS,
  HARDWARE_PALETTES,
  WatchMaterialBank
} from './materials.js';
import { createStudioEnvironment } from './textures.js';
import { buildWatch, SERVICE_LAYERS } from './watchBuilder.js';

export const SECTIONS = [
  { id: 'section-intro', key: 'Intro', num: '01', title: 'Introduction' },
  { id: 'section-disassembly', key: 'Disassembly', num: '02', title: 'Inside the watch' },
  { id: 'section-particles', key: 'Particles', num: '03', title: 'Mechanical heart' },
  { id: 'section-presentation', key: 'Presentation', num: '04', title: 'Every detail' },
  { id: 'section-straps', key: 'Straps', num: '05', title: 'The bracelet' },
  { id: 'section-images', key: 'Images', num: '06', title: 'In perspective' },
  { id: 'section-colors', key: 'Colors', num: '07', title: 'Your composition' },
  { id: 'section-parts', key: 'Parts', num: '08', title: 'Coming together' },
  { id: 'section-footer', key: 'Footer', num: '09', title: 'A closer look' }
];

function smoothstep(edge0, edge1, x) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export class StoryEngine {
  constructor(options) {
    this.backdropEl = options.backdropCanvas;
    this.webglEl = options.webglCanvas;
    this.onSectionChange = options.onSectionChange || (() => {});
    this.onProgressChange = options.onProgressChange || (() => {});
    this.onReassemblyUpdate = options.onReassemblyUpdate || (() => {});
    this.onPresentationStage = options.onPresentationStage || (() => {});
    this.onSelectLayer = options.onSelectLayer || (() => {});

    this.backdrop = new BackdropCanvas(this.backdropEl);

    // Three.js Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.webglEl,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Scene & Studio Environment
    this.scene = new THREE.Scene();
    const envTex = createStudioEnvironment(this.renderer);
    this.scene.environment = envTex;

    // Key + Fill + Rim studio lights complementing PMREM reflections
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.85);
    keyLight.position.set(5, 8, 9);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdce6ff, 0.9);
    fillLight.position.set(-7, 2, 6);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffe9cf, 1.35);
    rimLight.position.set(2, -5, -8);
    this.scene.add(rimLight);

    this.camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 80);
    this.camera.position.set(0, 0, 11.5);

    this.subCamera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);

    // Materials & procedural 3D watch
    const maxAniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.materials = new WatchMaterialBank(maxAniso);
    this.watch = buildWatch(this.materials);
    this.scene.add(this.watch.root);
    this.scene.add(this.watch.ghostRoot);
    this.watch.setGhostSilhouetteVisible(false);

    // State
    this.userConfig = { dial: 'ink', hardware: 'silver', bracelet: 'silver' };
    this.selectedLayerId = null;
    this.rawPhase = 0;
    this.smoothPhase = 0;
    this.pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    this.isAutoPlaying = false;
    this.autoPlaySpeed = 0.0115; // full story in ~86s

    // Cached layout metrics
    this.sectionBounds = [];
    this.editorialOneEl = document.getElementById('editorial-one');
    this.editorialTwoEl = document.getElementById('editorial-two');
    this.layerBtnEls = {};
    SERVICE_LAYERS.forEach((l) => {
      this.layerBtnEls[l.id] = document.querySelector(`.disassembly-pin[data-layer="${l.id}"]`);
    });

    this.footerStudyEls = Array.from(document.querySelectorAll('.footer-study'));
    this.hoveredFooterIdx = -1;
    this.footerStudyEls.forEach((el, idx) => {
      const slot = el.closest('.footer-slot') || el;
      slot.addEventListener('mouseenter', () => {
        this.hoveredFooterIdx = idx;
      });
      slot.addEventListener('mouseleave', () => {
        if (this.hoveredFooterIdx === idx) this.hoveredFooterIdx = -1;
      });
    });

    // Smooth camera & watch target accumulators
    this.camTargetPos = new THREE.Vector3(0, 0, 11.5);
    this.camLookTarget = new THREE.Vector3(0, 0, 0);
    this.camCurrentLook = new THREE.Vector3(0, 0, 0);
    this.watchTargetPos = new THREE.Vector3(0, 0, 0);
    this.watchTargetRot = new THREE.Euler(0, 0, 0);
    this.watchTargetScale = 1;
    this.flatness = 0;
    this.openness = 0;
    this.disassemblyAmt = 0;

    this.activeSectionKey = 'Intro';
    this.activePresentationStage = '0';
    this.clock = new THREE.Clock();

    this.measureSections();
    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('resize', () => this.handleResize());
    window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
    window.addEventListener(
      'pointermove',
      (e) => {
        this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
      },
      { passive: true }
    );

    // Stop autoplay immediately if the user grabs wheel or touch
    const interruptAuto = () => {
      if (this.isAutoPlaying) {
        this.setAutoPlay(false);
      }
    };
    window.addEventListener('wheel', interruptAuto, { passive: true });
    window.addEventListener('touchstart', interruptAuto, { passive: true });
  }

  handleResize() {
    this.backdrop.resize();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.measureSections();
  }

  measureSections() {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    this.maxScroll = maxScroll;
    this.sectionBounds = SECTIONS.map((sec) => {
      const el = document.getElementById(sec.id);
      const top = el ? el.offsetTop : 0;
      const height = el ? el.offsetHeight : window.innerHeight;
      return {
        ...sec,
        top,
        bottom: top + height,
        startPhase: top / maxScroll,
        endPhase: Math.min(1, (top + height) / maxScroll)
      };
    });
    this.handleScroll();
  }

  handleScroll() {
    const y = window.scrollY || window.pageYOffset || 0;
    this.rawPhase = THREE.MathUtils.clamp(y / Math.max(1, this.maxScroll), 0, 1);
  }

  setAutoPlay(active) {
    this.isAutoPlaying = Boolean(active);
    const btn = document.getElementById('reference-play');
    if (btn) {
      btn.setAttribute('aria-pressed', String(this.isAutoPlaying));
      const lbl = btn.querySelector('.play-label');
      if (lbl) lbl.textContent = this.isAutoPlaying ? 'Pause' : 'Play';
    }
  }

  scrollToSection(sectionId) {
    const el = document.getElementById(sectionId);
    if (!el) return;
    const offset = sectionId === 'section-intro' ? 0 : el.offsetTop + window.innerHeight * 0.14;
    window.scrollTo({ top: offset, behavior: 'smooth' });
  }

  applyUserFinish(partial) {
    this.userConfig = { ...this.userConfig, ...partial };
    this.materials.applyFinish(this.userConfig);
    return this.getFinishSummary();
  }

  applyPreset(presetId) {
    const preset = FINISH_PRESETS[presetId];
    if (!preset) return null;
    this.userConfig = {
      dial: preset.dial,
      hardware: preset.hardware,
      bracelet: preset.bracelet
    };
    this.materials.applyFinish(this.userConfig);
    return preset;
  }

  getFinishSummary() {
    const d = DIAL_PALETTES[this.userConfig.dial]?.label || 'Ink black';
    const h = HARDWARE_PALETTES[this.userConfig.hardware]?.label || 'Silver';
    const b = BRACELET_PALETTES[this.userConfig.bracelet]?.label || 'Silver steel';
    return `${d} · ${h} hardware · ${b}`;
  }

  selectLayer(layerId) {
    this.selectedLayerId = this.selectedLayerId === layerId ? null : layerId;
    const layerMeta = SERVICE_LAYERS.find((l) => l.id === this.selectedLayerId) || null;
    this.onSelectLayer(layerMeta);
  }

  getActiveSectionInfo(phase) {
    const scrollPx = phase * this.maxScroll + window.innerHeight * 0.25;
    let active = this.sectionBounds[0];
    for (let i = 0; i < this.sectionBounds.length; i++) {
      if (scrollPx >= this.sectionBounds[i].top) {
        active = this.sectionBounds[i];
      }
    }
    const span = Math.max(1, active.bottom - active.top);
    const localT = THREE.MathUtils.clamp(
      (phase * this.maxScroll - active.top) / Math.max(1, span - window.innerHeight * 0.35),
      0,
      1
    );
    return { active, localT };
  }

  updateDisassemblyPins() {
    if (this.activeSectionKey !== 'Disassembly') return;
    const proj = new THREE.Vector3();
    const order = ['caseback', 'chronograph', 'regulation', 'movement', 'case', 'dial'];
    const total = order.length;

    order.forEach((id, idx) => {
      const btn = this.layerBtnEls[id];
      const group = this.watch.layerGroups[id];
      if (!btn || !group) return;

      group.getWorldPosition(proj);
      proj.project(this.camera);

      // Weight projected 3D screen position heavily so bottom leader pins stay centered beneath each assembly
      const projectedPct = (proj.x * 0.5 + 0.5) * 100;
      const fallbackPct = 22 + (idx / (total - 1)) * 58;
      const finalPct = THREE.MathUtils.clamp(
        THREE.MathUtils.lerp(fallbackPct, projectedPct, 0.9),
        12,
        90
      );
      btn.style.left = `${finalPct.toFixed(2)}%`;

      const isSelected = this.selectedLayerId === id;
      const isDimmed = Boolean(this.selectedLayerId) && !isSelected;
      btn.classList.toggle('is-selected', isSelected);
      btn.classList.toggle('is-dimmed', isDimmed);
    });
  }

  start() {
    const loop = () => {
      requestAnimationFrame(loop);
      this.step();
    };
    requestAnimationFrame(loop);
  }

  step() {
    const dt = Math.min(0.05, this.clock.getDelta());
    const elapsed = this.clock.elapsedTime;

    // Optional Play auto-scroll
    if (this.isAutoPlaying) {
      const nextY = window.scrollY + this.maxScroll * this.autoPlaySpeed * dt;
      if (nextY >= this.maxScroll - 2) {
        window.scrollTo({ top: this.maxScroll });
        this.setAutoPlay(false);
      } else {
        window.scrollTo({ top: nextY });
      }
    }

    // Damped scroll phase & pointer parallax
    this.smoothPhase += (this.rawPhase - this.smoothPhase) * 0.11;
    this.pointer.sx += (this.pointer.x - this.pointer.sx) * 0.08;
    this.pointer.sy += (this.pointer.y - this.pointer.sy) * 0.08;

    const { active, localT } = this.getActiveSectionInfo(this.smoothPhase);

    if (active.key !== this.activeSectionKey) {
      this.activeSectionKey = active.key;
      if (active.key !== 'Disassembly' && this.selectedLayerId) {
        this.selectedLayerId = null;
        this.onSelectLayer(null);
      }
      this.onSectionChange(active.key, active);
    }

    this.onProgressChange(this.smoothPhase, localT);

    // Tick animated balance wheel, hairspring, gears & hands
    this.watch.tickMovement(elapsed);

    // Responsive zoom multiplier for narrow/portrait viewports
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const respDist = aspect < 1 ? 1 / Math.max(0.55, aspect * 1.12) : 1;

    // Reset default modes unless overridden by active section
    let darkTarget = 0;
    let targetFlatness = 0;
    let targetOpenness = 0;
    let targetDisassembly = 0;
    let showGhost = false;
    let reassemblyT = -1;
    let heartShellMode = 'normal';

    const px = this.pointer.sx;
    const py = this.pointer.sy;

    switch (active.key) {
      case 'Intro': {
        // 00:00 -> 00:02: hero straight-on -> smooth 360-deg spin during manifesto -> straight-on
        const spinT = smoothstep(0.08, 0.72, localT);
        const rotSpin = spinT * Math.PI * 2;
        this.watchTargetPos.set(0, 0.02, 0);
        this.watchTargetRot.set(
          py * 0.06,
          rotSpin + px * 0.09,
          0
        );
        this.watchTargetScale = THREE.MathUtils.lerp(0.95, 0.9, spinT);
        this.camTargetPos.set(0, 0, THREE.MathUtils.lerp(12.55, 11.8, spinT) * respDist);
        this.camLookTarget.set(0, 0, 0);
        break;
      }

      case 'Disassembly': {
        targetDisassembly = smoothstep(0.0, 0.12, localT);
        const focusOffsets = {
          caseback: -2.6,
          chronograph: -1.25,
          regulation: -0.15,
          movement: 1.35,
          case: 2.65,
          dial: 3.9
        };
        const focusX = this.selectedLayerId ? focusOffsets[this.selectedLayerId] || 0 : -0.55;
        const focusZ = this.selectedLayerId ? 10.6 : 15.6;

        // rotY = 2.22 turns the detailed -Z calibre & caseback side ~38° toward the viewer;
        // lifted slightly (+0.28 Y) so all 6 bottom labels sit in clear air beneath the bracelet.
        this.watchTargetPos.set(0.15, 0.28, 0);
        this.watchTargetRot.set(-0.04 + py * 0.03, 2.22 + px * 0.04, 0.0);
        this.watchTargetScale = 0.82;
        this.camTargetPos.set(focusX, 0.0, focusZ * respDist);
        this.camLookTarget.set(focusX, 0.0, 0);
        break;
      }

      case 'Particles': {
        darkTarget = 1;
        const isFrosted = localT >= 0.62;
        heartShellMode = isFrosted ? 'frosted' : 'bare';
        const zoomT = smoothstep(0.62, 0.92, localT);
        // Dead-center straight-on rear calibre (00:04-00:06), then zooms closer with frosted shell (00:07)
        this.watchTargetPos.set(0, 0, 0);
        this.watchTargetRot.set(
          py * 0.06,
          Math.PI + px * 0.08,
          0
        );
        this.watchTargetScale = THREE.MathUtils.lerp(1.06, 1.24, zoomT);
        this.camTargetPos.set(0, 0, THREE.MathUtils.lerp(9.6, 8.2, zoomT) * respDist);
        this.camLookTarget.set(0, 0, 0);
        break;
      }

      case 'Presentation': {
        const stage = localT < 0.24 ? '0' : localT < 0.52 ? '1' : '2';
        if (stage !== this.activePresentationStage) {
          this.activePresentationStage = stage;
          this.onPresentationStage(stage);
        }

        if (stage === '0') {
          this.watchTargetPos.set(0, -0.85, 0);
          this.watchTargetRot.set(0.38 + py * 0.06, -0.48 + px * 0.09, -0.14);
          this.watchTargetScale = 0.92;
          this.camTargetPos.set(0, 0.1, 10.8 * respDist);
          this.camLookTarget.set(0, -0.5, 0);
        } else if (stage === '1') {
          // 00:08 A MECHANICAL LEGACY: vertical rear sapphire exhibition caseback clearly on the right
          this.watchTargetPos.set(1.85, 0.05, 0);
          this.watchTargetRot.set(-0.06 + py * 0.04, Math.PI - 0.34 + px * 0.07, 0.04);
          this.watchTargetScale = 1.02;
          this.camTargetPos.set(0.3, 0, 9.4 * respDist);
          this.camLookTarget.set(0.45, 0, 0);
        } else {
          // 00:09-00:12 IN YOUR HANDS: smooth scrub orbit from rear-flank crown/pushers to angled dial-up
          const orbitT = smoothstep(0.52, 0.96, localT);
          this.watchTargetPos.set(
            THREE.MathUtils.lerp(1.2, 0.72, orbitT),
            THREE.MathUtils.lerp(-0.45, -0.68, orbitT),
            0
          );
          this.watchTargetRot.set(
            THREE.MathUtils.lerp(0.14, 0.62, orbitT) + py * 0.04,
            THREE.MathUtils.lerp(Math.PI - 0.62, -0.52, orbitT) + px * 0.07,
            THREE.MathUtils.lerp(0.06, -0.18, orbitT)
          );
          this.watchTargetScale = THREE.MathUtils.lerp(1.04, 1.0, orbitT);
          this.camTargetPos.set(0.25, 0.1, 9.4 * respDist);
          this.camLookTarget.set(0.25, -0.45, 0);
        }
        break;
      }

      case 'Straps': {
        targetFlatness = 1;
        this.watchTargetPos.set(0, -0.12, 0);
        this.watchTargetRot.set(py * 0.05, Math.PI + px * 0.06, Math.PI / 2);
        this.watchTargetScale = 1.05;
        this.camTargetPos.set(0, -0.12, 9.8 * respDist);
        this.camLookTarget.set(0, -0.12, 0);
        break;
      }

      case 'Images': {
        this.watchTargetPos.set(0, 0, 0);
        this.watchTargetRot.set(0, 0, 0);
        this.watchTargetScale = 1;
        break;
      }

      case 'Colors': {
        // 00:16-00:18: crisp straight-on watch on the right
        this.watchTargetPos.set(aspect < 1 ? 0 : 1.55, aspect < 1 ? 0.55 : 0.0, 0);
        this.watchTargetRot.set(0.02 + py * 0.08, -0.05 + px * 0.12, 0);
        this.watchTargetScale = aspect < 1 ? 0.85 : 0.96;
        this.camTargetPos.set(0, 0, 11.4 * respDist);
        this.camLookTarget.set(0, 0, 0);
        break;
      }

      case 'Parts': {
        // 00:20-00:23: centered straight-on watch clearly spaced between top-left & bottom-left copy
        showGhost = true;
        reassemblyT = smoothstep(0.03, 0.92, localT);
        this.onReassemblyUpdate(reassemblyT);
        this.watchTargetPos.set(0.2, 0.24, 0);
        this.watchTargetRot.set(
          py * 0.04,
          px * 0.06,
          0
        );
        this.watchTargetScale = 0.78;
        this.camTargetPos.set(0, 0.0, 12.6 * respDist);
        this.camLookTarget.set(0, -0.15, 0);
        break;
      }

      case 'Footer': {
        // Handled with 4-watch horizontal lineup viewports below
        this.watchTargetPos.set(0, 0, 0);
        this.watchTargetRot.set(0, 0, 0);
        this.watchTargetScale = 1;
        break;
      }
    }

    // Apply heart shell mode / normal materials
    if (active.key !== 'Disassembly') {
      this.watch.applyHeartReveal(heartShellMode);
    } else {
      this.watch.applyHeartReveal('normal');
    }

    // Smoothly interpolate articulation & disassembly
    this.flatness += (targetFlatness - this.flatness) * 0.12;
    this.openness += (targetOpenness - this.openness) * 0.12;
    this.disassemblyAmt += (targetDisassembly - this.disassemblyAmt) * 0.12;

    this.watch.setGhostSilhouetteVisible(showGhost, 0.14);
    if (reassemblyT >= 0) {
      this.watch.applyReassembly(reassemblyT);
    } else {
      this.watch.resetParts();
      this.watch.applyDisassembly(this.disassemblyAmt, this.selectedLayerId);
      if (active.key !== 'Images') {
        this.watch.updateBraceletArticulation(this.flatness, this.openness);
      }
    }

    // Smoothly interpolate root & camera transforms
    this.watch.root.position.lerp(this.watchTargetPos, 0.11);
    this.watch.root.rotation.x += (this.watchTargetRot.x - this.watch.root.rotation.x) * 0.11;
    this.watch.root.rotation.y += (this.watchTargetRot.y - this.watch.root.rotation.y) * 0.11;
    this.watch.root.rotation.z += (this.watchTargetRot.z - this.watch.root.rotation.z) * 0.11;
    const sc = THREE.MathUtils.lerp(this.watch.root.scale.x, this.watchTargetScale, 0.11);
    this.watch.root.scale.setScalar(sc);

    // Keep ghost silhouette locked to watch root
    this.watch.ghostRoot.position.copy(this.watch.root.position);
    this.watch.ghostRoot.rotation.copy(this.watch.root.rotation);
    this.watch.ghostRoot.scale.copy(this.watch.root.scale);

    this.camera.position.lerp(this.camTargetPos, 0.11);
    this.camCurrentLook.lerp(this.camLookTarget, 0.11);
    this.camera.lookAt(this.camCurrentLook);

    // 1. Render 2D studio/dark backdrop
    this.backdrop.render(darkTarget, elapsed);

    // 2. Render 3D scene (standard full-screen OR multi-viewport for Images & Footer)
    if (active.key === 'Images') {
      this.renderDualEditorialViewports(px, py);
    } else if (active.key === 'Footer') {
      this.renderFooterLineup(px, py);
    } else {
      this.renderer.setScissorTest(false);
      this.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
      this.renderer.render(this.scene, this.camera);
    }

    // Sync Section 02 vertical leader pins with 3D positions
    this.updateDisassemblyPins();
  }

  renderSubViewport(rect, setupFn) {
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    if (rect.width <= 2 || rect.height <= 2 || rect.bottom <= 0 || rect.top >= winH) {
      return;
    }

    const left = Math.max(0, Math.floor(rect.left));
    const right = Math.min(winW, Math.ceil(rect.right));
    const top = Math.max(0, Math.floor(rect.top));
    const bottom = Math.min(winH, Math.ceil(rect.bottom));

    const width = right - left;
    const height = bottom - top;
    if (width <= 2 || height <= 2) return;

    // WebGL viewport coordinates are bottom-up, while DOM rect is top-down
    const fullW = Math.round(rect.width);
    const fullH = Math.round(rect.height);
    const fullLeft = Math.round(rect.left);
    const fullBottom = Math.round(winH - rect.bottom);

    this.renderer.setScissor(left, winH - bottom, width, height);
    this.renderer.setViewport(fullLeft, fullBottom, fullW, fullH);

    this.subCamera.aspect = fullW / Math.max(1, fullH);
    this.subCamera.updateProjectionMatrix();

    setupFn();
    this.renderer.render(this.scene, this.subCamera);
  }

  renderDualEditorialViewports(px, py) {
    this.renderer.setScissorTest(false);
    this.renderer.clear();
    this.renderer.setScissorTest(true);

    // Left figure: Straight-on front dial perspective (00:14)
    if (this.editorialOneEl) {
      const r1 = this.editorialOneEl.getBoundingClientRect();
      this.renderSubViewport(r1, () => {
        this.watch.updateBraceletArticulation(0, 0);
        this.watch.root.position.set(0, 0, 0);
        this.watch.root.rotation.set(py * 0.05, px * 0.07, 0);
        this.watch.root.scale.setScalar(1.0);
        this.subCamera.position.set(0, 0, 10.4);
        this.subCamera.lookAt(0, 0, 0);
      });
    }

    // Right figure: Straight-on rear exhibition caseback with full vertical bracelet (00:14)
    if (this.editorialTwoEl) {
      const r2 = this.editorialTwoEl.getBoundingClientRect();
      this.renderSubViewport(r2, () => {
        this.watch.updateBraceletArticulation(0, 0);
        this.watch.root.position.set(0, 0, 0);
        this.watch.root.rotation.set(py * 0.05, Math.PI + px * 0.07, 0);
        this.watch.root.scale.setScalar(1.0);
        this.subCamera.position.set(0, 0, 10.4);
        this.subCamera.lookAt(0, 0, 0);
      });
    }

    this.renderer.setScissorTest(false);
  }

  renderFooterLineup(px, py) {
    const presetOrder = ['ink-steel', 'midnight', 'silver-champagne', 'ink-champagne'];
    this.renderer.setScissorTest(false);
    this.renderer.clear();
    this.renderer.setScissorTest(true);

    this.watch.updateBraceletArticulation(0, 0);
    this.watch.root.position.set(0, -0.18, 0);
    this.watch.root.scale.setScalar(0.84);

    presetOrder.forEach((pid, idx) => {
      const slotEl = this.footerStudyEls[idx];
      if (!slotEl) return;
      const rect = slotEl.getBoundingClientRect();
      this.renderSubViewport(rect, () => {
        this.materials.applyFinish(FINISH_PRESETS[pid]);
        const isHovered = this.hoveredFooterIdx === idx;
        this.watch.root.rotation.set(
          py * 0.05 + (isHovered ? 0.06 : 0),
          px * 0.07 + (isHovered ? -0.22 : 0),
          0
        );
        this.watch.root.scale.setScalar(isHovered ? 0.9 : 0.84);
        this.subCamera.position.set(0, 0, 13.6);
        this.subCamera.lookAt(0, -0.1, 0);
      });
    });

    // Restore user's active configured material finish immediately after drawing lineup
    this.materials.applyFinish(this.userConfig);
    this.renderer.setScissorTest(false);
  }
}
