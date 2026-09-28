/**
 * A terv rétegeiből a VÁSZONNAK szóló "kirajzolandó rétegek" előállítása.
 *
 * A vászon (ScooterCanvas / PhotoCanvas) nem tud a zónákról: egy lista
 * réteget kap ({ key, pattern, transform, patternScale }) és egy leképezést,
 * hogy melyik darab melyik réteget viseli. Itt döntjük el:
 *   - a zóna a base-t vagy a saját felülírását viseli,
 *   - a taposó darab a taposó saját rétegét (ha be van kapcsolva),
 *   - a feltöltött kép melyik előnézeti/szerveres képből jön,
 *   - a "fő darab" eltolása hova viszi a kép közepét.
 *
 * Tiszta függvények, hogy a szerver oldali render (server/print) ugyanezt a
 * logikát tudja használni a dokumentumból – ezért itt nincs React és DOM.
 */
import { getPattern, getCategory, UPLOAD_PATTERN_ID } from '../data/patterns/index.js';
import { zoneOfPiece } from '../data/zones.js';
import { piecesCenter } from '../utils/pathBox.js';
import { LAYER_BASE, LAYER_FOOTBOARD, zoneLayerKey, readLayer, hasOwnLayer } from './useDesign.js';

const DEFAULT_SCALE = { large: 1, medium: 1, small: 1 };

/** Egy réteg mintaobjektuma: beépített minta, vagy a feltöltött kép (helyi előnézet / szerveres URL). */
export function patternForLayer(layer, localImage) {
  if (layer.patternId === UPLOAD_PATTERN_ID) {
    if (localImage) return localImage;
    if (layer.image?.url) {
      return { type: 'image', name: 'Saját kép', category: 'upload', href: layer.image.url,
        width: layer.image.width, height: layer.image.height, luminance: 0.35 };
    }
    return null;
  }
  return getPattern(layer.patternId);
}

/** A réteg szintje: saját kép → custom, egyébként a minta termékvonala. */
export function tierForLayer(layer) {
  if (layer.patternId === UPLOAD_PATTERN_ID) return 'custom';
  return getPattern(layer.patternId)?.line ?? 'solid';
}

/**
 * "Fő darab": a feltöltött kép közepe a kiválasztott darab(csoport) közepére.
 * Rendereléskor adjuk a transzformációhoz, hogy a csúszkák tartománya és az
 * "Alaphelyzet" változatlan maradjon (a finomhangolás a fókuszhoz képest értendő).
 */
export function focusOffset(layer, pieces, viewBox) {
  if (layer.patternId !== UPLOAD_PATTERN_ID || !layer.focusPieceId || !viewBox) return { fx: 0, fy: 0 };
  const target = pieces.find((p) => p.id === layer.focusPieceId);
  if (!target) return { fx: 0, fy: 0 };
  const members = target.priceGroup ? pieces.filter((p) => p.priceGroup === target.priceGroup) : [target];
  const c = piecesCenter(members);
  if (!c) return { fx: 0, fy: 0 };
  const s = layer.transform.scale ?? 1;
  const r = ((layer.transform.rotate ?? 0) * Math.PI) / 180;
  const hx = viewBox.width / 2, hy = viewBox.height / 2;
  const px = s * hx, py = s * hy;
  const rx = hx + (px - hx) * Math.cos(r) - (py - hy) * Math.sin(r);
  const ry = hy + (px - hx) * Math.sin(r) + (py - hy) * Math.cos(r);
  return { fx: Math.round(c.cx - rx), fy: Math.round(c.cy - ry) };
}

/**
 * A kirajzolandó rétegek és a darab → réteg leképezés az aktív nézet
 * darablistájára.
 * @param {object} doc terv-dokumentum
 * @param {Array} pieces az aktív nézet darabjai
 * @param {{width:number,height:number}} viewBox
 * @param {Record<string, object|null>} localImages rétegkulcs → helyi előnézeti kép
 * @param {{ includeFootboard: boolean }} opts
 * @returns {{ layers: Array<{key:string, pattern:object|null, transform:object, patternScale:object, tier:string}>,
 *             layerOfPiece: Record<string,string> }}
 */
export function renderLayers(doc, pieces, viewBox, localImages, { includeFootboard }) {
  const layerOfPiece = {};
  const keys = new Set();
  for (const p of pieces) {
    if (p.footboard) {
      if (includeFootboard) { layerOfPiece[p.id] = LAYER_FOOTBOARD; keys.add(LAYER_FOOTBOARD); }
      continue;
    }
    const zone = zoneOfPiece(p);
    const key = zone && hasOwnLayer(doc, zoneLayerKey(zone.id)) ? zoneLayerKey(zone.id) : LAYER_BASE;
    layerOfPiece[p.id] = key;
    keys.add(key);
  }
  if (!keys.size) keys.add(LAYER_BASE);

  const layers = [...keys].map((key) => {
    const layer = readLayer(doc, key);
    const pattern = patternForLayer(layer, localImages?.[key]);
    const category = getCategory(pattern?.category ?? 'solid');
    const patternScale = pattern?.patternScale ?? category.patternScale ?? DEFAULT_SCALE;
    const { fx, fy } = focusOffset(layer, pieces, viewBox);
    const transform = fx || fy
      ? { ...layer.transform, dx: layer.transform.dx + fx, dy: layer.transform.dy + fy }
      : layer.transform;
    return { key, pattern, transform, patternScale, tier: tierForLayer(layer), category };
  });
  return { layers, layerOfPiece };
}

/** Zóna → szint térkép a kiválasztott zónákra (az árazáshoz). */
export function zoneTiersOf(doc, zoneIds) {
  const out = {};
  for (const z of zoneIds) out[z] = tierForLayer(readLayer(doc, zoneLayerKey(z)));
  return out;
}
