/**
 * A terv-dokumentum (schema.js) állapotkezelése – EGY reducer, minden
 * tervmódosítás ezen megy át. Így a dokumentum bármikor kimenthető
 * (megosztás, szerveres mentés, kosár), betölthető (link, fiók), és a
 * "piszkos" állapot is követhető.
 *
 * Rétegek (layer key):
 *   'base'          – az egész rollerre érvényes minta
 *   'zone:<zoneId>' – zónánkénti felülírás (design-keverés). Olvasáskor a
 *                     hiányzó felülírás a base-t adja vissza; íráskor a base
 *                     másolatából jön létre.
 *   'footboard'     – a taposó saját, független rétege
 *
 * A feltöltött kép HELYI előnézete (data-URL-es mintaobjektum) nem része a
 * dokumentumnak – `localImages[layerKey]`-ben él, a szerverre feltöltött kép
 * URL-je pedig a dokumentum `image` mezőjében (schema.js).
 */
import { useCallback, useMemo, useReducer } from 'react';
import { emptyDesign, newLabel, normalizeDesign, DEFAULT_TRANSFORM, MAX_LABELS } from './schema.js';

export const LAYER_BASE = 'base';
export const LAYER_FOOTBOARD = 'footboard';
export const zoneLayerKey = (zoneId) => `zone:${zoneId}`;
export const zoneIdOfLayer = (key) => (key.startsWith('zone:') ? key.slice(5) : null);

/** Réteg olvasása: zónánál a felülírás, vagy ha nincs, a base. */
export function readLayer(doc, key) {
  if (key === LAYER_BASE) return doc.style.base;
  if (key === LAYER_FOOTBOARD) return doc.footboard;
  const z = zoneIdOfLayer(key);
  return (z && doc.style.zones[z]) || doc.style.base;
}

/** Van-e saját felülírása a zónának (a base-től független design)? */
export function hasOwnLayer(doc, key) {
  const z = zoneIdOfLayer(key);
  return z ? Boolean(doc.style.zones[z]) : true;
}

function writeLayer(doc, key, updater) {
  if (key === LAYER_BASE) return { ...doc, style: { ...doc.style, base: updater(doc.style.base) } };
  if (key === LAYER_FOOTBOARD) {
    const { label, ...layer } = doc.footboard;
    return { ...doc, footboard: { ...updater(layer), label } };
  }
  const z = zoneIdOfLayer(key);
  const current = doc.style.zones[z] ?? { ...doc.style.base, transform: { ...doc.style.base.transform } };
  return { ...doc, style: { ...doc.style, zones: { ...doc.style.zones, [z]: updater(current) } } };
}

const touch = (doc) => ({ ...doc, meta: { ...doc.meta, updatedAt: new Date().toISOString() } });

