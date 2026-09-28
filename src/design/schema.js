/**
 * TERV-DOKUMENTUM (design document) – a konfigurátor EGYETLEN igazságforrása.
 *
 * Ez a JSON írja le, mit tervezett a vevő. Ugyanez a dokumentum:
 *   - él a konfigurátor állapotában (src/design/useDesign.js),
 *   - megy a megosztható linkbe (src/design/share.js, tömörítve a #d=… részben),
 *   - kerül a szerverre mentéskor (server/routes/designs.js → SQLite, SCV-… id),
 *   - ebből épül a kosár-konfiguráció (src/utils/cartConfig.js),
 *   - és EBBŐL rendereli a szerver a nyomdai fájlt (server/print/) –
 *     a kliens sosem gyárt gyártási fájlt, csak receptet.
 *
 * SÉMA v1 (schemaVersion: 1)
 *
 *   {
 *     schemaVersion: 1,
 *     id: 'SCV-7F3K2Q' | null,        // szerver által kiadott azonosító (mentés után)
 *     title: string | null,
 *     model: 'kukirin-g2', year: 2025 | null,
 *     view: 'photo' | 'schematic',
 *     style: {
 *       base:  Layer,                    // az egész rollerre érvényes minta
 *       zones: { [zoneId]: Layer },      // zónánkénti felülírás (design-keverés); hiányzó zóna → base
 *     },
 *     labels: Label[],
 *     selection: { zones: string[] | null, footboard: boolean },   // null = minden zóna (teljes szett)
 *     footboard: { ...Layer, label: FootboardLabel | null },
 *     installation: 'none' | 'normal' | 'complex',
 *     options: { sizeAwareTiling: boolean, showCutLines: boolean },
 *     meta: { createdAt, updatedAt, app, appVersion }
 *   }
 *
 *   Layer = { patternId: string, transform: {scale, rotate, dx, dy},
 *             image: { url, width, height } | null,   // feltöltött kép (szerver oldali URL!)
 *             focusPieceId: string | null }            // saját képnél: hova essen a kép lényege
 *   Label = { id, enabled, text, pieceId, scale, dx, dy, rotate, fontId, colorMode, customColor }
 *
 * A feltöltött kép HELYI előnézete (data-URL) SOSEM része a dokumentumnak –
 * az csak a böngészőben él (useDesign.js `localImages`). A dokumentumban a
 * szerverre feltöltött kép URL-je áll, ezért egy saját képes terv csak akkor
 * osztható meg / menthető, ha a kép már feltöltődött.
 *
 * VERZIÓZÁS: minden, a szerkezetet érintő változás új schemaVersion-t kap, és
 * a `migrate()` függvénybe kerül egy lépés a régiről az újra. Így egy két éve
 * mentett terv is megnyitható és újragyártható marad.
 *
 * Ez a modul TISZTA adat + ellenőrzés: a kliens ÉS a szerver ugyanezt
 * importálja (mint a src/pricing.js-t), ezért itt nincs React és nincs DOM.
 */
import { ZONE_IDS } from '../data/zones.js';
import { INSTALLATION_IDS } from '../pricing.js';

export const SCHEMA_VERSION = 1;
export const APP_NAME = 'scoover-configurator';

/** Terv-azonosító: SCV- + 6 karakter egyértelmű ábécéből (nincs 0/O, 1/I/L). */
export const DESIGN_ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const DESIGN_ID_RE = /^SCV-[A-HJ-NP-Z2-9]{6}$/;

export const DEFAULT_TRANSFORM = Object.freeze({ scale: 1, rotate: 0, dx: 0, dy: 0 });
export const VIEWS = ['photo', 'schematic'];
export const COLOR_MODES = ['auto', 'white', 'black', 'custom'];

export const MAX_LABELS = 6;
export const MAX_LABEL_LENGTH = 24;
export const MAX_TITLE_LENGTH = 60;

/** Egy réteg (base / zóna / taposó) minta-beállításai. */
export function emptyLayer(patternId) {
  return { patternId, transform: { ...DEFAULT_TRANSFORM }, image: null, focusPieceId: null };
}

