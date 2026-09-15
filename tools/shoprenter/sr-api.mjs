#!/usr/bin/env node
// Shoprenter API segéd – kategóriák, termékek lekérése, termékfeltöltés.
//
// Környezeti változók (a script SOHA nem írja ki őket):
//   SHOPRENTER_SHOP           bolt neve (alapértelmezés: elektromosroller  →  elektromosroller.api.myshoprenter.hu)
//   SHOPRENTER_API_USER       régi (Basic auth) API felhasználó  – Beállítások > API
//   SHOPRENTER_API_PASSWORD   régi (Basic auth) API jelszó
//   SHOPRENTER_CLIENT_ID      új OAuth API-kliens azonosító (Beállítások > API beállítások)
//   SHOPRENTER_CLIENT_SECRET  új OAuth API-kliens titok
// Ha CLIENT_ID+SECRET meg van adva, az új api2 végpontot (Bearer token) használja,
// különben a régi Basic auth-os api.myshoprenter.hu végpontot.
//
// Használat:
//   node tools/shoprenter/sr-api.mjs check                    – hitelesítés próbája
//   node tools/shoprenter/sr-api.mjs languages                – nyelvek (id kell a leírásokhoz)
//   node tools/shoprenter/sr-api.mjs categories [--json]      – teljes kategóriafa
//   node tools/shoprenter/sr-api.mjs products [N] [--json]    – első N termék (alap: 2)
//   node tools/shoprenter/sr-api.mjs product <SKU> [--json]   – egy termék SKU alapján
//   node tools/shoprenter/sr-api.mjs create <file.json> [--dry-run] – termék létrehozása (productExtend POST)
//   node tools/shoprenter/sr-api.mjs update <id> <file.json>  – termék módosítása (productExtend PUT)
//   node tools/shoprenter/sr-api.mjs get <path>               – tetszőleges GET (pl. taxClasses, manufacturers)

import { readFile } from 'node:fs/promises';

const SHOP = process.env.SHOPRENTER_SHOP || 'elektromosroller';
const RATE_DELAY_MS = 350; // limit: 3 kérés/mp

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const positional = args.filter((a) => !a.startsWith('--'));
const [cmd, ...rest] = positional;
const asJson = flags.has('--json');

// ---------- hitelesítés ----------
let base;
let authHeader;

