/**
 * Megosztható link – a terv-dokumentum az URL-ben.
 *
 * Két forma:
 *   #id=SCV-7F3K2Q   – szerveren mentett terv (rövid, stabil; a híd szerver adja vissza)
 *   #d=<tömörített>  – a TELJES dokumentum az URL-ben (lz-string, URL-biztos
 *                      ábécével). Szerver nélkül is működik – ezért a demó
 *                      (GitHub Pages) is tud linket adni –, de hosszú (~1–2 kB).
 *
 * Betöltéskor mindkettőt értjük. A dokumentum a linkből SOSEM tartalmaz
 * helyi (data-URL) képet – csak szerverre feltöltött kép URL-jét (lásd schema.js).
 */
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { normalizeDesign, validateDesign, DESIGN_ID_RE } from './schema.js';

const KEY_DOC = 'd';
const KEY_ID = 'id';

/** A dokumentum tömörített, URL-be tehető alakja. */
export function encodeDesign(doc) {
  const clean = normalizeDesign({ ...doc, id: null, meta: undefined });
  return compressToEncodedURIComponent(JSON.stringify(clean));
}

/** @returns {object|null} a dokumentum, vagy null, ha nem olvasható */
export function decodeDesign(encoded) {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const doc = normalizeDesign(JSON.parse(json));
    return validateDesign(doc).length ? null : doc;
  } catch {
    return null;
  }
}

/** Az URL hash-részének értelmezése: { id } | { doc } | null. */
export function parseLocationHash(hash = typeof location !== 'undefined' ? location.hash : '') {
  const h = (hash ?? '').replace(/^#/, '');
  if (!h) return null;
  const params = new URLSearchParams(h);
  const id = params.get(KEY_ID);
  if (id && DESIGN_ID_RE.test(id)) return { id };
  const d = params.get(KEY_DOC);
  if (d) {
    const doc = decodeDesign(d);
    return doc ? { doc } : { error: 'A link nem olvasható vagy régebbi verziójú.' };
  }
  return null;
}

/** Link egy mentett tervhez (id) vagy a dokumentumhoz (tömörítve). */
export function buildShareUrl({ id, doc }, base = typeof location !== 'undefined' ? `${location.origin}${location.pathname}` : '') {
  if (id) return `${base}#${KEY_ID}=${encodeURIComponent(id)}`;
  return `${base}#${KEY_DOC}=${encodeDesign(doc)}`;
}

/** Az aktuális címsor hash-ének frissítése (újratöltés nélkül, history-bejegyzés nélkül). */
export function replaceLocationHash(hash) {
  if (typeof history === 'undefined') return;
  const url = `${location.pathname}${location.search}${hash ? `#${hash}` : ''}`;
  history.replaceState(null, '', url);
}

export function hashForShare({ id, doc }) {
  return id ? `${KEY_ID}=${encodeURIComponent(id)}` : `${KEY_DOC}=${encodeDesign(doc)}`;
}
