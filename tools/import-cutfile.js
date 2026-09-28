/**
 * VALÓDI VÁGÓFÁJL IMPORTÁLÁSA → src/data/models/<id>.print.js
 *
 * A plotteres/Illustrator munkafolyamatból exportált SVG-t alakítja a
 * konfigurátor nyomdai geometriájává. Elvárások a vágófájllal szemben
 * (lásd docs/print-pipeline.md, "Vágófájl-követelmények"):
 *
 *   - SVG, 1 felhasználói egység = 1 mm (viewBox mm-ben; a width/height
 *     "…mm" is lehet – csak a viewBox számít), MINDEN transform kilapítva
 *     (Illustrator: Object → Expand / "Flatten transforms" export-beállítás)
 *   - minden fóliadarab egy zárt <path>, id="<darab-id>" ahol a darab-id a
 *     modell darabjának id-ja (kukirin-g2.js: deck-side, stem, …, deck-top)
 *   - bal/jobb páros darabból CSAK a bal oldalit kell megrajzolni (a jobb a
 *     tükörképe – quantity/mirror a QUANTITY táblából); ha a jobb oldali
 *     eltér, rajzold külön `<id>-R` id-val, akkor azt használjuk
 *   - opcionális: <path id="<darab-id>__safe"> biztonsági zóna (nem kötelező)
 *
 * A vázlat/fotó nézet → mm leképezést (previewMaps) a befoglaló dobozok
 * egyenletes, középre igazított illesztéséből számoljuk: a minta így ugyanoda
 * kerül, ahol a vevő az előnézetben látta (a kontúr pontos, az illesztés
 * legfeljebb a darab arányainak eltérése miatt "húz" egy kicsit – ezt a
 * manifest jelzi, ha 5%-nál nagyobb).
 *
 * Futtatás:  node tools/import-cutfile.js <modell-id> <vágófájl.svg> [--bleed 3]
 * Példa:     node tools/import-cutfile.js kukirin-g2 tools/cutfiles/kukirin-g2-2025.svg
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathBounds, transformPath, multiply, translateM, scaleM, parseTransform, parsePath, serializePath } from '../src/print/pathTransform.js';
import { getFootboardFlat } from '../src/data/footboardFlat.js';

const [modelId, file, ...rest] = process.argv.slice(2);
if (!modelId || !file) {
  console.error('Használat: node tools/import-cutfile.js <modell-id> <vágófájl.svg> [--bleed 3]');
  process.exit(1);
}
const bleedMm = Number(rest[rest.indexOf('--bleed') + 1]) || 3;

const QUANTITY_BY_GROUP = {
  'deck-side': { quantity: 2, mirror: true }, 'rear-swingarm': { quantity: 2, mirror: true }, fork: { quantity: 2, mirror: true },
};

const model = (await import(`../src/data/models/${modelId}.js`)).default;
const svg = readFileSync(file, 'utf8');

// --- SVG darabok kinyerése (path id + d, illetve polygon/rect – a vágófájlok szinte mindig path-ok) ---
const elements = [];
for (const m of svg.matchAll(/<(path|polygon|rect)\b([^>]*?)\/?>/g)) {
  const attrs = Object.fromEntries([...m[2].matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)].map((a) => [a[1], a[2]]));
  if (!attrs.id) continue;
  let d = attrs.d;
  if (m[1] === 'polygon' && attrs.points) {
    const pts = (attrs.points.match(/-?[\d.]+/g) ?? []).map(Number);
    d = `M ${pts[0]} ${pts[1]} ${pts.slice(2).reduce((s, v, i) => s + (i % 2 ? ` ${v}` : ` L ${v}`), '')} Z`;
  } else if (m[1] === 'rect') {
    const x = Number(attrs.x ?? 0), y = Number(attrs.y ?? 0), w = Number(attrs.width), h = Number(attrs.height);
    d = `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
  }
  if (!d) continue;
  if (attrs.transform) d = transformPath(d, parseTransform(attrs.transform));
  elements.push({ id: attrs.id, d });
}
if (!elements.length) { console.error('A fájlban nincs id-val ellátott <path>/<polygon>/<rect>.'); process.exit(1); }

const r3 = (n) => Math.round(n * 1000) / 1000;
const pieces = [];
const notes = [];
for (const p of model.pieces) {
  const el = elements.find((e) => e.id === p.id);
  if (!el) { notes.push(`HIÁNYZIK a vágófájlból: ${p.id} (${p.name})`); continue; }
  const b = pathBounds(el.d);
  const toOrigin = translateM(-b.x, -b.y);
  const d = serializePath(parsePath(transformPath(el.d, toOrigin)));
  const widthMm = r3(b.width), heightMm = r3(b.height);
  const previewMaps = {};
  const fit = (previewD) => {
    const pb = pathBounds(previewD);
    const s = Math.min(widthMm / pb.width, heightMm / pb.height);
    const ratioDiff = Math.abs((widthMm / heightMm) / (pb.width / pb.height) - 1);
    if (ratioDiff > 0.05) notes.push(`${p.id}: az előnézet és a vágókontúr aránya ${Math.round(ratioDiff * 100)}%-kal eltér – a minta illesztése közelítő.`);
    return multiply(translateM((widthMm - pb.width * s) / 2, (heightMm - pb.height * s) / 2), multiply(scaleM(s), translateM(-pb.x, -pb.y))).map(r3);
  };
  if (p.footboard) previewMaps.footboard = [1, 0, 0, 1, 0, 0];
  else {
    previewMaps.schematic = fit(p.d);
    const pp = model.photoView?.pieces.find((q) => q.id === p.id);
    if (pp) previewMaps.photo = fit(pp.d);
  }
  const q = QUANTITY_BY_GROUP[p.priceGroup] ?? { quantity: 1 };
  const right = elements.find((e) => e.id === `${p.id}-R`);
  pieces.push({
    id: p.id, name: p.name, priceGroup: p.priceGroup ?? null, size: p.size ?? 'medium', footboard: Boolean(p.footboard) || undefined,
    d, widthMm, heightMm, quantity: q.quantity, mirror: Boolean(q.mirror) && !right, previewMaps,
    ...(right ? { rightD: serializePath(parsePath(transformPath(right.d, translateM(-pathBounds(right.d).x, -pathBounds(right.d).y)))) } : {}),
  });
}
// taposó: ha a vágófájlban nincs, a footboardFlat-ból (mm) jön
if (!pieces.some((p) => p.footboard)) {
  const fb = getFootboardFlat(model);
  pieces.push({ id: fb.piece.id, name: fb.piece.name, priceGroup: null, size: 'medium', footboard: true,
    d: fb.piece.d, widthMm: fb.widthMm, heightMm: fb.heightMm, quantity: 1, mirror: false, previewMaps: { footboard: [1, 0, 0, 1, 0, 0] } });
  notes.push('A taposó (deck-top) kontúrja nem a vágófájlból, hanem a footboardFlat közelítésből jött.');
}

const schematicScales = pieces.filter((p) => p.previewMaps.schematic).map((p) => Math.hypot(p.previewMaps.schematic[0], p.previewMaps.schematic[1]));
const photoScales = pieces.filter((p) => p.previewMaps.photo).map((p) => Math.hypot(p.previewMaps.photo[0], p.previewMaps.photo[1]));
const median = (a) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : null);

const out = `/**
 * ${model.name} – NYOMDAI GEOMETRIA (mm), a valódi vágófájlból.
 *
 * GENERÁLT fájl: tools/import-cutfile.js ${modelId} ${file}
 * Kézzel ne szerkeszd – a vágófájl változásakor futtasd újra az importot.
 * Mezők: lásd tools/derive-print-placeholder.js fejlécét (ugyanaz a szerkezet).
 */
export default ${JSON.stringify({
  model: modelId, source: 'cutfile', sourceFile: file, generatedAt: new Date().toISOString(), unit: 'mm', bleedMm, safeMm: 2,
  mmPerUnit: { schematic: r3(median(schematicScales)), photo: photoScales.length ? r3(median(photoScales)) : null, footboard: 1 },
  notes, pieces,
}, null, 2)};
`;
writeFileSync(new URL(`../src/data/models/${modelId}.print.js`, import.meta.url), out);
console.log(`Kész: src/data/models/${modelId}.print.js – ${pieces.length} darab.`);
for (const p of pieces) console.log(`  ${p.id.padEnd(14)} ${String(p.widthMm).padStart(8)} × ${String(p.heightMm).padStart(8)} mm ×${p.quantity}${p.mirror ? ' (tükör)' : ''}`);
if (notes.length) { console.log('\nMegjegyzések:'); for (const n of notes) console.log(`  - ${n}`); }
console.log(`\nFrissítsd a src/data/models/index.js printScale mezőjét: schematic ${r3(median(schematicScales))}, photo ${photoScales.length ? r3(median(photoScales)) : '–'}`);
