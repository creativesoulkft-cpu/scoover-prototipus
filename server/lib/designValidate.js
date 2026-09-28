/**
 * Terv-dokumentum teljes ellenőrzése a szerveren: szerkezet (schema.js) +
 * hivatkozások a regiszterekre (modell, minták, darabok). A modellek lusta
 * importtal töltődnek (src/data/models/index.js), ezért aszinkron.
 */
import { MODEL_REGISTRY, getModelMeta } from '../../src/data/models/index.js';
import { PATTERNS, UPLOAD_PATTERN_ID } from '../../src/data/patterns/index.js';
import { normalizeDesign, validateDesign, validateDesignReferences } from '../../src/design/schema.js';

const modelCache = new Map();

/** @returns {Promise<object>} a modell-objektum (darabokkal), cache-elve */
export async function loadModel(id) {
  if (modelCache.has(id)) return modelCache.get(id);
  const meta = getModelMeta(id);
  if (!meta) throw new Error(`Ismeretlen rollermodell: "${id}".`);
  const mod = await meta.load();
  modelCache.set(id, mod.default);
  return mod.default;
}

/**
 * @param {object} raw a kliens által küldött dokumentum
 * @returns {Promise<{doc:object|null, errors:string[], model:object|null}>}
 */
export async function validateDesignDocument(raw) {
  let doc;
  try {
    doc = normalizeDesign(raw);
  } catch {
    return { doc: null, errors: ['A terv-dokumentum nem olvasható.'], model: null };
  }
  const errors = validateDesign(doc);
  if (errors.length) return { doc: null, errors, model: null };

  const modelIds = MODEL_REGISTRY.map((m) => m.id);
  let model = null;
  let pieceIds;
  if (modelIds.includes(doc.model)) {
    model = await loadModel(doc.model);
    pieceIds = [...new Set([...(model.pieces ?? []), ...(model.photoView?.pieces ?? [])].map((p) => p.id))];
    if (doc.year != null) {
      const years = getModelMeta(doc.model)?.years ?? [];
      if (years.length && !years.includes(doc.year)) errors.push(`Ehhez a modellhez nincs ${doc.year}-es évjárat.`);
    }
  }
  errors.push(...validateDesignReferences(doc, {
    modelIds, patternIds: PATTERNS.map((p) => p.id), uploadPatternId: UPLOAD_PATTERN_ID, pieceIds,
  }));
  return { doc: errors.length ? null : doc, errors, model };
}
