/**
 * Egyetlen, központi árazási modul – MINDEN ár innen jön.
 *
 * EZT importálja a React konfigurátor (élő ársáv, PriceBar) és a köztes híd
 * szerver (server/) is a hitelesített, szerver oldali ár-újraszámoláshoz.
 * Az árazási logika sehol máshol nem duplikálódik: egy szám átírása itt
 * mindenhol azonnal érvényesül.
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │ ÁRVÁLTOZTATÁS – hol?                                                    │
 * │   MODEL_PRICES          teljes fólia szett ára modellenként, szintenként │
 * │   ZONE_PRICES_HUF       zónánkénti ár (a "Mit fóliázunk" sorai)          │
 * │   FOOTBOARD_EXTRA_HUF   taposófelület (külön tétel)                      │
 * │   INSTALLATION_OPTIONS  felrakás (normál / komplex)                      │
 * │   MIN_ORDER_HUF         minimális rendelési érték                        │
 * │ ZÓNANEVEK: src/data/zones.js (ott, és csak ott).                        │
 * │ ÚJ MODELL: egy sor a MODEL_PRICES-ba (kulcs = a modell id-ja a           │
 * │   src/data/models/index.js regiszterben) – a zónaárak a szett árából     │
 * │   arányosan levezetődnek, külön nem kell megadni őket.                   │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Minden összeg forintban, bruttó, egész szám.
 */
import { ZONES, ZONE_IDS, zoneOfGroup } from './data/zones.js';

export const CURRENCY = 'HUF';

/** Termékszintek. Az id egyezik a mintaregiszter `line` mezőjével (solid/print),
 *  a feltöltött saját kép pedig mindig 'custom'. */
export const TIERS = [
  { id: 'solid', name: 'SOLID', description: 'Egyszínű, nyomtatás nélküli vágott fólia' },
  { id: 'print', name: 'PRINT', description: 'Kész, jóváhagyott galéria-minta' },
  { id: 'custom', name: 'EGYEDI', description: 'Saját feltöltött kép – kézi jóváhagyással' },
];

export const TIER_IDS = TIERS.map((t) => t.id);

/**
 * A TELJES FÓLIA SZETT bruttó ára modellenként, szintenként (Ft).
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

/**
 * ZÓNÁNKÉNTI ÁRAK – a Kukirin G2 / PRINT szint tényleges árai (Ft).
 *
 * Ez a KANONIKUS árlista: minden más modell/szint zónaára ebből, egyetlen
 * szorzóval van levezetve, hogy az arányok minden modellen ugyanazok
 * maradjanak és csak egy helyen kelljen árat karbantartani:
 *
 *   zónaár(modell, szint) = kerekítve50( ár_itt / CANONICAL_KIT_BASE_HUF × MODEL_PRICES[modell][szint] )
 *
 * A kulcsok a src/data/zones.js zóna-id-jai. Ha egy zónát máshogy akarsz
 * árazni egy adott modellen, itt nem tudod – ez szándékos: az árazás egy
 * arányrendszer, nem modellenkénti kézi lista.
 */
export const ZONE_PRICES_HUF = {
  'deck-side': 17900,
  panels: 12900,
  stem: 9900,
  front: 8900,
  rear: 8500,
};

/** A kanonikus zónaárlista alapja: a G2 PRINT teljes szett ára (MODEL_PRICES['kukirin-g2'].print). */
export const CANONICAL_KIT_BASE_HUF = 39900;

/** Minimális rendelési érték, ha nem a teljes szettet veszi. */
export const MIN_ORDER_HUF = 9900;

/** Taposófelület (dekk állófelülete) kültéri csúszásgátló anyagból – külön
 *  tétel, a teljes szett SEM tartalmazza, alapból KI. Fix ár, szinttől független
 *  (más anyag, más gyártás). */
export const FOOTBOARD_EXTRA_HUF = 9900;

/** Postázás díja, ha a vevő NEM kér felrakást. 0 = ingyenes (a címkén "ingyenes"
 *  jelenik meg). Ha díjköteles lesz, ide írd az összeget – a felrakás/postázás
 *  kártya címkéje, az ársáv bontása és a végösszeg is ebből dolgozik. */
export const SHIPPING_HUF = 0;

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

function round50(n) {
  return Math.round(n / 50) * 50;
}

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

/** Egy zóna ára egy adott modell/szint kombinációra – a kanonikus arányból levezetve. */
export function getZonePrice(model, tier, zoneId) {
  const canonical = ZONE_PRICES_HUF[zoneId];
  const kitBase = MODEL_PRICES[model]?.[tier];
  if (typeof canonical !== 'number' || typeof kitBase !== 'number') return null;
  return round50((canonical / CANONICAL_KIT_BASE_HUF) * kitBase);
}

/**
 * Az összes (vagy a megadott) zóna ára egy modell/szint kombinációra.
 * @param {string} model
 * @param {string} tier
 * @param {string[]} [zoneIds] alapból az összes zóna
 */
export function getZonePrices(model, tier, zoneIds = ZONE_IDS) {
  return ZONES
    .filter((z) => zoneIds.includes(z.id))
    .map((z) => ({ id: z.id, name: z.name, price: getZonePrice(model, tier, z.id) }));
}

