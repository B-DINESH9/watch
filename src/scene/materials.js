import * as THREE from 'three';
import {
  createBrushedMetalMaps,
  createClaspTexture,
  createDialTexture,
  createEngravedBridgeMaps,
  createPerlageMaps,
  createTachymeterTexture
} from './textures.js';

export const DIAL_PALETTES = {
  ink: {
    label: 'Ink black',
    baseColor: '#111317',
    edgeColor: '#07080a',
    inkColor: '#e9eaed',
    trackColor: '#d0d3d8',
    subDialBg: '#0c0e11',
    isLight: false
  },
  midnight: {
    label: 'Midnight blue',
    baseColor: '#122544',
    edgeColor: '#091325',
    inkColor: '#eef2f7',
    trackColor: '#c9d5e6',
    subDialBg: '#0d1b33',
    isLight: false
  },
  silver: {
    label: 'Silver grey',
    baseColor: '#cbcfd4',
    edgeColor: '#a6abb2',
    inkColor: '#1c1f24',
    trackColor: '#26292e',
    subDialBg: '#bcc1c7',
    isLight: true
  }
};

export const HARDWARE_PALETTES = {
  silver: {
    label: 'Silver',
    metalColor: 0xced3da,
    polishedColor: 0xe6eaf0,
    bezelColor: '#090a0c',
    bezelText: '#eceef2',
    handColor: 0xe4e0d2,
    indexColor: 0xdfd3b4,
    secHandColor: 0xe4e6ea,
    roughness: 0.22,
    polishedRoughness: 0.06
  },
  graphite: {
    label: 'Graphite',
    metalColor: 0x3b4048,
    polishedColor: 0x525862,
    bezelColor: '#090a0d',
    bezelText: '#d4d8df',
    handColor: 0xdde1e7,
    indexColor: 0xd9cfa8,
    secHandColor: 0xb8bec6,
    roughness: 0.27,
    polishedRoughness: 0.09
  },
  champagne: {
    label: 'Champagne',
    metalColor: 0xd5b88f,
    polishedColor: 0xe6cda6,
    bezelColor: '#12100e',
    bezelText: '#e8d6b8',
    handColor: 0xebd4af,
    indexColor: 0xebd4af,
    secHandColor: 0xe6c89a,
    roughness: 0.21,
    polishedRoughness: 0.06
  }
};

export const BRACELET_PALETTES = {
  silver: {
    label: 'Silver steel',
    outerColor: 0xaab0b8,
    centerColor: 0xcbd0d8,
    claspBg: '#b8bec6',
    claspInk: '#35383d',
    roughness: 0.3
  },
  dark: {
    label: 'Dark steel',
    outerColor: 0x262b33,
    centerColor: 0x39404b,
    claspBg: '#272c34',
    claspInk: '#aeb5bf',
    roughness: 0.29
  }
};

export const FINISH_PRESETS = {
  'ink-steel': {
    id: 'ink-steel',
    label: 'Ink steel',
    heroColorName: 'Stainless steel',
    heroDot: 'linear-gradient(135deg, #f3f3f3 0%, #9b9ea3 100%)',
    dial: 'ink',
    hardware: 'silver',
    bracelet: 'silver'
  },
  midnight: {
    id: 'midnight',
    label: 'Midnight',
    heroColorName: 'Midnight dark steel',
    heroDot: 'linear-gradient(135deg, #274472 0%, #101826 100%)',
    dial: 'midnight',
    hardware: 'graphite',
    bracelet: 'dark'
  },
  'silver-champagne': {
    id: 'silver-champagne',
    label: 'Silver champagne',
    heroColorName: 'Silver & champagne',
    heroDot: 'linear-gradient(135deg, #f0dec2 0%, #b5b9bf 100%)',
    dial: 'silver',
    hardware: 'champagne',
    bracelet: 'silver'
  },
  'ink-champagne': {
    id: 'ink-champagne',
    label: 'Ink champagne',
    heroColorName: 'Ink & champagne',
    heroDot: 'linear-gradient(135deg, #e5c699 0%, #1b1c20 100%)',
    dial: 'ink',
    hardware: 'champagne',
    bracelet: 'dark'
  }
};

