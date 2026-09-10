#!/usr/bin/env node
// Akkumulátor teszt jegyzőkönyv → HTML + PDF
//
// Használat:
//   node szerviz/akkuteszt/build.mjs szerviz/akkuteszt/jegyzokonyvek/<adat>.json
//
// Kimenet az adatfájl mellé: <adat>.html és <adat>.pdf
// Képek: assets/whoosh-logo.png (ha nincs: whoosh-logo.svg), és a JSON `test.photo` mezője.
// A PDF-hez Playwright + Chromium kell (globális playwright is jó: NODE_PATH=/opt/node22/lib/node_modules).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { render, derive } from './template.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const input = process.argv[2];
if (!input) {
  console.error('Adj meg egy jegyzőkönyv JSON fájlt.');
  process.exit(1);
}
const inputAbs = path.resolve(input);
const data = JSON.parse(fs.readFileSync(inputAbs, 'utf8'));

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
function dataUri(file) {
  if (!file || !fs.existsSync(file)) return null;
  const ext = path.extname(file).toLowerCase();
  return `data:${MIME[ext] || 'application/octet-stream'};base64,${fs.readFileSync(file).toString('base64')}`;
}

const assetsDir = path.join(here, 'assets');
const logoFile = ['whoosh-logo.png', 'whoosh-logo.jpg', 'whoosh-logo.webp', 'whoosh-logo.svg']
  .map(f => path.join(assetsDir, f)).find(f => fs.existsSync(f));
const photoFile = data.test.photo ? path.resolve(path.dirname(inputAbs), data.test.photo) : null;

const assets = { logoDataUri: dataUri(logoFile), photoDataUri: dataUri(photoFile) };
console.log('Logó:', logoFile ? path.relative(process.cwd(), logoFile) : 'nincs (szöveges)');
console.log('Kijelzőfotó:', assets.photoDataUri ? path.relative(process.cwd(), photoFile) : 'nincs → LCD-átirat');

const html = render(data, assets);
const base = inputAbs.replace(/\.json$/i, '');
fs.writeFileSync(base + '.html', html);
console.log('HTML:', path.relative(process.cwd(), base + '.html'));

const d = derive(data);
console.log(`SOH: ${d.soh.toFixed(1)} % (${d.grade.label}), átlagáram ≈ ${d.avgCurrent.toFixed(2)} A, ≈ ${d.estWh.toFixed(0)} Wh`);

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  // globálisan telepített playwright (npm root -g) – ESM import nem nézi a NODE_PATH-t
  const globalRoot = process.env.NPM_GLOBAL_ROOT || '/opt/node22/lib/node_modules';
  const candidate = path.join(globalRoot, 'playwright', 'index.mjs');
  if (fs.existsSync(candidate)) {
    ({ chromium } = await import(pathToFileURL(candidate).href));
  } else {
    console.warn('Playwright nem elérhető – csak HTML készült. (npm i -g playwright, vagy NPM_GLOBAL_ROOT beállítása)');
    process.exit(0);
  }
}
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(base + '.html').href, { waitUntil: 'load' });
await page.pdf({ path: base + '.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true });
if (process.env.PREVIEW_PNG) {
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.screenshot({ path: base + '.preview.png', fullPage: true });
}
await browser.close();
console.log('PDF:', path.relative(process.cwd(), base + '.pdf'));
