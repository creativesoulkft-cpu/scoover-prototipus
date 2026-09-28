/**
 * Terv-mentés és -betöltés a híd szerveren (server/routes/designs.js).
 *
 * Mentéskor a szerver ad egy stabil SCV-… azonosítót; a linkben ez megy
 * (#id=SCV-…). A szerkesztéshez szükséges kulcsot (editKey) a böngésző
 * tárolja (localStorage), hogy a vevő a saját tervét fiók nélkül is
 * frissíthesse – fiókkal a tulajdonos kulcs nélkül is módosíthat.
 */
import { bridgeFetch, BridgeError } from './cartBridge.js';

const EDIT_KEYS = 'scoover-design-edit-keys';

function readEditKeys() {
  try { return JSON.parse(localStorage.getItem(EDIT_KEYS) ?? '{}'); } catch { return {}; }
}
export function editKeyFor(id) { return readEditKeys()[id] ?? null; }
function rememberEditKey(id, key) {
  try {
    const all = readEditKeys(); all[id] = key;
    localStorage.setItem(EDIT_KEYS, JSON.stringify(all));
  } catch { /* privát mód – nem baj */ }
}

/** @returns {Promise<{id:string, url:string, editKey:string|null}>} */
export async function saveDesign(doc, { title } = {}) {
  const data = await bridgeFetch('/api/designs', { method: 'POST', body: { design: doc, title } });
  if (data.editKey) rememberEditKey(data.id, data.editKey);
  return data;
}

export async function updateDesign(id, doc, { title } = {}) {
  return bridgeFetch(`/api/designs/${encodeURIComponent(id)}`, {
    method: 'PUT', body: { design: doc, title, editKey: editKeyFor(id) },
  });
}

/** @returns {Promise<{id:string, design:object, title:string|null, createdAt:string, updatedAt:string}>} */
export async function loadDesign(id) {
  return bridgeFetch(`/api/designs/${encodeURIComponent(id)}`);
}

/** Előnézeti kép (PNG) feltöltése a mentett tervhez – bélyegképnek (fiók, munkalap). */
export async function uploadDesignPreview(id, blob) {
  const form = new FormData();
  form.append('preview', blob, 'preview.png');
  form.append('editKey', editKeyFor(id) ?? '');
  return bridgeFetch(`/api/designs/${encodeURIComponent(id)}/preview`, { method: 'POST', form });
}

export { BridgeError };