export class WatchMaterialBank {
  constructor(maxAnisotropy = 8) {
    this.maxAnisotropy = maxAnisotropy;
    const brushed = createBrushedMetalMaps(maxAnisotropy);
    const perlage = createPerlageMaps(maxAnisotropy);
    const bridge = createEngravedBridgeMaps(maxAnisotropy);

    // Pre-generate cached dial & tachymeter textures so switching finishes is instantaneous
    this.dialTextures = {};
    for (const [k, pal] of Object.entries(DIAL_PALETTES)) {
      this.dialTextures[k] = createDialTexture(pal, maxAnisotropy);
    }
    this.tachyTextures = {};
    for (const [k, pal] of Object.entries(HARDWARE_PALETTES)) {
      this.tachyTextures[k] = createTachymeterTexture(pal.bezelColor, pal.bezelText, maxAnisotropy);
    }
    this.claspTextures = {};
    for (const [k, pal] of Object.entries(BRACELET_PALETTES)) {
      this.claspTextures[k] = createClaspTexture(pal.claspBg, pal.claspInk);
    }

    // Core configurable materials
    this.caseBrushed = new THREE.MeshPhysicalMaterial({
      color: 0xd6dae0,
      metalness: 0.96,
      roughness: 0.25,
      normalMap: brushed.normalMap,
      normalScale: new THREE.Vector2(0.18, 0.18),
      roughnessMap: brushed.roughnessMap,
      clearcoat: 0.15,
      clearcoatRoughness: 0.18,
      envMapIntensity: 1.55
    });

    this.casePolished = new THREE.MeshPhysicalMaterial({
      color: 0xe8ecf2,
      metalness: 0.98,
      roughness: 0.07,
      clearcoat: 0.35,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.8
    });

    this.tachymeter = new THREE.MeshPhysicalMaterial({
      map: this.tachyTextures.silver,
      metalness: 0.32,
      roughness: 0.22,
      clearcoat: 0.85,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.4
    });

    this.braceletOuter = new THREE.MeshPhysicalMaterial({
      color: 0xcfd4da,
      metalness: 0.95,
      roughness: 0.28,
      normalMap: brushed.normalMap,
      normalScale: new THREE.Vector2(0.22, 0.22),
      roughnessMap: brushed.roughnessMap,
      envMapIntensity: 1.5
    });

    this.braceletCenter = new THREE.MeshPhysicalMaterial({
      color: 0xe5e9ef,
      metalness: 0.98,
      roughness: 0.09,
      clearcoat: 0.3,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.75
    });

    this.clasp = new THREE.MeshPhysicalMaterial({
      map: this.claspTextures.silver,
      metalness: 0.92,
      roughness: 0.26,
      normalMap: brushed.normalMap,
      normalScale: new THREE.Vector2(0.16, 0.16),
      envMapIntensity: 1.5
    });

    this.dial = new THREE.MeshPhysicalMaterial({
      map: this.dialTextures.ink,
      metalness: 0.45,
      roughness: 0.36,
      clearcoat: 0.12,
      clearcoatRoughness: 0.35,
      envMapIntensity: 1.05
    });

    this.hands = new THREE.MeshPhysicalMaterial({
      color: 0xe4e0d2,
      metalness: 0.98,
      roughness: 0.08,
      clearcoat: 0.4,
      clearcoatRoughness: 0.05,
      envMapIntensity: 2.0
    });

    this.indices = new THREE.MeshPhysicalMaterial({
      color: 0xdfd3b4,
      metalness: 0.96,
      roughness: 0.1,
      clearcoat: 0.35,
      envMapIntensity: 1.9
    });

    this.lume = new THREE.MeshStandardMaterial({
      color: 0xf4f5ed,
      emissive: 0xc7dfd4,
      emissiveIntensity: 0.14,
      roughness: 0.4,
      metalness: 0.0
    });

    // Movement & regulation materials (warm Sedna copper-rose gold mainplate as seen in assembly view)
    this.mainplate = new THREE.MeshStandardMaterial({
      color: 0xc9885b,
      metalness: 0.88,
      roughness: 0.28,
      normalMap: perlage.normalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughnessMap: perlage.roughnessMap,
      envMapIntensity: 1.4
    });

    this.engravedBridge = new THREE.MeshPhysicalMaterial({
      color: 0xd7dce2,
      map: bridge.colorMap,
      normalMap: bridge.normalMap,
      normalScale: new THREE.Vector2(0.5, 0.5),
      metalness: 0.94,
      roughness: 0.22,
      clearcoat: 0.2,
      envMapIntensity: 1.6
    });

    this.brassGear = new THREE.MeshStandardMaterial({
      color: 0xd9a74e,
      metalness: 0.96,
      roughness: 0.18,
      envMapIntensity: 1.75
    });

    this.steelGear = new THREE.MeshStandardMaterial({
      color: 0xd0d5dc,
      metalness: 0.97,
      roughness: 0.14,
      envMapIntensity: 1.7
    });

    this.bluedSteel = new THREE.MeshPhysicalMaterial({
      color: 0x1a4da8,
      metalness: 0.95,
      roughness: 0.12,
      clearcoat: 0.5,
      clearcoatRoughness: 0.08,
      envMapIntensity: 2.0
    });

    this.rubyJewel = new THREE.MeshPhysicalMaterial({
      color: 0xc41446,
      emissive: 0x2a020d,
      emissiveIntensity: 0.25,
      metalness: 0.08,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.8
    });

    this.gasket = new THREE.MeshStandardMaterial({
      color: 0x16171a,
      metalness: 0.1,
      roughness: 0.85
    });

    this.sapphireFront = new THREE.MeshPhysicalMaterial({
      color: 0xeaf3ff,
      metalness: 0.02,
      roughness: 0.04,
      transparent: true,
      opacity: 0.16,
      reflectivity: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      ior: 1.77,
      depthWrite: false,
      envMapIntensity: 2.4
    });

    this.sapphireBack = new THREE.MeshPhysicalMaterial({
      color: 0xedf4ff,
      metalness: 0.02,
      roughness: 0.05,
      transparent: true,
      opacity: 0.22,
      reflectivity: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      ior: 1.77,
      depthWrite: false,
      envMapIntensity: 2.1
    });

    // Ghost material used for Section 02 inactive layers & Section 08 reassembly silhouette
    this.ghost = new THREE.MeshStandardMaterial({
      color: 0xbac0c8,
      metalness: 0.25,
      roughness: 0.35,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      envMapIntensity: 0.8
    });

    this.frostedShell = new THREE.MeshPhysicalMaterial({
      color: 0xc4cad4,
      metalness: 0.18,
      roughness: 0.22,
      transparent: true,
      opacity: 0.2,
      clearcoat: 0.8,
      depthWrite: false,
      envMapIntensity: 1.5
    });

    this.allMaterials = [
      this.caseBrushed,
      this.casePolished,
      this.tachymeter,
      this.braceletOuter,
      this.braceletCenter,
      this.clasp,
      this.dial,
      this.hands,
      this.indices,
      this.lume,
      this.mainplate,
      this.engravedBridge,
      this.brassGear,
      this.steelGear,
      this.bluedSteel,
      this.rubyJewel,
      this.gasket,
      this.sapphireFront,
      this.sapphireBack
    ];

    this.currentConfig = {
      dial: 'ink',
      hardware: 'silver',
      bracelet: 'silver'
    };
  }

