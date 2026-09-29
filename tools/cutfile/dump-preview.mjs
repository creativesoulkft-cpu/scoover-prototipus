/**
 * A modell előnézeti darabjai (vázlat + fotó + taposó felülnézet) JSON-ban –
 * a vágófájl-illesztő (cutfile.py) ezekhez méri a vágóív darabjait.
 * Futtatás: node tools/cutfile/dump-preview.mjs <modell-id>
 */
import { getFootboardFlat } from '../../src/data/footboardFlat.js';

const id = process.argv[2];
const model = (await import(`../../src/data/models/${id}.js`)).default;
const pick = (p) => ({ id: p.id, name: p.name, d: p.d, priceGroup: p.priceGroup ?? null, footboard: Boolean(p.footboard), size: p.size ?? 'medium' });
const fb = getFootboardFlat(model);
process.stdout.write(JSON.stringify({
  id, name: model.name,
  schematic: { viewBox: model.viewBox, pieces: model.pieces.map(pick) },
  photo: model.photoView ? { viewBox: model.photoView.viewBox, pieces: model.photoView.pieces.map(pick) } : null,
  footboard: { viewBox: fb.viewBox, pieces: [{ ...pick(fb.piece), footboard: true }] },
}));