/**
 * A teljes szett és a zónák viszonya egy modell/szint kombinációra:
 *   listSum   – az elérhető zónák külön-külön összege ("külön darabonként")
 *   kitPrice  – a teljes fólia szett ára
 *   savings   – mennyit spórol a vevő a szettel a külön-külön árhoz képest
 * Ez a szám jelenik meg a "Teljes fólia szett" sorban és az ársáv "(−X)"
 * részében – MINDIG ugyanez a két végpont, ezért soha nem tér el a két helyen.
 * @param {string} model
 * @param {string} tier
 * @param {string[]} [availableZoneIds] a modellen ténylegesen létező zónák
 */
export function getKitInfo(model, tier, availableZoneIds = ZONE_IDS) {
  const zones = getZonePrices(model, tier, availableZoneIds);
  const listSum = zones.reduce((s, z) => s + (z.price ?? 0), 0);
  const kitPrice = MODEL_PRICES[model]?.[tier] ?? null;
  return {
    zones,
    listSum,
    kitPrice,
    savings: kitPrice != null ? Math.max(0, listSum - kitPrice) : 0,
  };
}

/**
 * Minimumrendelés-ellenőrzés részleges (nem teljes szettes) vásárlásnál. A
 * taposófelület és a felrakás is beleszámít a végösszegbe.
 * @returns {{ok:boolean, message?:string}}
 */
export function checkMinimumOrder(total) {
  if (total <= 0 || total >= MIN_ORDER_HUF) return { ok: true };
  return { ok: false, message: `A minimális rendelési érték ${MIN_ORDER_HUF.toLocaleString('hu-HU')} Ft.` };
}

/**
 * A rendelés-konfiguráció zónalistája. Két forma elfogadott:
 *   selectedZoneIds  – a kiválasztott zónák id-i (ezt küldi a konfigurátor);
 *   selectedGroupIds – RÉGI forma: darab-csoport id-k (visszafelé kompatibilitás:
 *                      a csoportokat a zónájukra képezzük).
 * `undefined` = teljes szett (minden zóna).
 * @returns {string[]|undefined}
 */
function resolveZoneIds(config) {
  if (Array.isArray(config.selectedZoneIds)) return config.selectedZoneIds;
  if (Array.isArray(config.selectedGroupIds)) {
    return [...new Set(config.selectedGroupIds.map((g) => zoneOfGroup(g)?.id).filter(Boolean))];
  }
  return undefined;
}

/**
 * Csak azt ellenőrzi, ami az árat ténylegesen befolyásolja (modell, szint,
 * felrakás, zónák). Így `calculatePrice` már akkor is hívható, amikor a
 * felhasználó még nem választott színt/kategóriát/képet – a teljes,
 * beküldéshez kötelező mezőkészletet a `validateConfigShape` ellenőrzi.
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
  const zoneIds = resolveZoneIds(config);
  if (zoneIds !== undefined) {
    const unknown = zoneIds.filter((id) => !ZONE_IDS.includes(id));
    if (unknown.length) errors.push(`Ismeretlen zóna: ${unknown.join(', ')}.`);
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
 * Zónák: ha `selectedZoneIds` hiányzik, vagy az összes elérhető zónát
 * tartalmazza (`availableZoneIds`, alapból mind), a TELJES SZETT ára számít.
 * Egyébként a kiválasztott zónák árának egyszerű összege – ekkor a
 * végösszegre a minimumrendelés-szabály is vonatkozik.
 *
 * A taposófelület a szettnek SEM része: mindig külön tétel.
 *
 * @param {{model:string, tier:string, includeFootboard?:boolean, installation?:string,
 *          selectedZoneIds?:string[], availableZoneIds?:string[]}} config
 * @returns {{currency:string, base:number, zones:Array<{id:string,name:string,price:number}>,
 *            footboard:number, installation:number, installationId:string, shipping:number, total:number,
 *            isFullKit:boolean, kit:{listSum:number, kitPrice:number|null, savings:number},
 *            minimumOrder:{ok:boolean,message?:string}}}
 */
export function calculatePrice(config) {
  const errors = validatePriceInputs(config);
  if (errors.length) throw new PricingError(errors[0], errors);

  const available = Array.isArray(config.availableZoneIds) ? config.availableZoneIds : ZONE_IDS;
  const requested = resolveZoneIds(config);
  const selected = requested === undefined ? available : requested.filter((id) => available.includes(id));
  const isFullKit = available.every((id) => selected.includes(id));
  const kit = getKitInfo(config.model, config.tier, available);
  const zones = getZonePrices(config.model, config.tier, selected);

  const base = isFullKit
    ? MODEL_PRICES[config.model][config.tier]
    : zones.reduce((s, z) => s + (z.price ?? 0), 0);
  const footboard = config.includeFootboard ? FOOTBOARD_EXTRA_HUF : 0;
  const installationId = config.installation ?? 'none';
  const installation = getInstallation(installationId).price;
  // postázás csak felrakás nélkül – felrakásnál személyesen hozza a rollert
  const shipping = installationId === 'none' ? SHIPPING_HUF : 0;
  const total = base + footboard + installation + shipping;

  return {
    currency: CURRENCY,
    base,
    zones,
    footboard,
    installation,
    installationId,
    shipping,
    total,
    isFullKit,
    kit: { listSum: kit.listSum, kitPrice: kit.kitPrice, savings: kit.savings },
    minimumOrder: isFullKit ? { ok: true } : checkMinimumOrder(total),
  };
}

/** FULL CUSTOM szint mindig kézi jóváhagyást igényel gyártás előtt (felbontás, jogtisztaság). */
export function requiresManualApproval(tier) {
  return tier === 'custom';
}
