#!/usr/bin/env node
// Shoprenter TELJES bolt-mentés (WooCommerce migrációhoz).
//
// Minden lekérhető adatot JSON-ba ment az export/shoprenter/ mappába, és letölti a termékképeket.
// Újraindítható: a már kimentett erőforrásokat kihagyja (--force: mindent újra).
//
// Környezeti változók: ugyanazok, mint sr-api.mjs-nél (SHOPRENTER_SHOP, SHOPRENTER_API_USER/PASSWORD
// vagy SHOPRENTER_CLIENT_ID/SECRET). Opcionális:
//   SHOPRENTER_IMAGE_BASE   képek URL-gyöke (alap: https://<shop>.myshoprenter.hu/custom/<shop>/image/data/)
//
// Használat:
//   node tools/shoprenter/sr-export.mjs                 – termékek, kategóriák, gyártók, attribútumok, URL-aliasok, vevők, rendelések
//   node tools/shoprenter/sr-export.mjs --no-orders     – rendelések nélkül
//   node tools/shoprenter/sr-export.mjs --no-customers  – vevők nélkül
//   node tools/shoprenter/sr-export.mjs --images-only   – csak képletöltés a már kimentett products.json alapján
//   node tools/shoprenter/sr-export.mjs --no-images     – képek nélkül
//   node tools/shoprenter/sr-export.mjs --force         – meglévő fájlok felülírása

import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';

const SHOP = process.env.SHOPRENTER_SHOP || 'elektromosroller';
const OUT = path.resolve('export/shoprenter');
const IMG_DIR = path.join(OUT, 'images');
const RATE_DELAY_MS = 350; // 3 kérés/mp
const IMAGE_BASE = (process.env.SHOPRENTER_IMAGE_BASE || `https://${SHOP}.myshoprenter.hu/custom/${SHOP}/image/data/`).replace(/\/?$/, '/');

const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')));
const FORCE = flags.has('--force');

// ---------- hitelesítés (azonos az sr-api.mjs logikájával) ----------
let base;
let authHeader;

async function initAuth() {
  let cid = process.env.SHOPRENTER_CLIENT_ID;
  let csec = process.env.SHOPRENTER_CLIENT_SECRET;
  if (!cid && !csec && /^[0-9a-f]{32}$/i.test(process.env.SHOPRENTER_API_USER || '') && /^[0-9a-f]{40,}$/i.test(process.env.SHOPRENTER_API_PASSWORD || '')) {
    cid = process.env.SHOPRENTER_API_USER;
    csec = process.env.SHOPRENTER_API_PASSWORD;
  }
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
    return 'OAuth (api2)';
  }
  const user = process.env.SHOPRENTER_API_USER;
  const pass = process.env.SHOPRENTER_API_PASSWORD;
  if (!user || !pass) throw new Error('Hiányzik: SHOPRENTER_API_USER + SHOPRENTER_API_PASSWORD (vagy SHOPRENTER_CLIENT_ID + SHOPRENTER_CLIENT_SECRET)');
  base = `https://${SHOP}.api.myshoprenter.hu`;
  authHeader = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  return 'Basic auth';
}

// ---------- HTTP ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastCall = 0;

async function call(pathname, attempt = 0) {
  const wait = lastCall + RATE_DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
  const r = await fetch(`${base}/${pathname.replace(/^\//, '')}`, { headers: { Authorization: authHeader, Accept: 'application/json' } });
  const text = await r.text();
  if ((r.status === 429 || r.status >= 500) && attempt < 5) {
    const backoff = 2000 * 2 ** attempt;
    console.log(`  HTTP ${r.status}, újra ${backoff / 1000}s múlva…`);
    await sleep(backoff);
    return call(pathname, attempt + 1);
  }
  if (!r.ok) throw new Error(`HTTP ${r.status} GET ${pathname}\n${text.slice(0, 500)}`);
  return JSON.parse(text);
}

async function getAll(resource, label) {
  const items = [];
  let page = 0;
  for (;;) {
    const d = await call(`${resource}?full=1&limit=200&page=${page}`);
    items.push(...(d.items || []));
    const pageCount = Number(d.pageCount || 1);
    process.stdout.write(`\r  ${label}: ${items.length} db (${page + 1}/${pageCount} oldal)   `);
    page += 1;
    if (page >= pageCount) break;
  }
  process.stdout.write('\n');
  return items;
}

const exists = (p) => access(p).then(() => true, () => false);

async function dump(resource, file, label) {
  const target = path.join(OUT, file);
  if (!FORCE && (await exists(target))) {
    console.log(`  ${label}: már kimentve (${file}), kihagyva`);
    return JSON.parse(await readFile(target, 'utf8'));
  }
  try {
    const items = await getAll(resource, label);
    await writeFile(target, JSON.stringify(items, null, 1));
    return items;
  } catch (e) {
    console.log(`\n  ${label}: HIBA – ${e.message.split('\n')[0]} (kihagyva, futtasd újra később)`);
    return null;
  }
}

