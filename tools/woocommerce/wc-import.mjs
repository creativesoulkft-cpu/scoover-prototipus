#!/usr/bin/env node
// Shoprenter → WooCommerce importáló.
//
// Bemenet: az sr-export.mjs által mentett export/shoprenter/*.json fájlok.
// Kimenet: termékek, kategóriák, gyártók a WooCommerce boltba, REST API-n keresztül.
//
// Környezeti változók:
//   WC_URL        a bolt címe, pl. https://www.elektromos-roller.net
//   WC_KEY        WooCommerce REST API consumer key (ck_...)
//   WC_SECRET     WooCommerce REST API consumer secret (cs_...)
//
// Parancsok:
//   node tools/woocommerce/wc-import.mjs fields              – a Shoprenter JSON mezőinek listája (mapping ellenőrzéshez)
//   node tools/woocommerce/wc-import.mjs check               – kapcsolat és WooCommerce-verzió
//   node tools/woocommerce/wc-import.mjs categories          – kategóriafa
//   node tools/woocommerce/wc-import.mjs brands              – gyártók (márkák)
//   node tools/woocommerce/wc-import.mjs products [N]        – termékek (N: csak az első N, teszthez)
//   node tools/woocommerce/wc-import.mjs redirects           – 301 átirányítási CSV a régi URL-ekről
//   node tools/woocommerce/wc-import.mjs all                 – kategóriák + márkák + termékek
//
// Kapcsolók:
//   --dry-run                 semmit nem küld, csak kiírja az első pár átalakított terméket
//   --price=gross|net         a WooCommerce bruttó (alap) vagy nettó árat kap
//   --vat=27                  alapértelmezett ÁFA-kulcs, ha az adóosztályból nem derül ki
//   --status=draft|publish    a feltöltött termék állapota (alap: a Shoprenter státusza szerint)
//   --image-base=<url>        a képek URL-gyöke, amit a WooCommerce letölt (alap: a régi bolt)
//   --no-images               képek nélkül (gyors első kör)
//   --force                   a már importált tételek újraküldése

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';

const IN = path.resolve('export/shoprenter');
const OUT = path.resolve('export/woocommerce');
const STATE_FILE = path.join(OUT, 'state.json');
const BATCH = 50;