  applyFinish({ dial, hardware, bracelet }) {
    if (dial && DIAL_PALETTES[dial]) {
      this.currentConfig.dial = dial;
      this.dial.map = this.dialTextures[dial];
      this.dial.needsUpdate = true;
    }

    if (hardware && HARDWARE_PALETTES[hardware]) {
      this.currentConfig.hardware = hardware;
      const hw = HARDWARE_PALETTES[hardware];
      this.caseBrushed.color.setHex(hw.metalColor);
      this.caseBrushed.roughness = hw.roughness;
      this.casePolished.color.setHex(hw.polishedColor);
      this.casePolished.roughness = hw.polishedRoughness;
      this.hands.color.setHex(hw.handColor);
      this.indices.color.setHex(hw.indexColor);
      this.tachymeter.map = this.tachyTextures[hardware];
      this.tachymeter.needsUpdate = true;
    }

    if (bracelet && BRACELET_PALETTES[bracelet]) {
      this.currentConfig.bracelet = bracelet;
      const br = BRACELET_PALETTES[bracelet];
      this.braceletOuter.color.setHex(br.outerColor);
      this.braceletOuter.roughness = br.roughness;
      this.braceletCenter.color.setHex(br.centerColor);
      this.clasp.map = this.claspTextures[bracelet];
      this.clasp.needsUpdate = true;
    }
  }
}
