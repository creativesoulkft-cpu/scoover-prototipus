/**
 * Egyetlen, központi árazási modul.
 *
 * EZT importálja mind a React konfigurátor (élő ár-előnézet a vásárlásnak),
 * mind a köztes híd szerver (server/) a végleges, hitelesített ár
 * kiszámításához. Az árazási logika soha nem duplikálódik máshol – ha egy
 * összeg vagy szabály változik, csak itt kell módosítani.
 *
 * Tisztán JS (nincs böngésző- vagy Node-specifikus API), ezért mindkét
 * oldalról közvetlenül importálható: a Vite-appból `src/pricing.js`-ként,
 * a szerverről relatív útvonallal (`../src/pricing.js`).
 *
 * FIGYELEM – ÁR-PLACEHOLDEREK: az alábbi Ft-összegek egyelőre kitalált
 * (nem véglegesített) értékek, mert a feladat kiírásakor nem érkezett
 * konkrét árlista. Cseréld ki a tényleges összegekre, mielőtt élesbe megy –
 * ez az egyetlen hely, ahol ezt módosítani kell.
 */

export const CURRENCY = 'HUF';

export const TIERS = ['solid', 'print', 'custom'];
export const PRINT_CATEGORIES = ['cyber', 'motocross'];

/** Egyedi (CUSTOM) feltöltéshez elvárt minimum pixelméret, nyomtatási minőség miatt. */
export const MIN_CUSTOM_IMAGE_PX = { width: 2000, height: 2000 };

// --- PLACEHOLDER árak (Ft) ------------------------------------------------
// SOLID alapár modellenként.
export const MODEL_BASE_PRICE_HUF = {
  'kukirin-g2': 24900,
  'kukirin-g2-master': 27900,
};

// PRINT és CUSTOM felár a SOLID alapár felett (CUSTOM = PRINT felár + CUSTOM felár, mert kézi jóváhagyást igényel).
export const TIER_SURCHARGE_HUF = {
  print: 8000,
  custom: 15000,
};

// Taposófelület (dekk állófelülete, kültéri csúszásgátló anyag) extra – fix Ft/modell, szinttől függetlenül.
export const FOOTBOARD_SURCHARGE_HUF = {
  'kukirin-g2': 4900,
  'kukirin-g2-master': 5900,
};
export const DEFAULT_FOOTBOARD_SURCHARGE_HUF = 4900;
// ---------------------------------------------------------------------------

export class PricingError extends Error {
  constructor(message, errors = [message]) {
    super(message);
    this.name = 'PricingError';
    this.errors = errors;
  }
}

/**
 * Csak azt ellenőrzi, ami az árat ténylegesen befolyásolja (model, tier).
 * Ez teszi lehetővé, hogy `calculatePrice` már akkor is hívható legyen,
 * amikor a felhasználó még nem választott színt/kategóriát/képet (élő
 * ár-előnézet a kliensen) – a teljes, beküldéshez kötelező mezőkészletet
 * a `validateConfigShape` ellenőrzi.
 * @returns {string[]}
 */
function validatePriceInputs(config) {
  const errors = [];
  if (!config || typeof config !== 'object') {
    return ['Hiányzó vagy hibás konfiguráció.'];
  }
  if (!config.model || !Object.prototype.hasOwnProperty.call(MODEL_BASE_PRICE_HUF, config.model)) {
    errors.push(`Ismeretlen rollermodell: "${config.model ?? ''}".`);
  }
  if (!TIERS.includes(config.tier)) {
    errors.push(`Ismeretlen termékszint: "${config.tier ?? ''}" (solid | print | custom).`);
  }
  return errors;
}

/**
 * Teljes strukturális ellenőrzés a kosárba küldés előtt: az adott szinthez
 * kötelező összes mező megvan-e. Nem tudja ellenőrizni a kép tényleges
 * felbontását (ahhoz le kell tölteni – ezt a szerver oldali
 * fetchImageDimensions végzi), csak hogy az URL jelen van.
 * @returns {string[]} hibaüzenetek listája (üres tömb = rendben)
 */
export function validateConfigShape(config) {
  const errors = validatePriceInputs(config);
  if (!config || typeof config !== 'object') return errors;

  if (config.tier === 'print') {
    if (!config.category || !PRINT_CATEGORIES.includes(config.category)) {
      errors.push('PRINT szinthez kötelező a minta-kategória (cyber | motocross).');
    }
    if (!config.colorway) errors.push('PRINT szinthez kötelező a színvariáns.');
    if (!config.density) errors.push('PRINT szinthez kötelező a sűrűség (ritka | sűrű).');
  }
  if (config.tier === 'solid' && !config.colorway) {
    errors.push('SOLID szinthez kötelező a szín.');
  }
  if (config.tier === 'custom' && !config.uploadedImageUrl) {
    errors.push('CUSTOM szinthez kötelező a feltöltött kép URL-je (uploadedImageUrl).');
  }
  return errors;
}

/** @returns {boolean} a szélesség/magasság eléri-e a minimumot */
export function meetsMinResolution(width, height, min = MIN_CUSTOM_IMAGE_PX) {
  return Number.isFinite(width) && Number.isFinite(height) && width >= min.width && height >= min.height;
}

/**
 * A hitelesített végösszeg kiszámítása. A kliens által küldött
 * `calculatedPrice` mezőt EZ A FÜGGVÉNY SOHA nem olvassa be – az csak
 * megjelenítési előnézet, a tényleges ár mindig újraszámolódik.
 *
 * @param {{model:string, tier:string, includeFootboard?:boolean}} config
 * @returns {{currency:string, base:number, tierSurcharge:number, footboardSurcharge:number, total:number}}
 */
export function calculatePrice(config) {
  const errors = validatePriceInputs(config);
  if (errors.length) throw new PricingError(errors[0], errors);

  const base = MODEL_BASE_PRICE_HUF[config.model];
  const tierSurcharge = config.tier === 'custom'
    ? TIER_SURCHARGE_HUF.print + TIER_SURCHARGE_HUF.custom
    : config.tier === 'print'
      ? TIER_SURCHARGE_HUF.print
      : 0;
  const footboardSurcharge = config.includeFootboard
    ? (FOOTBOARD_SURCHARGE_HUF[config.model] ?? DEFAULT_FOOTBOARD_SURCHARGE_HUF)
    : 0;

  return {
    currency: CURRENCY,
    base,
    tierSurcharge,
    footboardSurcharge,
    total: base + tierSurcharge + footboardSurcharge,
  };
}

/** CUSTOM szint mindig kézi jóváhagyást igényel gyártás előtt (felbontás, jogtisztaság). */
export function requiresManualApproval(tier) {
  return tier === 'custom';
}
