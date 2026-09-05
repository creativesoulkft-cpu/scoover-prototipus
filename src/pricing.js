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
  { id: 'custom', name: 'EGYEDI', description: 'Saját feltöltött kép – kézi jóváhagyással' },
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

/**
 * Darabonkénti (à la carte) árazás.
 *
 * A `PRICE_GROUPS` a G2 PRINT szint tényleges, Szilárd által megadott
 * darabáraiból származik – ez a KANONIKUS árlista, minden más modell/szint
 * darabára ebből egyetlen szorzóval (`egyedárszorzó`) van levezetve:
 *
 *   darabár(modell, szint, csoport) = kerekítve50(
 *     csoport.canonicalPriceHuf / CANONICAL_KIT_BASE_HUF × MODEL_PRICES[modell][szint]
 *   )
 *
 * A csoport `id`-ja egyben a fizikai darab-azonosító (piece id) is a
 * modell-adatfájlokban ott, ahol egy csoporthoz csak egyetlen fizikai darab
 * tartozik. Ahol egy néven TÖBB fizikai darab van (pl. "Dekk oldala" = a
 * dekk oldala + az akkudoboz alja), azt a modell-adatfájlban a darabok saját
 * `priceGroup` mezője köti ehhez a csoport-id-hoz – lásd
 * src/data/models/kukirin-g2.js. EZ AZ IDEIGLENES, BECSÜLT FELOSZTÁS: a
 * tényleges vágófájlban ~24 fizikai darab lesz, ezeknek a pontos
 * hozzárendelése később, csak az adatfájlok (itt a `PRICE_GROUPS` lista és
 * a modellek `priceGroup` mezői) bővítésével történik – ez a fájl, a
 * kedvezmény-logika nem változik.
 */
export const PRICE_GROUPS = [
  { id: 'deck-side', name: 'Dekk oldala', canonicalPriceHuf: 27900 },
  { id: 'stem', name: 'Kormányoszlop', canonicalPriceHuf: 11900 },
  { id: 'rear-fender', name: 'Hátsó sárvédő', canonicalPriceHuf: 9900 },
  { id: 'joint', name: 'Csuklóborítás (hajtás)', canonicalPriceHuf: 7900 },
  { id: 'fork', name: 'Első lengőkar-borítás', canonicalPriceHuf: 7900 },
  { id: 'neck', name: 'Dekk-nyak / első lengőkar-borítás', canonicalPriceHuf: 7900 },
  { id: 'rear-swingarm', name: 'Hátsó lengőkar-borítás', canonicalPriceHuf: 7900 },
  { id: 'display', name: 'Kormány-középrész (kijelzőborítás)', canonicalPriceHuf: 4900 },
];

/** A kanonikus árlista alapja: a G2 PRINT "teljes kit" ára (MODEL_PRICES['kukirin-g2'].print). */
export const CANONICAL_KIT_BASE_HUF = 39900;

/** Minimális rendelési érték darabonkénti vásárlásnál. */
export const MIN_ORDER_HUF = 9900;

export const PRICE_GROUP_IDS = PRICE_GROUPS.map((g) => g.id);

function round50(n) {
  return Math.round(n / 50) * 50;
}

export function getPriceGroup(id) {
  return PRICE_GROUPS.find((g) => g.id === id) ?? null;
}

/** Egy darabcsoport ára egy adott modell/szint kombinációra – a kanonikus arányból levezetve ("egyedárszorzó"). */
export function getGroupPrice(model, tier, groupId) {
  const group = getPriceGroup(groupId);
  const kitBase = MODEL_PRICES[model]?.[tier];
  if (!group || typeof kitBase !== 'number') return null;
  return round50((group.canonicalPriceHuf / CANONICAL_KIT_BASE_HUF) * kitBase);
}

/** Az összes darabcsoport ára egy adott modell/szint kombinációra, kiíráshoz/ellenőrzéshez. */
export function getGroupPrices(model, tier) {
  return PRICE_GROUPS.map((g) => ({ id: g.id, name: g.name, price: getGroupPrice(model, tier, g.id) }));
}

/**
 * Darabonkénti (à la carte) végösszeg folytonos, darabszám-arányos
 * kedvezménnyel: 1 darabnál nincs kedvezmény (listaár), és a kedvezmény
 * lineárisan nő a kiválasztott darabok számával, amíg az ÖSSZES csoport
 * kiválasztásánál pontosan a "teljes kit" árat nem adja (nincs kemény
 * sávhatár, nincs kitalált százalék – a két végpontból, a listaár-összegből
 * és a kit árból következik).
 *
 * @param {string} model
 * @param {string} tier
 * @param {string[]} selectedGroupIds
 * @returns {number}
 */
