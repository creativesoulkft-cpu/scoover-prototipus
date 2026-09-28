/**
 * Nyomdai mesterek ellenőrzése: melyik PRINT mintának van nyomdai
 * felbontású csempéje a server/print/assets/patterns mappában, és eléri-e a
 * 300 dpi-hez szükséges pixelméretet.
 *
 * Futtatás a server mappából:  npm run check-print-assets
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sizeOf from '../server/node_modules/image-size/dist/index.js';
import { PATTERNS } from '../src/data/patterns/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, process.env.PRINT_ASSETS_DIR ? resolve('server', process.env.PRINT_ASSETS_DIR) : 'server/print/assets');
const MM_PER_UNIT = 1.2;
const DPI = Number(process.env.PRINT_DPI ?? 300);
let missing = 0;

console.log(`Mesterek mappája: ${assets}/patterns\n`);
for (const p of PATTERNS.filter((x) => x.type === 'image-tile')) {
  const tileMm = p.tile * MM_PER_UNIT;
  const needPx = Math.ceil((tileMm / 25.4) * DPI);
  const file = ['png', 'jpg', 'jpeg', 'webp'].map((e) => join(assets, 'patterns', `${p.id}.${e}`)).find(existsSync);
  if (!file) {
    missing++;
    console.log(`✗ ${p.id.padEnd(28)} NINCS mester – kell: ≥ ${needPx} px (csempe ${Math.round(tileMm)} mm @ ${DPI} dpi)`);
    continue;
  }
  const dim = sizeOf(readFileSync(file));
  const dpi = Math.round((dim.width / tileMm) * 25.4);
  const ok = dim.width >= needPx;
  console.log(`${ok ? '✓' : '!'} ${p.id.padEnd(28)} ${dim.width}×${dim.height} px → ${dpi} dpi${ok ? '' : ` (kevés, kell ≥ ${needPx} px)`}`);
}
console.log(`\n${missing ? `${missing} mintának nincs mestere – ezekhez az előnézeti WebP megy figyelmeztetéssel.` : 'Minden mintának van mestere.'}`);