export function newLabelId() {
  return `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Egy új felirat alapértelmezései – a pieceId a modell betöltése után töltődik ki. */
export function newLabel(text = 'SCOOVER', pieceId = null) {
  return {
    id: newLabelId(), enabled: true, text, pieceId, scale: 1, dx: 0, dy: 0, rotate: 0,
    fontId: 'auto', colorMode: 'auto', customColor: '#ff6a1a',
  };
}

/** A taposó egyetlen felirata – nincs pieceId-je, mindig a taposóra kerül. */
export function newFootboardLabel() {
  return {
    enabled: false, text: 'SCOOVER', scale: 1, dx: 0, dy: 0, rotate: 0,
    fontId: 'auto', colorMode: 'auto', customColor: '#ff6a1a',
  };
}

/**
 * Üres (alapértelmezett) terv egy modellre.
 * @param {{model:string, year?:number|null, patternId:string, footboardPatternId?:string}} p
 */
export function emptyDesign({ model, year = null, patternId, footboardPatternId = patternId }) {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: null,
    title: null,
    model,
    year,
    view: 'photo',
    style: { base: emptyLayer(patternId), zones: {} },
    labels: [newLabel()],
    selection: { zones: null, footboard: false },
    footboard: { ...emptyLayer(footboardPatternId), label: newFootboardLabel() },
    installation: 'none',
    options: { sizeAwareTiling: true, showCutLines: true },
    meta: { createdAt: now, updatedAt: now, app: APP_NAME, appVersion: 1 },
  };
}

// ---------------------------------------------------------------------------
// Ellenőrzés
// ---------------------------------------------------------------------------

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isStr = (v) => typeof v === 'string';

function validateTransform(t, path, errors) {
  if (!isObj(t)) { errors.push(`${path}: hiányzó transzformáció.`); return; }
  for (const k of ['scale', 'rotate', 'dx', 'dy']) {
    if (!isNum(t[k])) errors.push(`${path}.${k}: szám kell.`);
  }
  if (isNum(t.scale) && (t.scale <= 0 || t.scale > 20)) errors.push(`${path}.scale: 0 és 20 közé kell essen.`);
}

function validateImage(img, path, errors) {
  if (img === null || img === undefined) return;
  if (!isObj(img)) { errors.push(`${path}: hibás képhivatkozás.`); return; }
  if (!isStr(img.url) || !img.url) errors.push(`${path}.url: hiányzik a feltöltött kép URL-je.`);
  if (!isNum(img.width) || !isNum(img.height)) errors.push(`${path}: hiányzik a kép pixelmérete.`);
}

function validateLayer(layer, path, errors) {
  if (!isObj(layer)) { errors.push(`${path}: hiányzó réteg.`); return; }
  if (!isStr(layer.patternId) || !layer.patternId) errors.push(`${path}.patternId: hiányzik.`);
  validateTransform(layer.transform, `${path}.transform`, errors);
  validateImage(layer.image, `${path}.image`, errors);
  if (layer.focusPieceId != null && !isStr(layer.focusPieceId)) errors.push(`${path}.focusPieceId: szöveg kell.`);
}

function validateLabel(l, path, errors, { requirePiece }) {
  if (!isObj(l)) { errors.push(`${path}: hibás felirat.`); return; }
  if (!isStr(l.text) || l.text.length > MAX_LABEL_LENGTH) errors.push(`${path}.text: legfeljebb ${MAX_LABEL_LENGTH} karakter.`);
  if (typeof l.enabled !== 'boolean') errors.push(`${path}.enabled: igaz/hamis kell.`);
  if (requirePiece && l.pieceId != null && !isStr(l.pieceId)) errors.push(`${path}.pieceId: szöveg kell.`);
  for (const k of ['scale', 'dx', 'dy', 'rotate']) if (!isNum(l[k])) errors.push(`${path}.${k}: szám kell.`);
  if (l.fontId != null && !isStr(l.fontId)) errors.push(`${path}.fontId: szöveg kell.`);
  if (l.colorMode != null && !COLOR_MODES.includes(l.colorMode)) errors.push(`${path}.colorMode: ismeretlen (${COLOR_MODES.join(' | ')}).`);
  if (l.customColor != null && !/^#[0-9a-f]{6}$/i.test(l.customColor)) errors.push(`${path}.customColor: #rrggbb formátum kell.`);
}

/**
 * Szerkezeti ellenőrzés. A modell/minta LÉTEZÉSÉT nem itt, hanem a hívó
 * ellenőrzi a regiszterekkel (`validateDesignReferences`), mert a regiszterek
 * betöltése aszinkron lehet.
 * @returns {string[]} hibaüzenetek (üres = rendben)
 */
