/**
 * Mintataxonómia: termékvonalak, stíluskategóriák, színvariánsok, sűrűség.
 *
 * ÚJ KATEGÓRIA (pl. organic, y2k, urban-camo) felvétele: állítsd `available: true`-ra
 * a lenti bejegyzést (vagy vegyél fel újat), és add hozzá a mintafájlokat
 * `category: '<id>'` mezővel. A galéria és a feliratréteg ebből dolgozik,
 * kódmódosítás nem kell.
 */

/**
 * Termékvonalak – a Minta szekció 3 füle. A `description` a fül alatt
 * mindig látható, rövid magyarázó szöveg (Szilárd által megadott, pontos
 * szöveg – itt nem a kódnak kell "eladnia" a különbséget, hanem ennek).
 * A harmadik ("custom") fül nem beépített mintát ad, hanem a saját kép
 * feltöltését – lásd PatternGallery.jsx.
 */
export const PRODUCT_LINES = [
  { id: 'solid', name: 'SOLID', description: 'Egyszínű fólia minta nélkül. Letisztult, gyorsan elkészül, a legkedvezőbb áron.' },
  { id: 'print', name: 'PRINT', description: 'Kész Scoover grafikák. Egyedi mintázat, azonnal választható, prémium megjelenés.' },
  { id: 'custom', name: 'EGYEDI', description: 'A saját képed vagy grafikád a rolleren. Teljesen egyedi, csak a tiéd.' },
];

/**
 * Felirat-betűstílusok kategóriánként – ez csak az ALAPÉRTELMEZETT, a teljes
 * választékot (amit egy felirat felül is írhat) lásd src/data/fonts.js.
 */
import { getFontOption } from '../fonts.js';

const FONTS = {
  cyber: getFontOption('orbitron'),
  motocross: getFontOption('anton'),
  neutral: getFontOption('rajdhani'),
};

export const PATTERN_CATEGORIES = [
  {
    id: 'solid', line: 'solid', name: 'Egyszínű', available: true,
    description: 'Egyszínű vinyl, nyomtatás nélkül.',
    keywords: ['egyszínű', 'matt', 'fényes', 'vinyl'],
    labelFont: FONTS.neutral,
  },
  {
    id: 'cyber', line: 'print', name: 'Cyber', available: true,
    description: 'Futurisztikus, panelos HUD-esztétika: éles geometrikus síkok, karbonszövet, világító vonalak.',
    keywords: ['cyberpunk', 'tech', 'futurisztikus', 'HUD', 'karbon', 'high-tech', 'sci-fi'],
    labelFont: FONTS.cyber,
    /** csempe-lépték darabméret-osztályonként (a minta felülírhatja) */
    patternScale: { large: 1, medium: 0.7, small: 0.45 },
  },
  {
    id: 'motocross', line: 'print', name: 'Motocross', available: true,
    description: 'Agresszív, szilánkos, fröccsentett formanyelv: motorsport, éles törésvonalak, festékfröccsenés.',
    keywords: ['motocross', 'racing', 'offroad', 'extrém sport', 'adrenalin', 'verseny'],
    labelFont: FONTS.motocross,
    patternScale: { large: 1, medium: 0.7, small: 0.5 },
  },
  // --- tervezett, még nem elérhető kategóriák (helyfoglalás) ---
  {
    id: 'organic', line: 'print', name: 'Organic / Tribal', available: false,
    description: 'Íves, folyó vonalvezetésű minták.', keywords: ['organic', 'tribal'],
    labelFont: FONTS.neutral,
  },
  {
    id: 'y2k', line: 'print', name: 'Y2K / Pasztell', available: false,
    description: 'Világos, krómos-holografikus.', keywords: ['y2k', 'pasztell', 'holo'],
    labelFont: FONTS.neutral,
  },
  {
    id: 'urban-camo', line: 'print', name: 'Urban camo', available: false,
    description: 'Geometrikus terepmintázat.', keywords: ['camo', 'terep', 'urban'],
    labelFont: FONTS.neutral,
  },
  // --- fejlesztői demó: procedurális SVG-minták a renderelő képességeinek
  //     teszteléséhez (Carbon 3D, Hex-tech, Sunset fade). NEM eladható termék,
  //     ezért `dev: true` – élesben rejtve marad, a galéria csak fejlesztői
  //     buildben (import.meta.env.DEV) kínál rá kapcsolót. ---
  {
    id: 'demo', line: 'print', name: 'Fejlesztői demó', available: true, dev: true,
    description: 'Kliens oldalon generált SVG-minták a folytonosság tesztelésére.',
    keywords: [], labelFont: FONTS.neutral,
    patternScale: { large: 1, medium: 1, small: 1 },
  },
];

export const COLORWAYS = {
  cyan: { name: 'Cián', hex: '#22d3ee' },
  'neon-green': { name: 'Neon zöld', hex: '#7cf72a' },
  orange: { name: 'Narancs', hex: '#ff6a1a' },
  magenta: { name: 'Magenta', hex: '#f0308a' },
  black: { name: 'Fekete', hex: '#1c1d20' },
  white: { name: 'Fehér', hex: '#eef0f2' },
};

export const DENSITIES = {
  sparse: { name: 'Ritka', hint: 'nagy nyitott felületek – dekk, kormányoszlop' },
  dense: { name: 'Sűrű', hint: 'részletgazdag – kis alkatrészek, csíkok' },
};

export function getCategory(id) {
  return PATTERN_CATEGORIES.find((c) => c.id === id) ?? PATTERN_CATEGORIES[0];
}
