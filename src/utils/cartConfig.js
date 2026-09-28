/**
 * A terv-dokumentumból (src/design/schema.js) felépíti a kosár-hídnak küldött
 * JSON-csomagot. A mezők nevei és jelentése a híd szerver (server/) oldalán
 * is ugyanezek – lásd server/README.md.
 *
 * A csomag TARTALMAZZA a teljes terv-dokumentumot is (`design`): a rendelés
 * így hordozza a receptet, amiből a nyomdai fájl szerver oldalon,
 * determinisztikusan újragyártható (server/print). A lapos mezők (tier,
 * category, zones, …) a WooCommerce-ben olvasható meta-adatnak és az
 * árazásnak/ellenőrzésnek valók.
 */
import { calculatePrice, highestTier } from '../pricing.js';
import { UPLOAD_PATTERN_ID, getPattern } from '../data/patterns/index.js';
import { readLayer, zoneLayerKey, LAYER_BASE } from '../design/useDesign.js';
import { tierForLayer } from '../design/layers.js';

function serializeLabel(l) {
  return {
    text: l.text,
    pieceId: l.pieceId ?? null,
    scale: l.scale,
    dx: l.dx,
    dy: l.dy,
    rotate: l.rotate,
    fontId: l.fontId ?? 'auto',
    colorMode: l.colorMode,
    customColor: l.colorMode === 'custom' ? (l.customColor ?? null) : null,
  };
}

/** Egy réteg lapos, WooCommerce-ben is olvasható leírása. */
function describeLayer(layer) {
  const tier = tierForLayer(layer);
  const pattern = layer.patternId === UPLOAD_PATTERN_ID ? null : getPattern(layer.patternId);
  return {
    tier,
    patternId: layer.patternId,
    patternName: pattern?.name ?? (tier === 'custom' ? 'Saját kép' : null),
    category: pattern?.category ?? null,
    colorway: pattern?.colorway ?? null,
    density: pattern?.density ?? null,
    uploadedImageUrl: layer.image?.url ?? null,
    imageTransform: { ...layer.transform },
  };
}

/**
 * @param {object} p
 * @param {object} p.doc a terv-dokumentum
 * @param {string[]} p.availableZoneIds az ezen a modellen létező zónák
 * @returns {object} a kosárnak küldendő konfiguráció, calculatedPrice-szal együtt
 */
export function buildCartConfig({ doc, availableZoneIds }) {
  const selectedZoneIds = doc.selection.zones ?? availableZoneIds;
  const zoneEntries = selectedZoneIds.map((id) => ({ id, ...describeLayer(readLayer(doc, zoneLayerKey(id))) }));
  const zoneTiers = Object.fromEntries(zoneEntries.map((z) => [z.id, z.tier]));
  const base = describeLayer(readLayer(doc, LAYER_BASE));
  const tier = highestTier(zoneEntries.length ? zoneEntries.map((z) => z.tier) : [base.tier]);

  const config = {
    model: doc.model,
    year: doc.year ?? null,
    tier,
    designId: doc.id ?? null,
    selectedZoneIds,
    availableZoneIds,
    zoneTiers,
    zones: zoneEntries,
    // a lapos "fő" mezők a legmagasabb szintű zóna szerint (visszafelé kompatibilis olvasáshoz)
    ...flatFields(zoneEntries.find((z) => z.tier === tier) ?? base),
    labels: doc.labels.filter((l) => l.enabled && l.text.trim().length > 0).map(serializeLabel),
    includeFootboard: Boolean(doc.selection.footboard),
    installation: doc.installation ?? 'none',
  };

  if (config.includeFootboard) {
    const fb = doc.footboard;
    const fbLabel = fb.label;
    config.footboard = {
      ...describeLayer(fb),
      label: fbLabel?.enabled && fbLabel.text.trim().length > 0 ? serializeLabel(fbLabel) : null,
    };
  }

  // A teljes recept – ebből készül a nyomdai fájl.
  config.design = doc;

  // Kliens oldali becslés – a szerver ezt sosem fogadja el módosítás nélkül,
  // mindig újraszámolja ugyanezzel a modullal (src/pricing.js).
  config.calculatedPrice = calculatePrice(config).total;
  return config;
}

function flatFields(entry) {
  const out = {};
  if (entry.tier === 'print') {
    out.category = entry.category; out.colorway = entry.colorway; out.density = entry.density;
  } else if (entry.tier === 'solid') {
    out.colorway = entry.colorway;
  } else if (entry.tier === 'custom') {
    out.uploadedImageUrl = entry.uploadedImageUrl;
    out.imageTransform = entry.imageTransform;
  }
  return out;
}