export function validateDesign(doc) {
  const errors = [];
  if (!isObj(doc)) return ['Hiányzó vagy hibás terv-dokumentum.'];
  if (doc.schemaVersion !== SCHEMA_VERSION) errors.push(`Ismeretlen sémaverzió: ${doc.schemaVersion} (várt: ${SCHEMA_VERSION}).`);
  if (doc.id != null && !DESIGN_ID_RE.test(doc.id)) errors.push('Hibás terv-azonosító.');
  if (doc.title != null && (!isStr(doc.title) || doc.title.length > MAX_TITLE_LENGTH)) errors.push(`title: legfeljebb ${MAX_TITLE_LENGTH} karakter.`);
  if (!isStr(doc.model) || !doc.model) errors.push('model: hiányzik.');
  if (doc.year != null && !(Number.isInteger(doc.year) && doc.year >= 2015 && doc.year <= 2100)) errors.push('year: hibás évjárat.');
  if (!VIEWS.includes(doc.view)) errors.push('view: photo | schematic.');

  if (!isObj(doc.style)) errors.push('style: hiányzik.');
  else {
    validateLayer(doc.style.base, 'style.base', errors);
    if (!isObj(doc.style.zones)) errors.push('style.zones: objektum kell.');
    else {
      for (const [zoneId, layer] of Object.entries(doc.style.zones)) {
        if (!ZONE_IDS.includes(zoneId)) errors.push(`style.zones.${zoneId}: ismeretlen zóna.`);
        validateLayer(layer, `style.zones.${zoneId}`, errors);
      }
    }
  }

  if (!Array.isArray(doc.labels)) errors.push('labels: tömb kell.');
  else {
    if (doc.labels.length > MAX_LABELS) errors.push(`labels: legfeljebb ${MAX_LABELS} felirat.`);
    doc.labels.forEach((l, i) => validateLabel(l, `labels[${i}]`, errors, { requirePiece: true }));
  }

  if (!isObj(doc.selection)) errors.push('selection: hiányzik.');
  else {
    if (doc.selection.zones !== null && !Array.isArray(doc.selection.zones)) errors.push('selection.zones: tömb vagy null.');
    if (Array.isArray(doc.selection.zones)) {
      const unknown = doc.selection.zones.filter((z) => !ZONE_IDS.includes(z));
      if (unknown.length) errors.push(`selection.zones: ismeretlen zóna: ${unknown.join(', ')}.`);
    }
    if (typeof doc.selection.footboard !== 'boolean') errors.push('selection.footboard: igaz/hamis kell.');
  }

  if (!isObj(doc.footboard)) errors.push('footboard: hiányzik.');
  else {
    validateLayer(doc.footboard, 'footboard', errors);
    if (doc.footboard.label != null) validateLabel(doc.footboard.label, 'footboard.label', errors, { requirePiece: false });
  }

  if (!INSTALLATION_IDS.includes(doc.installation)) errors.push('installation: none | normal | complex.');
  if (!isObj(doc.options)) errors.push('options: hiányzik.');
  return errors;
}

/**
 * Hivatkozás-ellenőrzés a regiszterek ismeretében: létezik-e a modell, a
 * minták, a darabok. A kliens a betöltött modellel, a szerver a regiszterből
 * betöltött modellel hívja.
 * @param {object} doc
 * @param {{ modelIds: string[], patternIds: string[], uploadPatternId: string, pieceIds?: string[] }} refs
 */
