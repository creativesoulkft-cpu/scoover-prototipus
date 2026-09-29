/**
 * Nyomdai geometria betöltése és egységes alakra hozása – CSAK a szerveren.
 *
 * Két forrás:
 *   1. server/print/models/<id>.print.json – a VALÓDI vágóívből
 *      (tools/cutfile/cutfile.py build). A darabok az eredeti vágóív
 *      helyén, lap-mm koordinátában; a nyomdai PDF ugyanez a lap lesz.
 *      Ez a fájl NINCS a gitben (a repó nyilvános) és a kliens sem kapja meg.
 *   2. server/print/placeholders/<id>.print.js – HELYŐRZŐ a vázlatból
 *      (tools/derive-print-placeholder.js), saját origójú darabokkal; ezeket a
 *      render polcos elrendezéssel rakja tekercsre. Nem gyártható.
 *
 * Egységes alak (mindkét forrásból):
 *   { source, layout: 'sheet'|'nest', sheet?, bleedMm, mmPerUnit, notes[], unassigned[],
 *     pieces: [{ id, name, footboard, copies: [{ key, n?, side, confidence,
 *                d, xMm, yMm, widthMm, heightMm, previewMaps: { photo?, schematic?, footboard? } }] }] }
 *   A `d` és a `previewMaps` a darab SAJÁT terében van (sheet: lap-mm; nest: 0,0 origó).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.js';
import { multiply } from '../../src/print/pathTransform.js';

const cache = new Map();

function fromPlaceholder(ph) {
  return {
    source: 'placeholder', layout: 'nest', sourceFile: null, generatedAt: ph.generatedAt ?? null,
    bleedMm: ph.bleedMm ?? config.print.bleedMm, mmPerUnit: ph.mmPerUnit ?? {}, notes: [], unassigned: [],
    pieces: ph.pieces.map((p) => {
      const n = p.quantity ?? 1;
      const copies = [];
      for (let c = 0; c < n; c++) {
        const mirror = c === 1 && Boolean(p.mirror);
        const side = n > 1 ? (mirror ? 'L' : 'R') : null;
        // a tükrözött példány: a darab tükre a saját dobozán belül, és a leképezés is tükrözve
        const M = mirror ? [-1, 0, 0, 1, p.widthMm, 0] : null;
        copies.push({
          key: side ? `${p.id}-${side}` : p.id, side, confidence: 'helyőrző',
          d: p.d, mirrorLocal: Boolean(M), xMm: 0, yMm: 0, widthMm: p.widthMm, heightMm: p.heightMm,
          previewMaps: Object.fromEntries(Object.entries(p.previewMaps).map(([v, m]) => [v, M ? multiply(M, m) : m])),
        });
      }
      return { id: p.id, name: p.name, footboard: Boolean(p.footboard), copies };
    }),
  };
}

/** @returns {Promise<object>} a modell nyomdai geometriája egységes alakban */
export async function loadPrintGeometry(modelId) {
  if (cache.has(modelId)) return cache.get(modelId);
  const real = join(config.print.modelsDir, `${modelId}.print.json`);
  let geo;
  if (existsSync(real)) {
    const raw = JSON.parse(readFileSync(real, 'utf8'));
    geo = {
      source: raw.source, layout: raw.layout ?? 'sheet', sheet: raw.sheet, sourceFile: raw.sourceFile, sourceTitle: raw.sourceTitle,
      generatedAt: raw.generatedAt, bleedMm: raw.bleedMm ?? config.print.bleedMm, mmPerUnit: raw.mmPerUnit ?? {},
      notes: raw.notes ?? [], unassigned: raw.unassigned ?? [],
      pieces: raw.pieces.map((p) => ({ id: p.id, name: p.name, footboard: Boolean(p.footboard), copies: p.copies })),
    };
  } else {
    const ph = join(config.serverDir, 'print', 'placeholders', `${modelId}.print.js`);
    if (!existsSync(ph)) throw new Error(`A(z) ${modelId} modellhez nincs nyomdai geometria (sem vágóív, sem helyőrző).`);
    geo = fromPlaceholder((await import(ph)).default);
  }
  cache.set(modelId, geo);
  return geo;
}

/** Új vágóív importja után a gyorsítótár ürítése (a szerver újraindítása nélkül). */
export function clearPrintGeometryCache() {
  cache.clear();
}