function reducer(state, action) {
  const { doc } = state;
  const next = (d, extra = {}) => ({ ...state, doc: touch(d), dirty: true, ...extra });

  switch (action.type) {
    case 'load':
      return { doc: normalizeDesign(action.doc), localImages: action.localImages ?? {}, uploads: {}, dirty: false };
    case 'reset':
      return { doc: action.doc, localImages: {}, uploads: {}, dirty: false };
    case 'id':
      return { ...state, doc: { ...doc, id: action.id }, dirty: false };
    case 'title':
      return next({ ...doc, title: action.title });
    case 'model':
      return next({ ...doc, model: action.model, year: action.year ?? null });
    case 'year':
      return next({ ...doc, year: action.year });
    case 'view':
      return next({ ...doc, view: action.view });

    case 'layer.pattern': {
      // beépített minta: a feltöltött kép (ha volt) lekerül a rétegről
      const d = writeLayer(doc, action.layer, (l) => ({
        ...l, patternId: action.patternId, image: null, transform: { ...DEFAULT_TRANSFORM },
      }));
      const localImages = { ...state.localImages, [action.layer]: null };
      return next(d, { localImages });
    }
    case 'layer.transform':
      return next(writeLayer(doc, action.layer, (l) => ({ ...l, transform: { ...l.transform, ...action.transform } })));
    case 'layer.focus':
      return next(writeLayer(doc, action.layer, (l) => ({ ...l, focusPieceId: action.pieceId })));
    case 'layer.image': {
      // saját kép: a réteg mintája a feltöltés-azonosító; az előnézet helyben, az URL a szerverről jön később
      const d = writeLayer(doc, action.layer, (l) => ({
        ...l, patternId: action.uploadPatternId, image: action.image ?? null,
        transform: { ...DEFAULT_TRANSFORM }, focusPieceId: action.focusPieceId ?? l.focusPieceId ?? null,
      }));
      return next(d, {
        localImages: { ...state.localImages, [action.layer]: action.preview ?? null },
        uploads: { ...state.uploads, [action.layer]: { uploading: true, error: null } },
      });
    }
    case 'layer.uploaded': {
      const d = writeLayer(doc, action.layer, (l) => ({ ...l, image: action.image }));
      return next(d, { uploads: { ...state.uploads, [action.layer]: { uploading: false, error: null } } });
    }
    case 'layer.uploadFailed':
      return { ...state, uploads: { ...state.uploads, [action.layer]: { uploading: false, error: action.error } } };
    case 'layer.clearImage': {
      const d = writeLayer(doc, action.layer, (l) => ({ ...l, patternId: action.patternId, image: null, transform: { ...DEFAULT_TRANSFORM } }));
      return next(d, {
        localImages: { ...state.localImages, [action.layer]: null },
        uploads: { ...state.uploads, [action.layer]: null },
      });
    }
    case 'zones.clearOverrides': {
      const localImages = { ...state.localImages };
      for (const z of Object.keys(doc.style.zones)) localImages[zoneLayerKey(z)] = null;
      return next({ ...doc, style: { ...doc.style, zones: {} } }, { localImages });
    }
    case 'zones.removeOverride': {
      const zones = { ...doc.style.zones };
      delete zones[action.zoneId];
      return next({ ...doc, style: { ...doc.style, zones } }, {
        localImages: { ...state.localImages, [zoneLayerKey(action.zoneId)]: null },
      });
    }

    case 'labels.add': {
      if (doc.labels.length >= MAX_LABELS) return state;
      return next({ ...doc, labels: [...doc.labels, action.label ?? newLabel()] });
    }
    case 'labels.update':
      return next({ ...doc, labels: doc.labels.map((l) => (l.id === action.id ? { ...l, ...action.patch } : l)) });
    case 'labels.remove':
      return next({ ...doc, labels: doc.labels.filter((l) => l.id !== action.id) });
    case 'labels.set':
      return next({ ...doc, labels: action.labels });

    case 'selection.zones':
      return next({ ...doc, selection: { ...doc.selection, zones: action.zones } });
    case 'selection.toggleZone': {
      const cur = new Set(doc.selection.zones ?? action.availableZoneIds);
      if (cur.has(action.zoneId)) cur.delete(action.zoneId); else cur.add(action.zoneId);
      const all = action.availableZoneIds.every((z) => cur.has(z));
      return next({ ...doc, selection: { ...doc.selection, zones: all ? null : action.availableZoneIds.filter((z) => cur.has(z)) } });
    }
    case 'selection.footboard':
      return next({ ...doc, selection: { ...doc.selection, footboard: Boolean(action.on) } });
    case 'footboard.label':
      return next({ ...doc, footboard: { ...doc.footboard, label: { ...doc.footboard.label, ...action.patch } } });
    case 'installation':
      return next({ ...doc, installation: action.id });
    case 'options':
      return next({ ...doc, options: { ...doc.options, ...action.patch } });
    default:
      return state;
  }
}

/**
 * @param {{model:string, year:number|null, patternId:string}} init
 */
export function useDesign(init) {
  const [state, dispatch] = useReducer(reducer, init, (i) => ({
    doc: emptyDesign(i), localImages: {}, uploads: {}, dirty: false,
  }));

  const actions = useMemo(() => ({
    load: (doc, localImages) => dispatch({ type: 'load', doc, localImages }),
    reset: (doc) => dispatch({ type: 'reset', doc }),
    setId: (id) => dispatch({ type: 'id', id }),
    setTitle: (title) => dispatch({ type: 'title', title }),
    setModel: (model, year) => dispatch({ type: 'model', model, year }),
    setYear: (year) => dispatch({ type: 'year', year }),
    setView: (view) => dispatch({ type: 'view', view }),
    setLayerPattern: (layer, patternId) => dispatch({ type: 'layer.pattern', layer, patternId }),
    setLayerTransform: (layer, transform) => dispatch({ type: 'layer.transform', layer, transform }),
    setLayerFocus: (layer, pieceId) => dispatch({ type: 'layer.focus', layer, pieceId }),
    setLayerImage: (layer, p) => dispatch({ type: 'layer.image', layer, ...p }),
    layerUploaded: (layer, image) => dispatch({ type: 'layer.uploaded', layer, image }),
    layerUploadFailed: (layer, error) => dispatch({ type: 'layer.uploadFailed', layer, error }),
    clearLayerImage: (layer, patternId) => dispatch({ type: 'layer.clearImage', layer, patternId }),
    clearZoneOverrides: () => dispatch({ type: 'zones.clearOverrides' }),
    removeZoneOverride: (zoneId) => dispatch({ type: 'zones.removeOverride', zoneId }),
    addLabel: (label) => dispatch({ type: 'labels.add', label }),
    updateLabel: (id, patch) => dispatch({ type: 'labels.update', id, patch }),
    removeLabel: (id) => dispatch({ type: 'labels.remove', id }),
    setLabels: (labels) => dispatch({ type: 'labels.set', labels }),
    setZones: (zones) => dispatch({ type: 'selection.zones', zones }),
    toggleZone: (zoneId, availableZoneIds) => dispatch({ type: 'selection.toggleZone', zoneId, availableZoneIds }),
    setFootboard: (on) => dispatch({ type: 'selection.footboard', on }),
    setFootboardLabel: (patch) => dispatch({ type: 'footboard.label', patch }),
    setInstallation: (id) => dispatch({ type: 'installation', id }),
    setOptions: (patch) => dispatch({ type: 'options', patch }),
  }), []);

  const layer = useCallback((key) => readLayer(state.doc, key), [state.doc]);

  return { ...state, actions, layer };
}
