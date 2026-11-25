import './styles/main.css';
import { FINISH_PRESETS } from './scene/materials.js';
import { StoryEngine } from './scene/storyEngine.js';

function init() {
  const backdropCanvas = document.getElementById('reference-backdrop');
  const webglCanvas = document.getElementById('watch-canvas');
  const loadingEl = document.getElementById('loading');
  const progressBar = document.getElementById('reference-progress');
  const percentEl = document.getElementById('reference-scroll-percent');

  // Section 01 animated elements
  const heroCircle = document.getElementById('hero-circle');
  const heroWordmark = document.getElementById('hero-wordmark');
  const heroManifesto = document.getElementById('hero-manifesto');
  const introCorners = document.getElementById('intro-corners');
  const heroColorDot = document.getElementById('hero-color-dot');
  const heroColorName = document.getElementById('hero-color-name');

  // Section 02 Disassembly detail panel
  const detailPanel = document.getElementById('component-detail');
  const detailTitle = document.getElementById('detail-title');
  const detailDesc = document.getElementById('detail-desc');
  const detailClose = document.getElementById('detail-close');

  // Section 07 Configurator
  const finishNumberEl = document.getElementById('finish-number');
  const configOutput = document.getElementById('config-output');
  let finishRevision = 1;

  // Section 08 Reassembly
  const reassemblyKicker = document.getElementById('reassembly-stage-kicker');
  const reassemblyDesc = document.getElementById('reassembly-stage-desc');
  const reassemblyPct = document.getElementById('reassembly-pct');
  const reassemblyMeter = document.getElementById('reassembly-meter-fill');

  // Navigation & Play
  const menuBtn = document.getElementById('reference-menu');
  const navOverlay = document.getElementById('reference-navigation');
  const playBtn = document.getElementById('reference-play');
  const backToTopBtn = document.getElementById('back-to-top');

  const overlayGroups = Array.from(document.querySelectorAll('.overlay[data-overlay]'));

  const setActiveOverlays = (sectionKey) => {
    document.body.dataset.section = sectionKey;
    overlayGroups.forEach((el) => {
      const active = el.dataset.overlay === sectionKey;
      el.classList.toggle('is-active', active);
      el.setAttribute('aria-hidden', String(!active));
    });
  };

  const engine = new StoryEngine({
    backdropCanvas,
    webglCanvas,
    onSectionChange: (sectionKey) => {
      setActiveOverlays(sectionKey);
    },
    onProgressChange: (phase, localT) => {
      document.body.dataset.phase = phase.toFixed(5);
      if (progressBar) {
        progressBar.style.transform = `scaleY(${phase.toFixed(4)})`;
      }
      if (percentEl) {
        percentEl.textContent = `${Math.round(phase * 100)}%`;
      }

      // Section 01 Hero -> Scroll Manifesto motion (00:00 -> 00:02)
      if (document.body.dataset.section === 'Intro') {
        const fadeHero = Math.max(0, 1 - localT * 4.2);
        if (heroCircle) heroCircle.style.opacity = String(fadeHero);
        if (heroWordmark) heroWordmark.style.opacity = String(fadeHero);
        if (introCorners) introCorners.style.opacity = String(fadeHero);

        const manT = Math.min(1, Math.max(0, (localT - 0.1) / 0.85));
        if (heroManifesto) {
          const manOpacity = manT > 0 ? Math.sin(Math.min(1, manT * 1.05) * Math.PI) : 0;
          const yVh = 66 - manT * 165;
          heroManifesto.style.opacity = String(Math.min(1, manOpacity * 1.45));
          heroManifesto.style.transform = `translate(-50%, ${yVh.toFixed(2)}vh)`;
        }
      }

      // Section 03 Mechanical Heart text fades out gently as frosted shell zooms forward (00:07)
      const heartOverlay = document.querySelector('.overlay[data-overlay="Particles"]');
      if (heartOverlay) {
        if (document.body.dataset.section === 'Particles') {
          const fadeOut = Math.max(0, 1 - Math.max(0, (localT - 0.56) / 0.2));
          heartOverlay.style.opacity = String(fadeOut);
        } else {
          heartOverlay.style.opacity = '';
        }
      }
    },
    onPresentationStage: (stage) => {
      document.body.dataset.presentation = stage;
    },
    onSelectLayer: (layerMeta) => {
      if (!detailPanel) return;
      if (layerMeta) {
        detailTitle.textContent = layerMeta.name;
        detailDesc.textContent = layerMeta.description;
        detailPanel.classList.add('is-open');
        detailPanel.setAttribute('aria-hidden', 'false');
      } else {
        detailPanel.classList.remove('is-open');
        detailPanel.setAttribute('aria-hidden', 'true');
      }
    },
    onReassemblyUpdate: (progress) => {
      const pct = Math.round(progress * 100);
      if (reassemblyPct) reassemblyPct.textContent = `${pct}%`;
      if (reassemblyMeter) reassemblyMeter.style.width = `${pct}%`;
      if (reassemblyKicker && reassemblyDesc) {
        if (pct < 52) {
          reassemblyKicker.textContent = '02 / THE MECHANICAL HEART';
          reassemblyDesc.textContent = 'Bridges, bearings and wheels return to their place.';
        } else if (pct < 98) {
          reassemblyKicker.textContent = '03 / THE CASE & BRACELET';
          reassemblyDesc.textContent = 'Each element finds its place in the whole.';
        } else {
          reassemblyKicker.textContent = '04 / COMING TOGETHER';
          reassemblyDesc.textContent = 'One complete watch.';
        }
      }
    }
  });

  // Sync radio buttons & hero color indicator
  const syncFinishUI = (customLabel, customDot) => {
    const cfg = engine.userConfig;
    document.querySelectorAll('.pill-row button[data-group]').forEach((btn) => {
      const group = btn.dataset.group;
      const val = btn.dataset.value;
      btn.setAttribute('aria-checked', String(cfg[group] === val));
    });
    if (configOutput) {
      configOutput.textContent = engine.getFinishSummary();
    }
    if (heroColorName) {
      heroColorName.textContent = customLabel || engine.getFinishSummary().split(' · ')[0];
    }
    if (heroColorDot && customDot) {
      heroColorDot.style.background = customDot;
    }
  };

  // Menu Index open/close
  const toggleMenu = (forceState) => {
    const isOpen =
      typeof forceState === 'boolean' ? forceState : !navOverlay.classList.contains('is-open');
    navOverlay.classList.toggle('is-open', isOpen);
    navOverlay.setAttribute('aria-hidden', String(!isOpen));
    menuBtn.setAttribute('aria-expanded', String(isOpen));
  };

  menuBtn?.addEventListener('click', () => toggleMenu());

  // Jump links (header brand & index grid)
  document.querySelectorAll('[data-jump]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      toggleMenu(false);
      engine.setAutoPlay(false);
      engine.scrollToSection(el.dataset.jump);
    });
  });

  // Play / Pause auto-story
  playBtn?.addEventListener('click', () => {
    if (navOverlay.classList.contains('is-open')) toggleMenu(false);
    engine.setAutoPlay(!engine.isAutoPlaying);
  });

  // Section 02 layer buttons & detail close
  document.querySelectorAll('.disassembly-pin[data-layer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      engine.selectLayer(btn.dataset.layer);
    });
  });
  detailClose?.addEventListener('click', () => {
    if (engine.selectedLayerId) {
      engine.selectLayer(engine.selectedLayerId);
    }
  });

  // Section 07 interactive configurator
  document.querySelectorAll('.pill-row button[data-group]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group;
      const val = btn.dataset.value;
      engine.applyUserFinish({ [group]: val });
      finishRevision += 1;
      if (finishNumberEl) {
        finishNumberEl.textContent = String(finishRevision).padStart(2, '0');
      }
      syncFinishUI(null, null);
    });
  });

  // Section 09: clicking any of the 4 watches (or its label) makes it the main hero watch
  document.querySelectorAll('.footer-slot[data-preset]').forEach((slot) => {
    slot.addEventListener('click', () => {
      const preset = engine.applyPreset(slot.dataset.preset);
      if (preset) {
        engine.setAutoPlay(false);
        finishRevision += 1;
        if (finishNumberEl) {
          finishNumberEl.textContent = String(finishRevision).padStart(2, '0');
        }
        syncFinishUI(preset.heroColorName, preset.heroDot);
        engine.scrollToSection('section-intro');
      }
    });
  });

  backToTopBtn?.addEventListener('click', () => {
    engine.setAutoPlay(false);
    engine.scrollToSection('section-intro');
  });

  // Escape key closes Index or Disassembly detail
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (navOverlay.classList.contains('is-open')) toggleMenu(false);
      if (engine.selectedLayerId) engine.selectLayer(engine.selectedLayerId);
    }
  });

  // Apply initial preset & kick off render loop
  syncFinishUI(FINISH_PRESETS['ink-steel'].heroColorName, FINISH_PRESETS['ink-steel'].heroDot);
  engine.start();

  // Dismiss preloader cleanly after initial frame + ring animation settle
  setTimeout(() => {
    loadingEl?.classList.add('is-hidden');
  }, 950);
}

init();
