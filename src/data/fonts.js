/**
 * Felirat-betűtípus regiszter – Google Fonts-ról (index.html-ben betöltve,
 * lásd tools/build-singlefile.mjs is, ahol a linknek egyeznie kell).
 *
 * `glyph`: átlagos betűszélesség em-ben – a felirat automatikus méretezéséhez
 * (LabelLayer.jsx). `skew`: opcionális dőlés fokban.
 *
 * A minta-kategóriák (categories.js) ebből választanak alapértelmezettet
 * (`labelFont`), de bármelyik felirat felülbírálhatja ezt egy saját
 * `fontId`-val (LabelControls.jsx) – innen, ugyanebből a listából.
 */
export const FONT_OPTIONS = [
  { id: 'orbitron', name: 'Orbitron', family: 'Orbitron', weight: 900, letterSpacing: '0.14em', glyph: 0.9, skew: 0 },
  { id: 'anton', name: 'Anton', family: 'Anton', weight: 400, letterSpacing: '0.05em', glyph: 0.5, skew: -10 },
  { id: 'bebas', name: 'Bebas Neue', family: 'Bebas Neue', weight: 400, letterSpacing: '0.08em', glyph: 0.48, skew: 0 },
  { id: 'rajdhani', name: 'Rajdhani', family: 'Rajdhani', weight: 700, letterSpacing: '0.1em', glyph: 0.56, skew: 0 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700, letterSpacing: '0.06em', glyph: 0.5, skew: 0 },
  { id: 'teko', name: 'Teko', family: 'Teko', weight: 600, letterSpacing: '0.05em', glyph: 0.46, skew: 0 },
];

export function getFontOption(id) {
  return FONT_OPTIONS.find((f) => f.id === id) ?? null;
}
