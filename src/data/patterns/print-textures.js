/**
 * Nyomtatott (PRINT) textúrák – a grafikus által készített varratmentes csempék.
 *
 * A képek a public/patterns/ mappában vannak (1024 px WebP + 256 px bélyegkép).
 * Egy minta = egy bejegyzés az alábbi listában; a fájlnév-konvenció:
 *   <kategória>-<színvariáns>-<sűrűség>[-vN].webp
 *
 * Mezők:
 *   luminance  – a kép átlagos világossága 0..1 (build-időben mérve), a felirat
 *                automatikus fehér/fekete színválasztásához
 *   tiling     – 'repeat' (alapértelmezett) vagy 'mirror': tükrözött 2×2 csempézés
 *                olyan képhez, ami nem tökéletesen varratmentes
 *   tile       – a csempe alapmérete a vázlat egységeiben (1 egység ≈ 1,2 mm)
 */
const TEXTURES = [
  { file: 'cyber-cian-ritka', category: 'cyber', colorway: 'cyan', density: 'sparse', luminance: 0.03 },
  { file: 'cyber-cian-suru', category: 'cyber', colorway: 'cyan', density: 'dense', luminance: 0.09 },
  { file: 'cyber-cian-suru-v2', category: 'cyber', colorway: 'cyan', density: 'dense', luminance: 0.1, variant: 'v2' },
  { file: 'cyber-narancs-suru', category: 'cyber', colorway: 'orange', density: 'dense', luminance: 0.09 },
  { file: 'cyber-neon-zold-ritka', category: 'cyber', colorway: 'neon-green', density: 'sparse', luminance: 0.04 },
  { file: 'motocross-magenta-ritka', category: 'motocross', colorway: 'magenta', density: 'sparse', luminance: 0.13 },
  { file: 'motocross-narancs-suru', category: 'motocross', colorway: 'orange', density: 'dense', luminance: 0.22, tiling: 'mirror' },
  { file: 'motocross-neon-zold-ritka', category: 'motocross', colorway: 'neon-green', density: 'sparse', luminance: 0.24 },
  { file: 'motocross-neon-zold-suru', category: 'motocross', colorway: 'neon-green', density: 'dense', luminance: 0.26 },
];

import { COLORWAYS, DENSITIES, getCategory } from './categories.js';

export default TEXTURES.map((t) => ({
  id: t.file,
  type: 'image-tile',
  line: 'print',
  category: t.category,
  colorway: t.colorway,
  density: t.density,
  name: `${getCategory(t.category).name} ${COLORWAYS[t.colorway].name} · ${DENSITIES[t.density].name}${t.variant ? ` (${t.variant})` : ''}`,
  src: `patterns/${t.file}.webp`,
  thumb: `patterns/${t.file}.thumb.webp`,
  tile: t.density === 'dense' ? 240 : 320,
  tiling: t.tiling ?? 'repeat',
  luminance: t.luminance,
}));
