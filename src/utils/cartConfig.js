/**
 * A konfigurátor belső állapotából felépíti a kosár-hídnak küldött, "world"
 * JSON-csomagot. A mezők nevei és jelentése a híd szerver (server/) oldalán
 * is ugyanezek – lásd server/README.md.
 */
import { calculatePrice } from '../pricing.js';

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
 * @param {string[]} [p.selectedGroupIds] - bekapcsolt darabár-csoportok; hiányzó/teljes esetén a teljes kit ára számít
 * @param {{pattern:object|null, uploadedImageUrl:string|null, transform:object, label:object}} [p.footboardDesign] -
 *   a taposófelület SAJÁT (a roller mintájától független) minta/kép/transzformáció/felirat állapota – lásd FootboardEditor.jsx
 * @returns {object} a kosárnak küldendő konfiguráció, calculatedPrice-szal együtt
 */
export function buildCartConfig({
  modelId, tier, pattern, transform, labels, includeFootboard, installation, remoteImage, selectedGroupIds,
  footboardDesign,
}) {
  const config = { model: modelId, tier };
  if (selectedGroupIds) config.selectedGroupIds = selectedGroupIds;

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
    .map(serializeLabel);

  config.includeFootboard = Boolean(includeFootboard);
  config.installation = installation ?? 'none';

  // A taposó saját, a roller fő mintájától teljesen független dizájnja –
  // csak akkor küldjük, ha az extra ténylegesen be van kapcsolva.
  if (config.includeFootboard && footboardDesign) {
    const fbLabel = footboardDesign.label;
    config.footboard = {
      category: footboardDesign.pattern?.category ?? null,
      colorway: footboardDesign.pattern?.colorway ?? null,
      density: footboardDesign.pattern?.density ?? null,
      uploadedImageUrl: footboardDesign.uploadedImageUrl ?? null,
      imageTransform: { ...footboardDesign.transform },
      label: fbLabel?.enabled && fbLabel.text.trim().length > 0 ? serializeLabel(fbLabel) : null,
    };
  }

  // Kliens oldali becslés – a szerver ezt sosem fogadja el módosítás nélkül,
  // mindig újraszámolja ugyanezzel a modullal (src/pricing.js).
  config.calculatedPrice = calculatePrice(config).total;

  return config;
}
