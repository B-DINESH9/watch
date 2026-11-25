# Dinesh — Open Heart

Interactive 3D scroll-storytelling web experience showcasing a hand-wound open-heart mechanical chronograph built with **Three.js** and **Vite**.

**Live Demo (GitHub Pages):** https://b-dinesh9.github.io/watch/

## Features

- **100% Procedural 3D Horology**: Multi-layer mechanical chronograph built dynamically in Three.js (`src/scene/watchBuilder.js`), featuring:
  - Oscillating 6 o'clock open-heart balance wheel (`18,000 vph`), breathing spiral hairspring, escape wheel, ruby jewel bearings, blued steel screws, and rotating gear train.
  - Sculpted mid-case with lyre lugs, planar UV-mapped tachymeter bezel, domed sapphire crystal, fluted winding crown, and twin stepped chronograph pushers.
  - Articulated 20-link flat-link bracelet with engraved `D / DINESH` folding clasp across closed wrist-loop, opened exhibition, and flat-laid states.
- **Procedural Studio Environment & PBR Textures** (`src/scene/textures.js`, `src/scene/materials.js`):
  - PMREM studio softbox lighting environment for crisp brushed/polished steel and champagne gold reflections.
  - High-DPI procedural canvas maps for sunburst dials, logarithmic tachymeter scales, circular perlage mainplate, Geneva-striped/engraved bridges, brushed metal, and clasp engraving.
- **9 Scroll-Driven Interactive Chapters** (`src/scene/storyEngine.js`):
  1. **01 — Introduction**: Studio hero view, hairline frame, calligraphic `Dinesh` script signature, and 360° scroll-manifesto spin.
  2. **02 — Inside the watch**: Exploded 6-module assembly (`Caseback`, `Chronograph`, `Regulation`, `Movement`, `Case`, `Dial & hands`) with clickable leader pins, module isolation, and detail drawer.
  3. **03 — Mechanical heart**: Smooth dark-mode transition (`#0d0d0d` backdrop with kinetic orbital arcs) spotlighting the bare calibre before zooming into a frosted translucent shell.
  4. **04 — Every detail**: Three-stage camera sequence highlighting contours, rear sapphire exhibition caseback, and crown/pusher scrub orbit.
  5. **05 — The bracelet**: Full-width horizontal flat-link bracelet centered on the engraved folding clasp.
  6. **06 — In perspective**: Dual live borderless 3D viewports showing front dial and rear movement simultaneously.
  7. **07 — Your composition**: Real-time PBR configurator for **Dial** (`Ink black`, `Midnight blue`, `Silver grey`), **Hardware** (`Silver`, `Graphite`, `Champagne`), and **Steel bracelet** (`Silver steel`, `Dark steel`).
  8. **08 — Coming together**: Progressive ghost-silhouette reassembly with staged outer rings and upward-streaming bracelet links.
  9. **09 — A closer look**: Four interactive finish studies (`Ink steel`, `Midnight`, `Silver champagne`, `Ink champagne`) — clicking any watch applies its finish as the main Hero watch and returns smoothly to the top.
- **Story Controls**: Fixed top header with **Play/Pause** automated story tour and full-screen **Index** chapter jump menu, plus a right-edge vertical scroll progress track.

## Tech Stack

- [Three.js](https://threejs.org/) (`^0.170.0`)
- [Vite](https://vite.dev/) (`^6.0.0`)
- Vanilla JavaScript (ES Modules), HTML5 Canvas 2D, and CSS Custom Properties

## Project Structure

```text
├── index.html                  # Semantic 9-section scroll spacer tracks & HUD overlays
├── package.json                # Project scripts and dependencies
├── vite.config.js              # Vite dev/build configuration
└── src/
    ├── main.js                 # UI event wiring, preloader, configurator & scroll sync
    ├── styles/
    │   └── main.css            # Studio theme, dark-mode transitions & responsive layout
    └── scene/
        ├── backdrop.js         # Fixed 2D backdrop canvas & orbital arc trails
        ├── materials.js        # PBR finish palettes, presets & ghost materials
        ├── storyEngine.js      # Scroll-phase choreography, multi-viewport & camera rig
        ├── textures.js         # PMREM studio lighting & procedural PBR canvas textures
        └── watchBuilder.js     # Procedural 3D open-heart watch & animation controller
```

## Getting Started

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build production bundle
npm run build

# Preview production build
npm run preview
```

## Deployment (GitHub Pages)

Every push to `main` builds the Vite bundle (`dist/`) and deploys automatically via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) to **https://b-dinesh9.github.io/watch/**.