const argv = process.argv.slice(2);
const flags = new Map(
  argv.filter((a) => a.startsWith('--')).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const positional = argv.filter((a) => !a.startsWith('--'));
const cmd = positional[0] || 'check';

const DRY = flags.has('dry-run');
const FORCE = flags.has('force');
const PRICE_MODE = flags.get('price') || 'gross';
const DEFAULT_VAT = Number(flags.get('vat') || 27);
const WITH_IMAGES = !flags.has('no-images');
const SHOP = process.env.SHOPRENTER_SHOP || 'elektromosroller';
const IMAGE_BASE = String(flags.get('image-base') || `https://www.elektromos-roller.net/custom/${SHOP}/image/data/`).replace(/\/?$/, '/');

// ---------- WooCommerce REST ----------
const WC_URL = (process.env.WC_URL || '').replace(/\/+$/, '');
const WC_KEY = process.env.WC_KEY || '';
const WC_SECRET = process.env.WC_SECRET || '';

async function wc(method, endpoint, body, attempt = 0) {
  if (!WC_URL || !WC_KEY || !WC_SECRET) throw new Error('Hiányzik: WC_URL, WC_KEY, WC_SECRET környezeti változó.');
  const url = `${WC_URL}/wp-json/${endpoint.replace(/^\//, '')}`;
  const r = await fetch(url, {
    method,
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64'),
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if ((r.status === 429 || r.status >= 500) && attempt < 4) {
    const wait = 3000 * 2 ** attempt;
    console.log(`  HTTP ${r.status} – újra ${wait / 1000}s múlva…`);
    await new Promise((res) => setTimeout(res, wait));
    return wc(method, endpoint, body, attempt + 1);
  }
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (r.status === 401) throw new Error('HTTP 401 – a WooCommerce kulcs nem jó, vagy a szerver levágja az Authorization fejlécet.\n  → A WooCommerce > Beállítások > Haladó > REST API oldalon Olvasás/Írás joggal hozz létre kulcsot.');
  if (!r.ok) throw new Error(`HTTP ${r.status} ${method} ${endpoint}\n${typeof data === 'string' ? data.slice(0, 600) : JSON.stringify(data).slice(0, 600)}`);
  return data;
}

// ---------- segédek ----------
const exists = (p) => access(p).then(() => true, () => false);
const idFromHref = (href) => (href ? String(href).split('/').pop() : null);
const srId = (o) => o?.id || idFromHref(o?.href) || null;

async function load(file, required = true) {
  const p = path.join(IN, file);
  if (!(await exists(p))) {
    if (required) throw new Error(`Hiányzik: ${p}\n  → Előbb futtasd: node tools/shoprenter/sr-export.mjs`);
    return null;
  }
  return JSON.parse(await readFile(p, 'utf8'));
}

let state = { categories: {}, brands: {}, products: {}, attributes: {} };
async function loadState() {
  if (await exists(STATE_FILE)) state = { ...state, ...JSON.parse(await readFile(STATE_FILE, 'utf8')) };
}
async function saveState() {
  await mkdir(OUT, { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(state, null, 1));
}

// A Shoprenter a szöveges mezőket nyelvenként külön sorban adja.
function pickDesc(list, field) {
  if (!Array.isArray(list) || !list.length) return '';
  const hu = list.find((d) => /hu/i.test(String(d.language?.name || d.language?.code || ''))) || list[0];
  return hu?.[field] ?? '';
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[áà]/g, 'a').replace(/[éè]/g, 'e').replace(/[íì]/g, 'i')
    .replace(/[óòöő]/g, 'o').replace(/[úùüű]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 190);
}

// ---------- ÁFA ----------
let taxRateById = new Map();
async function buildTaxMap() {
  const list = (await load('taxClasses.json', false)) || [];
  for (const t of list) {
    const rates = t.taxRates || t.taxRate || [];
    const arr = Array.isArray(rates) ? rates : [rates];
    const rate = arr.map((r) => Number(r?.rate ?? r?.value ?? r)).find((n) => Number.isFinite(n) && n > 0);
    taxRateById.set(String(t.id), Number.isFinite(rate) ? rate : DEFAULT_VAT);
    if (t.innerId != null) taxRateById.set(String(t.innerId), Number.isFinite(rate) ? rate : DEFAULT_VAT);
  }
}
const vatFor = (p) => taxRateById.get(String(srId(p.taxClass))) ?? DEFAULT_VAT;

function priceOut(net, vat) {
  const n = Number(net);
  if (!Number.isFinite(n) || n <= 0) return '';
  const val = PRICE_MODE === 'gross' ? Math.round(n * (1 + vat / 100)) : Math.round(n);
  return String(val);
}

// ---------- termék-átalakítás ----------
function productImages(p) {
  if (!WITH_IMAGES) return [];
  const rels = [];
  if (p.mainPicture) rels.push(p.mainPicture);
  for (const img of p.productImages || []) {
    const v = img.imagePath || img.path || img.image || img.picture || (typeof img === 'string' ? img : null);
    if (v) rels.push(v);
  }
  const seen = new Set();
  return rels
    .map((r) => String(r).replace(/^\/+/, ''))
    .filter((r) => /\.(jpe?g|png|gif|webp|avif)$/i.test(r) && !seen.has(r) && seen.add(r))
    .slice(0, 20)
    .map((r) => ({ src: /^https?:/i.test(r) ? r : IMAGE_BASE + r.split('/').map(encodeURIComponent).join('/') }));
}

function productAttributes(p) {
  const out = [];
  const groups = new Map();
  for (const a of p.productAttributes || p.productAttributeValues || []) {
    const name = a.attributeName || a.name || pickDesc(a.attributeDescriptions, 'name');
    const value = a.attributeValue || a.value || pickDesc(a.attributeValueDescriptions, 'name') || a.text;
    if (!name || !value) continue;
    if (!groups.has(name)) groups.set(name, new Set());
    groups.get(name).add(String(value).trim());
  }
  let pos = 0;
  for (const [name, values] of groups) {
    out.push({ name, position: pos++, visible: true, variation: false, options: [...values] });
  }
  return out;
}

function mapProduct(p, catMap, brandNames) {
  const vat = vatFor(p);
  const name = pickDesc(p.productDescriptions, 'name') || p.sku || '(névtelen)';
  const special = Number(p.specialPrice ?? p.price2 ?? (p.productSpecialPrices || [])[0]?.price ?? NaN);
  const stock = Number(p.stock1 ?? p.quantity ?? 0);
  const manufacturer = p.manufacturer?.name || null;

  const wcCats = (p.productCategoryRelations || [])
    .map((r) => catMap.get(String(srId(r.category))))
    .filter(Boolean)
    .map((id) => ({ id }));

  const attributes = productAttributes(p);
  if (manufacturer) {
    brandNames.add(manufacturer);
    attributes.unshift({ name: 'Márka', visible: true, variation: false, options: [manufacturer] });
  }
  attributes.forEach((a, i) => { a.position = i; });

  const out = {
    name,
    type: 'simple',
    sku: p.sku || undefined,
    status: flags.get('status') || (String(p.status) === '1' ? 'publish' : 'draft'),
    catalog_visibility: 'visible',
    description: pickDesc(p.productDescriptions, 'description') || '',
    short_description: pickDesc(p.productDescriptions, 'shortDescription') || '',
    regular_price: priceOut(p.originalPrice ?? p.price, vat),
    manage_stock: true,
    stock_quantity: Number.isFinite(stock) ? stock : 0,
    backorders: String(p.orderable) === '1' ? 'notify' : 'no',
    categories: wcCats,
    attributes,
    images: productImages(p),
    meta_data: [
      { key: '_shoprenter_id', value: String(p.id ?? '') },
      { key: '_shoprenter_inner_id', value: String(p.innerId ?? '') },
    ],
  };

  if (Number.isFinite(special) && special > 0 && special < Number(p.price)) out.sale_price = priceOut(special, vat);
  const weight = Number(p.weight);
  if (Number.isFinite(weight) && weight > 0) out.weight = String(weight);
  const dims = { length: p.length, width: p.width, height: p.height };
  if (Object.values(dims).some((v) => Number(v) > 0)) {
    out.dimensions = { length: String(dims.length || ''), width: String(dims.width || ''), height: String(dims.height || '') };
  }
  return out;
}

// ---------- parancsok ----------
async function cmdFields() {
  for (const f of ['products.json', 'categories.json', 'manufacturers.json', 'taxClasses.json']) {
    const data = await load(f, false);
    if (!data?.length) { console.log(`\n${f}: nincs vagy üres`); continue; }
    const keys = new Set();
    for (const it of data.slice(0, 200)) Object.keys(it).forEach((k) => keys.add(k));
    console.log(`\n${f} – ${data.length} tétel, mezők:`);
    console.log('  ' + [...keys].sort().join(', '));
    console.log('  első tétel (rövidítve):');
    console.log('  ' + JSON.stringify(data[0]).slice(0, 1200));
  }
}

async function cmdCheck() {
  const d = await wc('GET', 'wc/v3/system_status');
  console.log(`OK – WooCommerce ${d.environment?.version}, WP ${d.environment?.wp_version}, PHP ${d.environment?.php_version}`);
  console.log(`  bolt: ${d.environment?.home_url}  |  pénznem: ${d.settings?.currency}  |  ár ÁFÁ-val: ${d.settings?.taxes_enabled ? (d.settings?.prices_include_tax ? 'igen' : 'nem') : 'ÁFA kikapcsolva'}`);
  const counts = await wc('GET', 'wc/v3/products?per_page=1');
  console.log(`  jelenlegi terméksorok: ${Array.isArray(counts) ? counts.length : '?'} (első oldal)`);
}

async function cmdCategories() {
  const cats = await load('categories.json');
  console.log(`Kategóriák: ${cats.length}`);
  // szülő előbb: mélység szerint
  const byId = new Map(cats.map((c) => [String(c.id), c]));
  const depth = (c, seen = new Set()) => {
    const pid = String(srId(c.parentCategory) || '');
    if (!pid || !byId.has(pid) || seen.has(pid)) return 0;
    seen.add(pid);
    return 1 + depth(byId.get(pid), seen);
  };
  const sorted = [...cats].sort((a, b) => depth(a) - depth(b));

  for (const c of sorted) {
    const key = String(c.id);
    if (!FORCE && state.categories[key]) continue;
    const name = pickDesc(c.categoryDescriptions, 'name');
    if (!name) continue;
    const parentSr = String(srId(c.parentCategory) || '');
    const payload = {
      name,
      slug: slugify(name),
      description: pickDesc(c.categoryDescriptions, 'description') || '',
      parent: state.categories[parentSr] || 0,
    };
    if (DRY) { console.log('  DRY', JSON.stringify(payload)); continue; }
    try {
      const r = await wc('POST', 'wc/v3/products/categories', payload);
      state.categories[key] = r.id;
    } catch (e) {
      // már létezik → keressük meg név alapján
      const found = await wc('GET', `wc/v3/products/categories?search=${encodeURIComponent(name)}&per_page=100`);
      const hit = (found || []).find((x) => x.name === name);
      if (hit) state.categories[key] = hit.id;
      else console.log(`  HIBA "${name}": ${e.message.split('\n')[0]}`);
    }
    process.stdout.write(`\r  kész: ${Object.keys(state.categories).length}/${cats.length}   `);
  }
  process.stdout.write('\n');
  await saveState();
}

async function cmdBrands() {
  const mans = (await load('manufacturers.json', false)) || [];
  console.log(`Gyártók: ${mans.length}`);
  if (DRY) { mans.forEach((m) => console.log('  DRY', m.name)); return; }
  let native = true;
  for (const m of mans) {
    const name = m.name || pickDesc(m.manufacturerDescriptions, 'name');
    if (!name || (!FORCE && state.brands[name])) continue;
    if (native) {
      try {
        const r = await wc('POST', 'wc/v3/products/brands', { name, slug: slugify(name) });
        state.brands[name] = r.id;
        continue;
      } catch (e) {
        if (/rest_no_route|404/.test(e.message)) {
          console.log('  A WooCommerce márka-taxonómia nem elérhető, a gyártó a "Márka" tulajdonságba kerül.');
          native = false;
        } else {
          state.brands[name] = 'exists';
        }
      }
    }
  }
  await saveState();
  console.log(`  kész: ${Object.keys(state.brands).length}`);
}

async function cmdProducts(limit) {
  const products = await load('products.json');
  const catMap = new Map(Object.entries(state.categories));
  const brandNames = new Set();
  const todo = products.filter((p) => FORCE || !state.products[String(p.id)]).slice(0, limit || products.length);
  console.log(`Termékek: összesen ${products.length}, most feltöltendő ${todo.length}  (ár: ${PRICE_MODE}, képek: ${WITH_IMAGES ? 'igen' : 'nem'})`);
  if (catMap.size === 0) {
    console.log('  FIGYELEM: még nincs egy kategória sem importálva, a termékek kategória nélkül mennének fel.');
    console.log('  → Előbb: node tools/woocommerce/wc-import.mjs categories');
    if (!DRY && !FORCE) throw new Error('Megszakítva. Ha mégis kategória nélkül akarod, add hozzá: --force');
  }

  if (DRY) {
    for (const p of todo.slice(0, 3)) console.log('\n' + JSON.stringify(mapProduct(p, catMap, brandNames), null, 1).slice(0, 2500));
    console.log(`\n(dry-run: ${todo.length} termék készült volna el)`);
    return;
  }

  let done = 0; let failed = 0;
  const errors = [];
  for (let i = 0; i < todo.length; i += BATCH) {
    const chunk = todo.slice(i, i + BATCH);
    const create = chunk.map((p) => mapProduct(p, catMap, brandNames));
    try {
      const r = await wc('POST', 'wc/v3/products/batch', { create });
      (r.create || []).forEach((res, idx) => {
        if (res.id) { state.products[String(chunk[idx].id)] = res.id; done += 1; }
        else { failed += 1; errors.push(`${chunk[idx].sku}\t${res.error?.message || 'ismeretlen hiba'}`); }
      });
      await saveState();
    } catch (e) {
      failed += chunk.length;
      errors.push(`köteg ${i}\t${e.message.split('\n')[0]}`);
    }
    process.stdout.write(`\r  feltöltve ${done}, hiba ${failed} / ${todo.length}   `);
  }
  process.stdout.write('\n');
  if (errors.length) {
    await mkdir(OUT, { recursive: true });
    await writeFile(path.join(OUT, 'product-errors.txt'), errors.join('\n'));
    console.log(`  ${errors.length} hiba, lista: export/woocommerce/product-errors.txt`);
  }
}

async function cmdRedirects() {
  const aliases = (await load('urlAliases.json', false)) || [];
  const products = (await load('products.json', false)) || [];
  const cats = (await load('categories.json', false)) || [];
  const prodById = new Map(products.map((p) => [String(p.id), p]));
  const prodByInner = new Map(products.map((p) => [String(p.innerId), p]));
  const catById = new Map(cats.map((c) => [String(c.id), c]));
  const catByInner = new Map(cats.map((c) => [String(c.innerId), c]));

  const rows = [['forras_url', 'cel_url', 'tipus']];
  for (const a of aliases) {
    const from = '/' + String(a.keyword || a.alias || '').replace(/^\/+/, '');
    if (from === '/') continue;
    const rid = String(a.resourceId ?? a.resource_id ?? '');
    const type = String(a.resourceType ?? a.resource_type ?? '').toLowerCase();
    let to = null;
    if (type.includes('product')) {
      const p = prodById.get(rid) || prodByInner.get(rid);
      if (p) to = `/termek/${slugify(pickDesc(p.productDescriptions, 'name') || p.sku)}/`;
    } else if (type.includes('categor')) {
      const c = catById.get(rid) || catByInner.get(rid);
      if (c) to = `/termekkategoria/${slugify(pickDesc(c.categoryDescriptions, 'name'))}/`;
    }
    rows.push([from, to || '/', to ? '301' : '301 (ellenőrizendő)']);
  }
  await mkdir(OUT, { recursive: true });
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  await writeFile(path.join(OUT, 'redirects.csv'), csv);
  console.log(`Átirányítások: ${rows.length - 1} sor → export/woocommerce/redirects.csv`);
  console.log('  Betöltés: WordPress > Redirection plugin > Import/Export > CSV.');
}

// ---------- fő ----------
async function main() {
  await loadState();
  await buildTaxMap();
  switch (cmd) {
    case 'fields': return cmdFields();
    case 'check': return cmdCheck();
    case 'categories': return cmdCategories();
    case 'brands': return cmdBrands();
    case 'products': return cmdProducts(Number(positional[1]) || 0);
    case 'redirects': return cmdRedirects();
    case 'all':
      await cmdCategories();
      await cmdBrands();
      await cmdProducts(Number(positional[1]) || 0);
      return cmdRedirects();
    default:
      console.log('Parancsok: fields | check | categories | brands | products [N] | redirects | all');
  }
}

main().catch((e) => { console.error(`\nHIBA: ${e.message}`); process.exit(1); });
