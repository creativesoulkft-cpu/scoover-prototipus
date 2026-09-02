/**
 * Topo – szintvonalas (térképszerű) szerves minta: két "domb" köré rajzolt,
 * egyre nagyobb, azonos alakú foltkontúrok.
 */
import { rng, blobPoints, smoothClosedPath, wrapTile } from './_helpers.js';

const W = 220;
const H = 220;
const random = rng(7);
const hills = [
  { cx: 60, cy: 70 },
  { cx: 165, cy: 150 },
];

let lines = '';
for (const hill of hills) {
  // ugyanaz az alak, 6 különböző méretben → koncentrikus szintvonalak
  const base = blobPoints(0, 0, 18, 9, random);
  for (let k = 1; k <= 6; k++) {
    const pts = base.map(([x, y]) => [hill.cx + x * k, hill.cy + y * k]);
    lines += `<path d="${smoothClosedPath(pts)}" fill="none" stroke="#d9c7a0" stroke-opacity="${0.9 - k * 0.1}" stroke-width="1.2"/>`;
  }
}

export default {
  id: 'topo-lines',
  name: 'Topo vonalak',
  category: 'organic',
  type: 'tile',
  tile: {
    width: W,
    height: H,
    markup: `<rect width="${W}" height="${H}" fill="#1f3a2e"/>` + wrapTile(lines, W, H),
  },
};
