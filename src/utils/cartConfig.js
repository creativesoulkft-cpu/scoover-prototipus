/**
 * A konfigurátor belső állapotából felépíti a kosár-hídnak küldött, "world"
 * JSON-csomagot. A mezők nevei és jelentése a híd szerver (server/) oldalán
 * is ugyanezek – lásd server/README.md.
 */
import { calculatePrice } from '../pricing.js';

/**
 * @param {object} p
 * @param {string} p.modelId
 * @param {'solid'|'print'|'custom'} p.tier
 * @param {object|null} p.pattern - az aktív mintaobjektum (getPattern eredménye), custom esetén null/upload
 * @param {{scale:number, rotate:number, dx:number, dy:number}} p.transform
 * @param {Array} p.labels - App.jsx labels state (nyers, minden felirat, be- és kikapcsolt is)
 * @param {boolean} p.includeFootboard - taposófelület extra (a deck-top darab állapota)
 * @param {'none'|'normal'|'complex'} p.installation - felrakás mint szolgáltatás
 * @param {{url:string, width:number, height:number}|null} p.remoteImage - a szerverre már feltöltött CUSTOM kép
 * @returns {object} a kosárnak küldendő konfiguráció, calculatedPrice-szal együtt
 */
export function buildCartConfig({
  modelId, tier, pattern, transform, labels, includeFootboard, installation, remoteImage,
}) {
  const config = { model: modelId, tier };

  if (tier === 'print') {
    config.category = pattern?.category ?? null;
    config.colorway = pattern?.colorway ?? null;
    config.density = pattern?.density ?? null;
  } else if (tier === 'solid') {
    config.colorway = pattern?.colorway ?? null;
  } else if (tier === 'custom') {
    config.uploadedImageUrl = remoteImage?.url ?? null;
    config.imageTransform = { ...transform };
  }

  config.labels = labels
    .filter((l) => l.enabled && l.text.trim().length > 0)
    .map((l) => ({
      text: l.text,
      pieceId: l.pieceId,
      scale: l.scale,
      dx: l.dx,
      dy: l.dy,
      rotate: l.rotate,
      colorMode: l.colorMode,
    }));

  config.includeFootboard = Boolean(includeFootboard);
  config.installation = installation ?? 'none';

  // Kliens oldali becslés – a szerver ezt sosem fogadja el módosítás nélkül,
  // mindig újraszámolja ugyanezzel a modullal (src/pricing.js).
  config.calculatedPrice = calculatePrice(config).total;

  return config;
}