async function initAuth() {
  const cid = process.env.SHOPRENTER_CLIENT_ID;
  const csec = process.env.SHOPRENTER_CLIENT_SECRET;
  if (cid && csec) {
    base = `https://${SHOP}.api2.myshoprenter.hu/api`;
    const r = await fetch(`https://oauth.app.shoprenter.net/${SHOP}/app/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ grant_type: 'client_credentials', client_id: cid, client_secret: csec }),
    });
    if (!r.ok) throw new Error(`OAuth token hiba: HTTP ${r.status} ${(await r.text()).slice(0, 300)}`);
    const tok = await r.json();
    authHeader = `Bearer ${tok.access_token}`;
    return `OAuth (api2), token ${tok.expires_in}s-ig érvényes`;
  }
  const user = process.env.SHOPRENTER_API_USER;
  const pass = process.env.SHOPRENTER_API_PASSWORD;
  if (!user || !pass) throw new Error('Hiányzik: SHOPRENTER_API_USER + SHOPRENTER_API_PASSWORD (vagy SHOPRENTER_CLIENT_ID + SHOPRENTER_CLIENT_SECRET)');
  if (/^ide_a_|jelsz|password/i.test(pass)) {
    throw new Error('SHOPRENTER_API_PASSWORD placeholder szövegnek tűnik – a valódi API jelszót kell beállítani (Shoprenter admin > Beállítások > API).');
  }
  base = `https://${SHOP}.api.myshoprenter.hu`;
  authHeader = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  return 'Basic auth (api.myshoprenter.hu)';
}

// ---------- HTTP ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastCall = 0;

async function call(method, path, body) {
  const wait = lastCall + RATE_DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
  const url = path.startsWith('http') ? path : `${base}/${path.replace(/^\//, '')}`;
  const r = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (r.status === 401) throw new Error('HTTP 401 – az API hitelesítés nem fogadta el a felhasználó/jelszó párost.');
  if (r.status === 429) throw new Error('HTTP 429 – túl sok kérés, várj és próbáld újra.');
  if (!r.ok) throw new Error(`HTTP ${r.status} ${method} ${url}\n${typeof data === 'string' ? data.slice(0, 800) : JSON.stringify(data, null, 2).slice(0, 800)}`);
  return data;
}

async function getAll(resource, query = '') {
  const items = [];
  let page = 0;
  for (;;) {
    const d = await call('GET', `${resource}?full=1&limit=200&page=${page}${query}`);
    items.push(...(d.items || []));
    const pageCount = Number(d.pageCount || 1);
    page += 1;
    if (page >= pageCount) break;
  }
  return items;
}

// ---------- segédek ----------
const idFromHref = (href) => (href ? href.split('/').pop() : null);
const decodeId = (id) => { try { return Buffer.from(id, 'base64').toString(); } catch { return id; } };

function descName(descs, langPref) {
  if (!Array.isArray(descs) || descs.length === 0) return '';
  if (langPref) {
    const hit = descs.find((d) => idFromHref(d.language?.href) === langPref || d.language?.id === langPref);
    if (hit) return hit.name;
  }
  return descs[0].name;
}

function printCategoryTree(cats) {
  const byId = new Map(cats.map((c) => [c.id, c]));
  const children = new Map();
  for (const c of cats) {
    const pid = c.parentCategory?.id || idFromHref(c.parentCategory?.href) || null;
    const key = pid && byId.has(pid) ? pid : null;
    if (!children.has(key)) children.set(key, []);
    children.get(key).push(c);
  }
  const sortFn = (a, b) => Number(a.sortOrder) - Number(b.sortOrder) || descName(a.categoryDescriptions).localeCompare(descName(b.categoryDescriptions), 'hu');
  const walk = (key, depth) => {
    for (const c of (children.get(key) || []).sort(sortFn)) {
      const name = descName(c.categoryDescriptions) || '(névtelen)';
      const flag = c.status === '1' ? '' : '  [INAKTÍV]';
      console.log(`${'  '.repeat(depth)}- ${name}${flag}   innerId=${c.innerId}  id=${c.id}`);
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
}

function printProduct(p) {
  const name = descName(p.productDescriptions) || '(névtelen)';
  const cats = (p.productCategoryRelations || []).map((r) => r.category?.id || idFromHref(r.category?.href)).filter(Boolean);
  console.log(`\n=== ${name}`);
  console.log(`  sku=${p.sku}  innerId=${p.innerId}  id=${p.id}`);
  console.log(`  ár(nettó)=${p.price}  készlet=${p.stock1}  státusz=${p.status}  rendelhető=${p.orderable}`);
  console.log(`  gyártó=${p.manufacturer?.name ?? idFromHref(p.manufacturer?.href) ?? '-'}  adóosztály=${idFromHref(p.taxClass?.href) ?? p.taxClass?.id ?? '-'}`);
  console.log(`  főkép=${p.mainPicture || '-'}  képek=${(p.productImages || []).length}`);
  console.log(`  kategóriák=${cats.length ? cats.map(decodeId).join(', ') : '-'}`);
  const d = (p.productDescriptions || [])[0];
  if (d?.shortDescription) console.log(`  rövid leírás: ${String(d.shortDescription).replace(/<[^>]+>/g, '').slice(0, 160)}`);
}

// ---------- parancsok ----------
async function main() {
  if (!cmd || flags.has('--help')) {
    console.log(await readFile(new URL(import.meta.url)).then((b) => b.toString().split('\n').filter((l) => l.startsWith('//')).join('\n')));
    return;
  }
  const mode = await initAuth();
  console.error(`# bolt: ${SHOP}  auth: ${mode}`);

  switch (cmd) {
    case 'check': {
      const d = await call('GET', 'products?limit=1');
      console.log(`OK – hitelesítés rendben, termékoldalak száma (limit=1): ${d.pageCount}`);
      return;
    }
    case 'languages': {
      const d = await call('GET', 'languages?full=1');
      const items = d.items || [];
      if (asJson) return console.log(JSON.stringify(items, null, 2));
      for (const l of items) console.log(`- ${l.name} (${l.code})  id=${l.id}`);
      return;
    }
    case 'categories': {
      const cats = await getAll('categoryExtend');
      if (asJson) return console.log(JSON.stringify(cats, null, 2));
      console.log(`Kategóriák: ${cats.length} db\n`);
      printCategoryTree(cats);
      return;
    }
    case 'products': {
      const n = Number(rest[0] || 2);
      const d = await call('GET', `productExtend?full=1&limit=${n}&page=0`);
      const items = d.items || [];
      if (asJson) return console.log(JSON.stringify(items, null, 2));
      console.log(`Összes termékoldal (limit=${n}): ${d.pageCount} – mutatva: ${items.length}`);
      items.forEach(printProduct);
      return;
    }
    case 'product': {
      const sku = rest[0];
      if (!sku) throw new Error('Adj meg SKU-t.');
      const d = await call('GET', `productExtend?full=1&sku=${encodeURIComponent(sku)}`);
      const items = d.items || [];
      if (asJson) return console.log(JSON.stringify(items, null, 2));
      if (!items.length) return console.log('Nincs ilyen SKU.');
      items.forEach(printProduct);
      return;
    }
    case 'create': {
      const file = rest[0];
      if (!file) throw new Error('Adj meg egy JSON fájlt (lásd tools/shoprenter/sample-product.json).');
      const payload = JSON.parse(await readFile(file, 'utf8'));
      if (flags.has('--dry-run')) {
        console.log('DRY-RUN – ez menne POST productExtend-re:\n' + JSON.stringify(payload, null, 2));
        return;
      }
      const d = await call('POST', 'productExtend', payload);
      if (asJson) return console.log(JSON.stringify(d, null, 2));
      console.log('Létrehozva:');
      printProduct(d);
      return;
    }
    case 'update': {
      const [id, file] = rest;
      if (!id || !file) throw new Error('update <id> <file.json>');
      const payload = JSON.parse(await readFile(file, 'utf8'));
      const d = await call('PUT', `productExtend/${id}`, payload);
      if (asJson) return console.log(JSON.stringify(d, null, 2));
      console.log('Módosítva:');
      printProduct(d);
      return;
    }
    case 'get': {
      const d = await call('GET', rest[0] || 'products?limit=1');
      console.log(JSON.stringify(d, null, 2));
      return;
    }
    default:
      throw new Error(`Ismeretlen parancs: ${cmd}`);
  }
}

main().catch((e) => {
  console.error(`HIBA: ${e.message}`);
  process.exit(1);
});
