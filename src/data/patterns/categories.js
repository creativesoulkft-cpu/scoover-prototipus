/**
 * Mintataxonómia: termékvonalak, stíluskategóriák, színvariánsok, sűrűség.
 *
 * ÚJ KATEGÓRIA (pl. organic, y2k, urban-camo) felvétele: állítsd `available: true`-ra
 * a lenti bejegyzést (vagy vegyél fel újat), és add hozzá a mintafájlokat
 * `category: '<id>'` mezővel. A galéria és a feliratréteg ebből dolgozik,
 * kódmódosítás nem kell.
 */

/**
 * Termékvonalak: SOLID = egyszínű vágott vinyl, PRINT = nyomtatott mintás fólia,
 * GRIP = strukturált csúszásgátló fólia (csak a taposófelületre).
 * `tagline`: rövid, laikusnak szóló magyarázat a galéria fülei alatt.
 */
export const PRODUCT_LINES = [
  { id: 'solid', name: 'SOLID', tagline: 'Egyszínű, sima fólia', description: 'Egyszínű, nyomtatás nélküli vágott fólia' },
  { id: 'print', name: 'PRINT', tagline: 'Mintás, nyomtatott fólia', description: 'Nyomtatott, mintás fólia' },
  { id: 'grip', name: 'GRIP', tagline: 'Csúszásgátló, strukturált fólia', description: 'Domborított mintázatú, csúszásgátló felületű fólia – kizárólag az állófelülethez' },
];

/**
 * Felirat-betűstílusok kategóriánként (Google Fonts, index.html-ben betöltve).
 * `glyph`: átlagos betűszélesség em-ben – a felirat automatikus méretezéséhez.
 */
const FONTS = {
  cyber: { family: 'Orbitron', weight: 900, letterSpacing: '0.14em', glyph: 0.9, skew: 0 },
  motocross: { family: 'Anton', weight: 400, letterSpacing: '0.05em', glyph: 0.5, skew: -10 },
  neutral: { family: 'Rajdhani', weight: 700, letterSpacing: '0.1em', glyph: 0.56, skew: 0 },
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
  // --- prototípus-minták (procedurális SVG, a renderelő képességeinek demója) ---
  {
    id: 'demo', line: 'print', name: 'Demó (procedurális)', available: true,
    description: 'Kliens oldalon generált SVG-minták a folytonosság tesztelésére.',
    keywords: [], labelFont: FONTS.neutral,
    patternScale: { large: 1, medium: 1, small: 1 },
  },
  // --- GRIP: csúszásgátló taposófelület-minták (procedurális SVG, induló készlet) ---
  {
    id: 'antislip', line: 'grip', name: 'Csúszásgátló', available: true,
    description: 'Domborított, recézett felület – biztos állás minden időjárásban.',
    keywords: ['csúszásgátló', 'anti-slip', 'recézett', 'taposófelület'],
    labelFont: FONTS.neutral,
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