export function calculatePartialTotal(model, tier, selectedGroupIds) {
  const all = getGroupPrices(model, tier);
  const listSum = all.reduce((s, g) => s + g.price, 0);
  const kitBase = MODEL_PRICES[model]?.[tier] ?? 0;
  const n = all.length;
  const k = selectedGroupIds.length;
  if (k === 0) return 0;
  if (k >= n) return kitBase; // mind kiválasztva → pontosan a teljes kit ára

  const selectedSum = all
    .filter((g) => selectedGroupIds.includes(g.id))
    .reduce((s, g) => s + g.price, 0);
  const maxDiscount = listSum > 0 ? 1 - kitBase / listSum : 0;
  const t = n > 1 ? (k - 1) / (n - 1) : 1; // 0 (1 darab) .. 1 (mind, de azt a fenti ág már lekezelte)
  const discount = maxDiscount * t;
  return Math.round(selectedSum * (1 - discount));
}

/**
 * Átláthatósági infó a Darabok listához és az ársávhoz: mennyi a JELENLEGI
 * kedvezmény a kiválasztott darabok listaár-összegéhez képest, és mekkora a
 * teljes kit ára/kedvezménye végpontként – hogy világos legyen, miért éri meg
 * több darabot bepipálni (lásd `calculatePartialTotal` fejléce).
 * @returns {{count:number, totalGroups:number, total:number, listSum:number,
 *            selectedListSum:number, kitPrice:number|null, discountPct:number,
 *            maxDiscountPct:number, isFullKit:boolean}}
 */
export function getPartialPricingInfo(model, tier, selectedGroupIds) {
  const all = getGroupPrices(model, tier);
  const n = all.length;
  const k = selectedGroupIds.length;
  const kitPrice = MODEL_PRICES[model]?.[tier] ?? null;
  const listSum = all.reduce((s, g) => s + g.price, 0);
  const selectedListSum = all
    .filter((g) => selectedGroupIds.includes(g.id))
    .reduce((s, g) => s + g.price, 0);
  const total = calculatePartialTotal(model, tier, selectedGroupIds);
  const discountPct = selectedListSum > 0 ? Math.round((1 - total / selectedListSum) * 100) : 0;
  const maxDiscountPct = listSum > 0 && kitPrice != null ? Math.round((1 - kitPrice / listSum) * 100) : 0;
  return { count: k, totalGroups: n, total, listSum, selectedListSum, kitPrice, discountPct, maxDiscountPct, isFullKit: k >= n };
}

/**
 * Minimumrendelés-ellenőrzés darabonkénti vásárlásnál. A taposófelület
 * extrája is beleszámít (a vevő azzal is elérheti a minimumot).
 * @returns {{ok:boolean, message?:string}}
 */
export function checkMinimumOrder(total) {
  if (total <= 0 || total >= MIN_ORDER_HUF) return { ok: true };
  return {
    ok: false,
    message: `A minimális rendelési érték ${MIN_ORDER_HUF.toLocaleString('hu-HU')} Ft – válassz még egy darabot, vagy add hozzá a taposófelületet.`,
  };
}

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
  if (config.selectedGroupIds !== undefined) {
    const unknown = config.selectedGroupIds.filter((id) => !PRICE_GROUP_IDS.includes(id));
    if (unknown.length) errors.push(`Ismeretlen darab-csoport: ${unknown.join(', ')}.`);
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
 * Ha `selectedGroupIds` nincs megadva (vagy az összes csoportot tartalmazza),
 * a teljes kit ára számít (mint korábban). Ha részleges (nem mind a 8
 * csoport van kiválasztva), az ár a darabonkénti, folytonos kedvezményű
 * összeg (`calculatePartialTotal`) – ekkor a végösszegre a minimumrendelés-
 * szabály is vonatkozik (lásd `minimumOrder` a válaszban).
 *
 * @param {{model:string, tier:string, includeFootboard?:boolean, installation?:string, selectedGroupIds?:string[]}} config
 * @returns {{currency:string, base:number, footboard:number, installation:number,
 *            installationId:string, total:number, isFullKit:boolean,
 *            minimumOrder:{ok:boolean,message?:string}}}
 */
export function calculatePrice(config) {
  const errors = validatePriceInputs(config);
  if (errors.length) throw new PricingError(errors[0], errors);

  const isFullKit = config.selectedGroupIds === undefined || config.selectedGroupIds.length >= PRICE_GROUP_IDS.length;
  const base = isFullKit
    ? MODEL_PRICES[config.model][config.tier]
    : calculatePartialTotal(config.model, config.tier, config.selectedGroupIds);
  const footboard = config.includeFootboard ? FOOTBOARD_EXTRA_HUF : 0;
  const installationId = config.installation ?? 'none';
  const installation = getInstallation(installationId).price;
  const total = base + footboard + installation;

  return {
    currency: CURRENCY,
    base,
    footboard,
    installation,
    installationId,
    total,
    isFullKit,
    minimumOrder: isFullKit ? { ok: true } : checkMinimumOrder(total),
  };
}

/** FULL CUSTOM szint mindig kézi jóváhagyást igényel gyártás előtt (felbontás, jogtisztaság). */
export function requiresManualApproval(tier) {
  return tier === 'custom';
}