export function validateDesignReferences(doc, refs) {
  const errors = [];
  if (!refs.modelIds.includes(doc.model)) errors.push(`Ismeretlen rollermodell: "${doc.model}".`);
  const checkLayer = (layer, path) => {
    if (layer.patternId === refs.uploadPatternId) {
      if (!layer.image?.url) errors.push(`${path}: saját képes réteg feltöltött kép nélkül.`);
    } else if (!refs.patternIds.includes(layer.patternId)) {
      errors.push(`${path}: ismeretlen minta "${layer.patternId}".`);
    }
  };
  checkLayer(doc.style.base, 'style.base');
  for (const [z, layer] of Object.entries(doc.style.zones)) checkLayer(layer, `style.zones.${z}`);
  checkLayer(doc.footboard, 'footboard');
  if (refs.pieceIds) {
    doc.labels.forEach((l, i) => {
      if (l.pieceId && !refs.pieceIds.includes(l.pieceId)) errors.push(`labels[${i}]: ismeretlen darab "${l.pieceId}".`);
    });
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Migráció + normalizálás
// ---------------------------------------------------------------------------

/**
 * Régebbi sémaverziójú dokumentum átalakítása a jelenlegire. Minden új
 * verziónál IDE kerül egy lépés (v1 → v2 stb.), a régi lépések megmaradnak,
 * így bármilyen régi terv láncolva a legfrissebbre hozható.
 */
export function migrate(doc) {
  if (!isObj(doc)) return doc;
  const out = { ...doc };
  if (out.schemaVersion == null) out.schemaVersion = 1; // a legelső, verziószám nélküli forma = v1
  // v1 → v2: (még nincs)
  return out;
}

/**
 * Hiányzó opcionális mezők pótlása, számok kerekítése, sorrend rögzítése –
 * hogy a mentett/megosztott dokumentum determinisztikus legyen (két azonos
 * terv azonos JSON-t ad, ami a nyomdai reprodukálhatóság alapja).
 */
export function normalizeDesign(doc) {
  const d = migrate(doc);
  const r1 = (n) => Math.round(n * 1000) / 1000;
  const tf = (t) => ({ scale: r1(t?.scale ?? 1), rotate: r1(t?.rotate ?? 0), dx: r1(t?.dx ?? 0), dy: r1(t?.dy ?? 0) });
  const img = (i) => (i && i.url ? { url: i.url, width: Math.round(i.width), height: Math.round(i.height) } : null);
  const layer = (l) => ({
    patternId: l?.patternId ?? '',
    transform: tf(l?.transform),
    image: img(l?.image),
    focusPieceId: l?.focusPieceId ?? null,
  });
  const label = (l) => ({
    id: l.id ?? newLabelId(), enabled: Boolean(l.enabled), text: String(l.text ?? '').slice(0, MAX_LABEL_LENGTH),
    pieceId: l.pieceId ?? null, scale: r1(l.scale ?? 1), dx: r1(l.dx ?? 0), dy: r1(l.dy ?? 0), rotate: r1(l.rotate ?? 0),
    fontId: l.fontId ?? 'auto', colorMode: l.colorMode ?? 'auto', customColor: l.customColor ?? '#ff6a1a',
  });
  const fbLabel = d.footboard?.label ? { ...label({ id: 'fb', ...d.footboard.label }), id: undefined, pieceId: undefined } : null;
  if (fbLabel) { delete fbLabel.id; delete fbLabel.pieceId; }

  return {
    schemaVersion: SCHEMA_VERSION,
    id: d.id ?? null,
    title: d.title ? String(d.title).slice(0, MAX_TITLE_LENGTH) : null,
    model: d.model,
    year: d.year ?? null,
    view: VIEWS.includes(d.view) ? d.view : 'photo',
    style: {
      base: layer(d.style?.base),
      zones: Object.fromEntries(
        Object.entries(d.style?.zones ?? {}).filter(([z]) => ZONE_IDS.includes(z)).map(([z, l]) => [z, layer(l)]),
      ),
    },
    labels: (Array.isArray(d.labels) ? d.labels : []).slice(0, MAX_LABELS).map(label),
    selection: {
      zones: Array.isArray(d.selection?.zones) ? d.selection.zones.filter((z) => ZONE_IDS.includes(z)) : null,
      footboard: Boolean(d.selection?.footboard),
    },
    footboard: { ...layer(d.footboard), label: fbLabel },
    installation: INSTALLATION_IDS.includes(d.installation) ? d.installation : 'none',
    options: {
      sizeAwareTiling: d.options?.sizeAwareTiling !== false,
      showCutLines: d.options?.showCutLines !== false,
    },
    meta: {
      createdAt: d.meta?.createdAt ?? new Date().toISOString(),
      updatedAt: d.meta?.updatedAt ?? new Date().toISOString(),
      app: APP_NAME,
      appVersion: d.meta?.appVersion ?? 1,
    },
  };
}

/** Van-e olyan réteg a tervben, amely feltöltött képet használ, de az még nincs a szerveren? */
export function hasUnuploadedImage(doc, uploadPatternId) {
  const layers = [doc.style.base, ...Object.values(doc.style.zones), doc.footboard];
  return layers.some((l) => l.patternId === uploadPatternId && !l.image?.url);
}

/** A tervben ténylegesen használt (zónánkénti) rétegek – zónaId → Layer, a hiányzókra a base. */
export function layerForZone(doc, zoneId) {
  return doc.style.zones[zoneId] ?? doc.style.base;
}

/** Zónánként eltérő design van-e a tervben ("kevert" terv)? */
export function isMixedDesign(doc) {
  return Object.keys(doc.style.zones).length > 0;
}
