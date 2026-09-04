/**
 * Egyetlen, központi árazási modul – MINDEN ár innen jön.
 *
 * EZT importálja a React konfigurátor (élő ársáv, PriceBar) és a köztes híd
 * szerver (server/) is a hitelesített, szerver oldali ár-újraszámoláshoz.
 * Az árazási logika sehol máshol nem duplikálódik: egy szám átírása itt
 * mindenhol azonnal érvényesül.
 *
 * ÁRVÁLTOZTATÁS:  MODEL_PRICES / FOOTBOARD_EXTRA_HUF / INSTALLATION_OPTIONS.
 * ÚJ MODELL:      egy új bejegyzés a MODEL_PRICES-ba (kulcs = a modell id-ja
 *                 a src/data/models/index.js regiszterben), mind a három
 *                 szint árával. Kódot nem kell módosítani.
 * ÚJ SZINT:       egy új bejegyzés a TIERS tömbbe, és minden MODEL_PRICES
 *                 sorba az új szint ára. A validáció és az ársáv adatból
 *                 dolgozik, ezért magától felveszi.
 *
 * Minden összeg forintban, bruttó, egész szám.
 */

export const CURRENCY = 'HUF';

/** Termékszintek. Az id egyezik a mintaregiszter `line` mezőjével (solid/print),
 *  a feltöltött saját kép pedig mindig 'custom'. */
export const TIERS = [
  { id: 'solid', name: 'SOLID', description: 'Egyszínű, nyomtatás nélküli vágott fólia' },
  { id: 'print', name: 'PRINT', description: 'Kész, jóváhagyott galéria-minta' },
  { id: 'custom', name: 'FULL CUSTOM', description: 'Saját feltöltött kép – kézi jóváhagyással' },
];

export const TIER_IDS = TIERS.map((t) => t.id);

/**
 * Modellenkénti, szintenkénti bruttó ár (Ft).
 *
 * A kulcs a rollermodell id-ja. A `name` csak kiíráshoz kell ott, ahol a
 * modellregiszter nem érhető el (pl. szerver oldali rendelés-export).
 *
 * MEGJEGYZÉS: a `kukirin-g2-pro-max` és a `race-kit` ára már be van vezetve,
 * de ezekhez még nincs geometria (darab-vágókontúr) a src/data/models/
 * mappában, ezért a konfigurátorban még nem választhatók. Amint elkészül a
 * vázlatuk, egyetlen regiszter-sorral bekapcsolhatók – az áruk már itt van.
 */
export const MODEL_PRICES = {
  'kukirin-g2-pro-max': { name: 'Kukirin G2 Pro / Max', solid: 22900, print: 36900, custom: 54900 },
  'kukirin-g2': { name: 'Kukirin G2', solid: 24900, print: 39900, custom: 59900 },
  'kukirin-g2-master': { name: 'Kukirin G2 Master', solid: 27900, print: 44900, custom: 64900 },
  'race-kit': { name: 'Race kit (részleges szett)', solid: 19900, print: 29900, custom: 44900 },
};

/** Taposófelület (dekk állófelülete) kültéri csúszásgátló anyagból – opcionális, alapból KI. */
export const FOOTBOARD_EXTRA_HUF = 6900;

/** Felrakás mint szolgáltatás – csak személyes átvétellel. */
export const INSTALLATION_OPTIONS = [
  { id: 'none', name: 'Nem kérem', price: 0 },
  { id: 'normal', name: 'Normál', price: 17000 },
  { id: 'complex', name: 'Komplex', price: 25500 },
];

export const INSTALLATION_NOTE = 'A felrakás csak személyes átvétellel érhető el – szállítással nem kérhető.';

export const INSTALLATION_IDS = INSTALLATION_OPTIONS.map((o) => o.id);

/** Egyedi (CUSTOM) feltöltéshez elvárt minimum pixelméret, nyomtatási minőség miatt. */
export const MIN_CUSTOM_IMAGE_PX = { width: 2000, height: 2000 };

export class PricingError extends Error {
  constructor(message, errors = [message]) {
    super(message);
    this.name = 'PricingError';
    this.errors = errors;
  }
}

export function getTier(id) {
  return TIERS.find((t) => t.id === id) ?? null;
}

export function getInstallation(id) {
  return INSTALLATION_OPTIONS.find((o) => o.id === id) ?? null;
}

