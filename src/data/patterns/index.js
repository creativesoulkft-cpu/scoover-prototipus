/**
 * Mintaregiszter.
 *
 * Minden minta egy önálló adatfájl ebben a mappában. A minták kliens oldalon
 * renderelődnek (SVG <pattern> / gradiens / egyszínű fill), ezért egy új minta
 * felvétele NEM igényel darabonkénti képfájlokat – egyetlen adatbejegyzés.
 *
 * Támogatott típusok (a PatternDefs komponens rendereli őket):
 *   - solid    { color }
 *   - gradient { angle, stops: [{offset, color}] }
 *   - tile     { tile: { width, height, markup } }  – procedurális SVG csempe
 *   - image    { href, width, height }               – feltöltött kép (futásidőben)
 *
 * ÚJ MINTA HOZZÁADÁSA: új fájl + import + bejegyzés a PATTERNS tömbbe.
 */
import matteBlack from './solid-matte-black.js';
import signalOrange from './solid-signal-orange.js';
import arcticWhite from './solid-arctic-white.js';
import sunset from './gradient-sunset.js';
import carbon3d from './carbon-3d.js';
import hexTech from './hex-tech.js';
import urbanCamo from './urban-camo.js';
import topoLines from './topo-lines.js';

export const PATTERNS = [
  matteBlack,
  signalOrange,
  arcticWhite,
  sunset,
  carbon3d,
  hexTech,
  urbanCamo,
  topoLines,
];

/** Kategóriák a galéria csoportosításához (sorrend = megjelenítési sorrend). */
export const PATTERN_CATEGORIES = [
  { id: 'solid', name: 'Egyszínű' },
  { id: 'gradient', name: 'Színátmenet' },
  { id: 'tech', name: 'Tech / geometrikus' },
  { id: 'organic', name: 'Szerves' },
];

export const DEFAULT_PATTERN_ID = carbon3d.id;

/** A feltöltött kép mintája ezt az id-t kapja; nem szerepel a statikus listában. */
export const UPLOAD_PATTERN_ID = 'user-upload';

export function getPattern(id) {
  return PATTERNS.find((p) => p.id === id) ?? null;
}