// ---------- képek ----------
function collectImagePaths(products) {
  const set = new Set();
  const isImg = (s) => typeof s === 'string' && /\.(jpe?g|png|gif|webp|avif)$/i.test(s) && !/^https?:/i.test(s);
  const walk = (v) => {
    if (typeof v === 'string') { if (isImg(v)) set.add(v.replace(/^\/+/, '')); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(products);
  return [...set];
}

async function downloadImages(products) {
  const paths = collectImagePaths(products);
  console.log(`Képek: ${paths.length} egyedi fájl, forrás: ${IMAGE_BASE}`);
  await mkdir(IMG_DIR, { recursive: true });
  let ok = 0; let skip = 0; let fail = 0;
  const failed = [];
  const worker = async (queue) => {
    for (const rel of queue) {
      const dest = path.join(IMG_DIR, rel);
      if (!FORCE && (await exists(dest))) { skip += 1; continue; }
      await mkdir(path.dirname(dest), { recursive: true });
      try {
        const r = await fetch(IMAGE_BASE + rel.split('/').map(encodeURIComponent).join('/'));
        if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
        await pipeline(Readable.fromWeb(r.body), createWriteStream(dest));
        ok += 1;
      } catch (e) {
        fail += 1;
        failed.push(`${rel}\t${e.message}`);
      }
      process.stdout.write(`\r  letöltve ${ok}, megvolt ${skip}, hiba ${fail}   `);
    }
  };
  const N = 4;
  const queues = Array.from({ length: N }, (_, i) => paths.filter((_, j) => j % N === i));
  await Promise.all(queues.map(worker));
  process.stdout.write('\n');
  if (failed.length) {
    await writeFile(path.join(OUT, 'images-failed.txt'), failed.join('\n'));
    console.log(`  ${failed.length} kép nem jött le, lista: export/shoprenter/images-failed.txt (próbáld más SHOPRENTER_IMAGE_BASE-szel, pl. https://www.elektromos-roller.net/custom/${SHOP}/image/data/)`);
  }
}

// ---------- fő ----------
async function main() {
  await mkdir(OUT, { recursive: true });
  console.log(`Kimenet: ${OUT}`);

  let products;
  if (flags.has('--images-only')) {
    products = JSON.parse(await readFile(path.join(OUT, 'products.json'), 'utf8'));
  } else {
    console.log(`Hitelesítés: ${await initAuth()} – ${base}`);
    console.log('Alapadatok…');
    await dump('languages', 'languages.json', 'nyelvek');
    await dump('taxClasses', 'taxClasses.json', 'adóosztályok');
    await dump('stockStatuses', 'stockStatuses.json', 'készletstátuszok');
    await dump('currencies', 'currencies.json', 'pénznemek');
    console.log('Katalógus…');
    await dump('categoryExtend', 'categories.json', 'kategóriák');
    await dump('manufacturers', 'manufacturers.json', 'gyártók');
    await dump('productAttributeExtend', 'productAttributes.json', 'termék-tulajdonságok');
    await dump('listAttributes', 'listAttributes.json', 'lista-attribútumok');
    await dump('productTags', 'productTags.json', 'címkék');
    await dump('urlAliases', 'urlAliases.json', 'URL-aliasok (301 átirányításhoz)');
    products = await dump('productExtend', 'products.json', 'termékek');
    await dump('productClassExtend', 'productClasses.json', 'termékosztályok (variációk)');
    if (!flags.has('--no-customers')) {
      console.log('Vevők…');
      await dump('customerExtend', 'customers.json', 'vevők');
      await dump('addresses', 'addresses.json', 'címek');
    }
    if (!flags.has('--no-orders')) {
      console.log('Rendelések…');
      await dump('orderExtend', 'orders.json', 'rendelések');
      await dump('orderStatuses', 'orderStatuses.json', 'rendelés-státuszok');
    }
    console.log('Tartalom…');
    await dump('informations', 'informations.json', 'infó-oldalak (ÁSZF, szállítás stb.)');
    await dump('shippingModes', 'shippingModes.json', 'szállítási módok');
    await dump('paymentModes', 'paymentModes.json', 'fizetési módok');
    await dump('coupons', 'coupons.json', 'kuponok');
  }

  if (!flags.has('--no-images') && Array.isArray(products)) await downloadImages(products);

  console.log('\nKész. Következő lépés: tools/woocommerce/wc-import.mjs (Shoprenter JSON → WooCommerce).');
}

main().catch((e) => { console.error(`\nHIBA: ${e.message}`); process.exit(1); });
