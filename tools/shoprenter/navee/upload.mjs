// Navee termékek feltöltése: termék + attribútumok + képek + galéria.
// Használat: node tools/shoprenter/navee/upload.mjs <termekek-mappa> [--only=gt3,st3]
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const DIR = process.argv[2];
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const meta = JSON.parse(readFileSync(path.join(DIR, '_navee_meta.json'), 'utf8'));
const shop = process.env.SHOPRENTER_SHOP || 'elektromosroller';
const base = `https://${shop}.api2.myshoprenter.hu/api`;
const b64 = (s) => Buffer.from(s).toString('base64');
const wait = (ms = 380) => new Promise((r) => setTimeout(r, ms));

const tokRes = await fetch(`https://oauth.app.shoprenter.net/${shop}/app/token`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ grant_type: 'client_credentials', client_id: process.env.SHOPRENTER_CLIENT_ID, client_secret: process.env.SHOPRENTER_CLIENT_SECRET }),
});
const tok = (await tokRes.json()).access_token;
const H = { Authorization: 'Bearer ' + tok, Accept: 'application/json', 'Content-Type': 'application/json' };
const call = async (m, p, b) => {
  const res = await fetch(base + '/' + p, { method: m, headers: H, body: b ? JSON.stringify(b) : undefined });
  const t = await res.text(); await wait();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  return [res.status, j];
};

const osszes = [];
for (const [k, info] of Object.entries(meta)) {
  if (only.length && !only.includes(k)) continue;
  const payload = JSON.parse(readFileSync(path.join(DIR, `navee-${k}.json`), 'utf8'));
  const [st, prod] = await call('GET', `products?sku=${encodeURIComponent(info.sku)}`);
  if ((prod.items || []).length) { console.log(`- ${info.sku}: már létezik, kihagyva`); continue; }
  const [cs, created] = await call('POST', 'productExtend', payload);
  if (cs >= 300) { console.log(`! ${info.sku}: HIBA ${cs} ${JSON.stringify(created).slice(0, 200)}`); continue; }
  const PID = created.id;
  let ok = 0, hiba = 0;
  for (const [aid, val] of Object.entries(info.attr.nums)) {
    const [s] = await call('POST', 'numberAttributeValues', { value: String(val), numberAttribute: { id: b64(`numberAttribute-attribute_id=${aid}`) }, product: { id: PID } });
    s < 300 ? ok++ : hiba++;
  }
  for (const [aid, vid] of info.attr.lists) {
    const [s] = await call('POST', 'productListAttributeValueRelations', { product: { id: PID }, listAttributeValue: { id: b64(`listAttributeValue-attribute_id=${aid}&value_id=${vid}`) } });
    s < 300 ? ok++ : hiba++;
  }
  const dir = path.join(DIR, 'kepek', `navee-${k}`);
  let kepek = 0;
  try {
    const files = readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f)).sort();
    for (const [i, f] of files.entries()) {
      const [s] = await call('POST', 'files', { filePath: `product/navee-${k}/${f}`, type: 'image', attachment: readFileSync(path.join(dir, f)).toString('base64') });
      if (s >= 300) continue;
      kepek++;
      if (i > 0) await call('POST', 'productImages', { imagePath: `product/navee-${k}/${f}`, sortOrder: String(i), product: { id: PID } });
    }
  } catch (e) { console.log(`  (kép hiba: ${e.message})`); }
  console.log(`+ ${info.sku.padEnd(24)} innerId=${String(created.innerId).padEnd(5)} attr ${ok}/${ok + hiba}  kép ${kepek}`);
  osszes.push({ k, sku: info.sku, id: PID, innerId: created.innerId, ar: info.ar, becsult: info.becsult, kepek });
}
console.log('\nÖSSZESEN:', osszes.length, 'termék');
console.log(JSON.stringify(osszes));
