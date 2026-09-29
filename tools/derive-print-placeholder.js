/**
 * HELYŐRZŐ nyomdai geometria a meglévő vázlatból – amíg nincs valódi vágófájl.
 *
 * A nyomdai pipeline (server/print) milliméteres, síkba terített darab-
 * kontúrokból dolgozik (src/data/models/<id>.print.js). A valódi vágófájlt a
 * tools/import-cutfile.js importálja; addig ez a szkript a vázlat darabjaiból
 * készít közelítést, hogy a teljes lánc (recept → render → PDF + CutContour)
 * végig futtatható és tesztelhető legyen.
 *
 *   - vázlat-egység → mm: MM_PER_UNIT (1 egység ≈ 1,2 mm, a G2 dekkhosszából)
 *   - minden darab saját origójú path mm-ben, plusz a vázlat/fotó nézetből
 *     ide mutató affin leképezés (previewMaps) – a minta ezen keresztül kerül
 *     pontosan oda, ahol a vevő az előnézetben látta
 *   - a taposó a footboardFlat (mm) kontúrját kapja, identikus leképezéssel
 *
 * A kimenet `source: 'placeholder'` jelölést kap: a munkalapon és a
 * manifestben figyelmeztetés jelzi, hogy NEM gyártási pontosságú.
 *
 * Futtatás:  node tools/derive-print-placeholder.js
 */
import { writeFileSync } from 'node:fs';
import { pathBounds, transformPath, multiply, translateM, scaleM } from '../src/print/pathTransform.js';
import { getFootboardFlat } from '../src/data/footboardFlat.js';

const MM_PER_UNIT = 1.2;
const MODELS = ['kukirin-g2', 'kukirin-g2-master'];

/** Hány példány készül a darabból (bal/jobb oldal), és tükrözött-e a második. */
const QUANTITY_BY_GROUP = {
  'deck-side': { quantity: 2, mirror: true },
  'rear-swingarm': { quantity: 2, mirror: true },
  fork: { quantity: 2, mirror: true },
  battery: { quantity: 1 },
  neck: { quantity: 1 },
  joint: { quantity: 1 },
  stem: { quantity: 1 },
  display: { quantity: 1 },
  'rear-fender': { quantity: 1 },
  'front-fender': { quantity: 1 },
};

const r3 = (n) => Math.round(n * 1000) / 1000;

for (const id of MODELS) {
  const model = (await import(`../src/data/models/${id}.js`)).default;
  const photo = model.photoView;
  const pieces = [];
  const photoScales = [];

  for (const p of model.pieces) {
    if (p.footboard) continue;
    const b = pathBounds(p.d);
    const Ms = multiply(scaleM(MM_PER_UNIT), translateM(-b.x, -b.y));
    const widthMm = r3(b.width * MM_PER_UNIT);
    const heightMm = r3(b.height * MM_PER_UNIT);
    const previewMaps = { schematic: Ms.map(r3) };
    const pp = photo?.pieces.find((q) => q.id === p.id);
    if (pp) {
      const bp = pathBounds(pp.d);
      const sp = Math.min(widthMm / bp.width, heightMm / bp.height);
      photoScales.push(sp);
      const Mp = multiply(translateM((widthMm - bp.width * sp) / 2, (heightMm - bp.height * sp) / 2),
        multiply(scaleM(sp), translateM(-bp.x, -bp.y)));
      previewMaps.photo = Mp.map(r3);
    }
    const q = QUANTITY_BY_GROUP[p.priceGroup] ?? { quantity: 1 };
    pieces.push({
      id: p.id, name: p.name, priceGroup: p.priceGroup ?? null, size: p.size ?? 'medium',
      d: transformPath(p.d, Ms), widthMm, heightMm,
      quantity: q.quantity, mirror: Boolean(q.mirror), previewMaps,
    });
  }

  const fb = getFootboardFlat(model);
  pieces.push({
    id: fb.piece.id, name: fb.piece.name, priceGroup: null, size: 'medium', footboard: true,
    d: fb.piece.d, widthMm: fb.widthMm, heightMm: fb.heightMm,
    quantity: 1, mirror: false, previewMaps: { footboard: [1, 0, 0, 1, 0, 0] },
  });

  const photoMm = photoScales.length ? photoScales.sort((a, b) => a - b)[Math.floor(photoScales.length / 2)] : null;
  const out = `/**
 * ${model.name} – NYOMDAI GEOMETRIA (mm).
 *
 * GENERÁLT, HELYŐRZŐ fájl (tools/derive-print-placeholder.js): a vázlat
 * darabjaiból közelített kontúrok, 1 vázlat-egység = ${MM_PER_UNIT} mm. NEM gyártási
 * pontosságú – a valódi vágóív (tools/cutfile/cutfile.py) felülírja: ha van
 * server/print/models/<id>.print.json, a render azt használja.
 *
 * Darab-mezők: id (= a modell darab-id-ja), d (mm, saját origó), widthMm,
 * heightMm, quantity (bal/jobb), mirror (a 2. példány tükrözött),
 * previewMaps.<nézet>: affin mátrix [a,b,c,d,e,f] a nézet egységeiből ebbe
 * a mm-es térbe – a minta ezen keresztül kerül pontosan oda, ahol a vevő látta.
 */
export default ${JSON.stringify({
    model: id,
    source: 'placeholder',
    sourceFile: null,
    generatedAt: new Date().toISOString(),
    unit: 'mm',
    bleedMm: 3,
    safeMm: 2,
    mmPerUnit: { schematic: MM_PER_UNIT, photo: photoMm ? r3(photoMm) : null, footboard: 1 },
    pieces,
  }, null, 2)};
`;
  writeFileSync(new URL(`../server/print/placeholders/${id}.print.js`, import.meta.url), out);
  console.log(`${id}: ${pieces.length} darab → server/print/placeholders/${id}.print.js · mmPerUnit photo ≈ ${photoMm ? r3(photoMm) : '–'}`);
  for (const p of pieces) console.log(`   ${p.id.padEnd(14)} ${String(p.widthMm).padStart(7)} × ${String(p.heightMm).padStart(7)} mm ×${p.quantity}`);
}
