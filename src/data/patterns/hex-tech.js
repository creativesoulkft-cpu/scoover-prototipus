/**
 * Hex-tech – geometrikus hatszögrács neon-kiemeléssel.
 * A csempe 2×2 hatszögcellát tartalmaz, hogy egyes cellákat ki lehessen tölteni
 * anélkül, hogy minden cella egyforma lenne.
 */
import { hexPath } from './_helpers.js';

const s = 14; // hatszög sugara
const w = Math.sqrt(3) * s; // egy cella szélessége
const W = 2 * w;
const H = 6 * s;
const ACCENT = '#19e6c1';

const rows = [
  { y: s, xs: [w / 2, 1.5 * w] },
  { y: 2.5 * s, xs: [0, w, W] },
  { y: 4 * s, xs: [w / 2, 1.5 * w] },
  { y: 5.5 * s, xs: [0, w, W] },
  { y: -0.5 * s, xs: [0, w, W] }, // felső szél lezárása (wrap)
];

let markup = `<rect width="${W}" height="${H}" fill="#0b1220"/>`;
for (const row of rows) {
  for (const x of row.xs) {
    markup += `<path d="${hexPath(x, row.y, s - 1.2)}" fill="none" stroke="${ACCENT}" stroke-opacity="0.55" stroke-width="1.1"/>`;
  }
}
// néhány kitöltött cella a "tech" hatásért
markup += `<path d="${hexPath(1.5 * w, 4 * s, s - 2.5)}" fill="${ACCENT}" fill-opacity="0.28"/>`;
markup += `<path d="${hexPath(w, 2.5 * s, s - 2.5)}" fill="${ACCENT}" fill-opacity="0.12"/>`;
markup += `<path d="${hexPath(w / 2, s, s - 6)}" fill="none" stroke="${ACCENT}" stroke-opacity="0.9" stroke-width="1"/>`;

export default {
  id: 'hex-tech',
  name: 'Hex-tech',
  category: 'tech',
  type: 'tile',
  tile: { width: W, height: H, markup },
};