/** Van-e egyáltalán árunk erre a modellre? (a konfigurátor ebből dönt, mutasson-e árat) */
export function hasPrice(modelId) {
  return Object.prototype.hasOwnProperty.call(MODEL_PRICES, modelId);
}

/**
 * Csak azt ellenőrzi, ami az árat ténylegesen befolyásolja (modell, szint,
 * felrakás). Így `calculatePrice` már akkor is hívható, amikor a felhasználó
 * még nem választott színt/kategóriát/képet – a teljes, beküldéshez kötelező
 * mezőkészletet a `validateConfigShape` ellenőrzi.
 * @returns {string[]}
 */
function validatePriceInputs(config) {
  if (!config || typeof config !== 'object') {
    return ['Hiányzó vagy hibás konfiguráció.'];
  }
  const errors = [];
  const model = MODEL_PRICES[config.model];
  if (!model) {
    errors.push(`Ismeretlen rollermodell: "${config.model ?? ''}".`);
  }
  if (!TIER_IDS.includes(config.tier)) {
    errors.push(`Ismeretlen termékszint: "${config.tier ?? ''}" (${TIER_IDS.join(' | ')}).`);
  }
  if (model && TIER_IDS.includes(config.tier) && typeof model[config.tier] !== 'number') {
    errors.push(`Ehhez a modellhez nincs ${config.tier.toUpperCase()} ár megadva.`);
  }
  if (config.installation !== undefined && config.installation !== null
      && !INSTALLATION_IDS.includes(config.installation)) {
    errors.push(`Ismeretlen felrakás-opció: "${config.installation}".`);
  }
  return errors;
}

/**
 * Teljes strukturális ellenőrzés a kosárba küldés előtt: az adott szinthez
 * kötelező összes mező megvan-e. A kép tényleges felbontását nem tudja
 * ellenőrizni (ahhoz le kell tölteni – ezt a szerver oldali
 * fetchImageDimensions végzi), csak azt, hogy az URL jelen van.
 * @returns {string[]} hibaüzenetek listája (üres tömb = rendben)
 */
export function validateConfigShape(config) {
  const errors = validatePriceInputs(config);
  if (!config || typeof config !== 'object') return errors;

  if (config.tier === 'print') {
    if (!config.category) errors.push('PRINT szinthez kötelező a minta-kategória.');
    if (!config.colorway) errors.push('PRINT szinthez kötelező a színvariáns.');
    if (!config.density) errors.push('PRINT szinthez kötelező a sűrűség (ritka | sűrű).');
  }
  if (config.tier === 'solid' && !config.colorway) {
    errors.push('SOLID szinthez kötelező a szín.');
  }
  if (config.tier === 'custom' && !config.uploadedImageUrl) {
    errors.push('FULL CUSTOM szinthez kötelező a feltöltött kép URL-je (uploadedImageUrl).');
  }
  return errors;
}

/** @returns {boolean} a szélesség/magasság eléri-e a minimumot */
export function meetsMinResolution(width, height, min = MIN_CUSTOM_IMAGE_PX) {
  return Number.isFinite(width) && Number.isFinite(height) && width >= min.width && height >= min.height;
}

/**
 * A végösszeg kiszámítása. A kliens által küldött `calculatedPrice` mezőt
 * EZ A FÜGGVÉNY SOHA nem olvassa be – az csak megjelenítési előnézet, a
 * tényleges ár mindig itt, ebből az adatból számolódik újra.
 *
 * @param {{model:string, tier:string, includeFootboard?:boolean, installation?:string}} config
 * @returns {{currency:string, base:number, footboard:number, installation:number,
 *            installationId:string, total:number}}
 */
export function calculatePrice(config) {
  const errors = validatePriceInputs(config);
  if (errors.length) throw new PricingError(errors[0], errors);

  const base = MODEL_PRICES[config.model][config.tier];
  const footboard = config.includeFootboard ? FOOTBOARD_EXTRA_HUF : 0;
  const installationId = config.installation ?? 'none';
  const installation = getInstallation(installationId).price;

  return {
    currency: CURRENCY,
    base,
    footboard,
    installation,
    installationId,
    total: base + footboard + installation,
  };
}

/** FULL CUSTOM szint mindig kézi jóváhagyást igényel gyártás előtt (felbontás, jogtisztaság). */
export function requiresManualApproval(tier) {
  return tier === 'custom';
}
