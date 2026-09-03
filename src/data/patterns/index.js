/**
 * Mintaregiszter.
 *
 * Minden minta egy adatbejegyzés; a renderelés kliens oldalon történik
 * (SVG <pattern> / gradiens / egyszínű fill), ezért egy új minta felvétele
 * NEM igényel darabonkénti képfájlokat.
 *
 * Közös mezők:  id, name, type, line ('solid' | 'print'), category, luminance
 * Opcionális:   colorway, density ('sparse' | 'dense'), patternScale, keywords
 *
 * Típusok (PatternDefs rendereli):
 *   - solid       { color }
 *   - gradient    { angle, stops }
 *   - tile        { tile: { width, height, markup } }   procedurális SVG csempe
 *   - image-tile  { src, thumb, tile, tiling }           raszteres, ismétlődő textúra
 *   - image       { href, width, height }                feltöltött kép (futásidőben)
 *
 * ÚJ NYOMTATOTT MINTA: kép a public/patterns/ mappába + egy sor a
 * print-textures.js listájába. Új kategória: categories.js.
 */
import matteBlack from './solid-matte-black.js';
import signalOrange from './solid-signal-orange.js';
import arcticWhite from './solid-arctic-white.js';
import sunset from './gradient-sunset.js';
import carbon3d from './carbon-3d.js';
import hexTech from './hex-tech.js';
import printTextures from './print-textures.js';
import gripTextures from './grip-textures.js';

export { PRODUCT_LINES, PATTERN_CATEGORIES, COLORWAYS, DENSITIES, getCategory } from './categories.js';

export const PATTERNS = [
  matteBlack,
  signalOrange,
  arcticWhite,
  ...printTextures,
  carbon3d,
  hexTech,
  sunset,
  ...gripTextures,
];

export const DEFAULT_PATTERN_ID = 'cyber-cian-ritka';

/** A taposófelület (GRIP vonal) alapértelmezett mintája, ha bekapcsolják a prémium csúszásgátló extrát. */
export const DEFAULT_STANDING_SURFACE_PATTERN_ID = gripTextures[0].id;

/** A feltöltött kép mintája ezt az id-t kapja; nem szerepel a statikus listában. */
export const UPLOAD_PATTERN_ID = 'user-upload';

export function getPattern(id) {
  return PATTERNS.find((p) => p.id === id) ?? null;
}
