/**
 * NYOMDAI RENDER – a terv-dokumentumból (recept) determinisztikusan:
 *
 *   terv (SCV-…) + modell nyomdai geometriája (mm)
 *     → darabonként SVG (minta a nézetből mm-be leképezve, kifutó, feliratok)
 *     → 300 dpi PNG (resvg)
 *     → elrendezés a tekercsen (nest.js)
 *     → PDF: raszterek + CutContour vágóvonal (pdf.js)
 *     → munkalap PNG (jobSheet.js) + manifest.json
 *
 * Az egész lánc SZERVER OLDALON fut; a kliens csak a receptet adja.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { config } from '../config.js';
import { loadModel } from '../lib/designValidate.js';
import { getModelMeta } from '../../src/data/models/index.js';
import { getPattern, getCategory, UPLOAD_PATTERN_ID } from '../../src/data/patterns/index.js';
import { ZONES, zoneOfPiece } from '../../src/data/zones.js';
import { readLayer, zoneLayerKey, LAYER_BASE, LAYER_FOOTBOARD } from '../../src/design/useDesign.js';
import { tierForLayer, focusOffset } from '../../src/design/layers.js';
import { highestTier } from '../../src/pricing.js';
import { resolveLabelFont, resolveLabelColor } from '../../src/utils/labelStyle.js';
import { labelColorFor } from '../../src/utils/color.js';
import { effectiveDpi } from '../../src/utils/printQuality.js';
import { transformPath, multiply, translateM } from '../../src/print/pathTransform.js';
import { resolveTextureAsset, resolveUploadedImage } from './assets.js';
import { patternDefs, labelSvg, buildPieceSvg } from './pieceSvg.js';
import { shelfPack } from './nest.js';
import { composePdf } from './pdf.js';
import { renderJobSheet } from './jobSheet.js';

/** Melyik nézet térképe használandó a darabhoz: amiben a vevő tervezett; ha arra nincs, a vázlaté. */
function pickPreview(piece, printPiece, doc, model) {
  const wanted = piece.footboard ? 'footboard' : doc.view;
  const view = printPiece.previewMaps[wanted] ? wanted : Object.keys(printPiece.previewMaps)[0];
  const previewPieces = view === 'photo' ? model.photoView.pieces : model.pieces;
  const previewPiece = previewPieces.find((p) => p.id === piece.id) ?? piece;
  const viewBox = view === 'photo' ? model.photoView.viewBox : view === 'footboard'
    ? { width: printPiece.widthMm, height: printPiece.heightMm } : model.viewBox;
  return { view, map: printPiece.previewMaps[view], previewPiece, viewBox, previewPieces };
}

/**
 * @param {object} p
 * @param {object} p.design terv-dokumentum (normalizált)
 * @param {string} p.designId
 * @param {string} p.jobId
 * @param {string} p.dir kimeneti mappa
 * @param {string|null} [p.orderRef]
 * @param {Buffer|null} [p.previewPng] a terv előnézeti képe (munkalapra)
 * @param {(msg:string)=>void} [p.onProgress]
 * @returns {Promise<object>} manifest
 */
export async function renderPrintJob({ design: doc, designId, jobId, dir, orderRef = null, previewPng = null, onProgress = () => {} }) {
  const warnings = [];
  const meta = getModelMeta(doc.model);
  if (!meta) throw new Error(`Ismeretlen modell: ${doc.model}`);
  if (!meta.loadPrint) throw new Error(`A(z) ${meta.name} modellhez nincs nyomdai geometria (loadPrint).`);
  const [model, print] = await Promise.all([loadModel(doc.model), meta.loadPrint().then((m) => m.default)]);
  if (print.source === 'placeholder') {
    warnings.push('A nyomdai geometria HELYŐRZŐ (a vázlatból közelítve) – a valódi vágófájl importja előtt NEM gyártható.');
  }
  mkdirSync(join(dir, 'pieces'), { recursive: true });
  const { dpi, bleedMm: defaultBleed } = config.print;
  const bleedMm = print.bleedMm ?? defaultBleed;

  // --- mely darabok készülnek: kiválasztott zónák darabjai + taposó ---
  const availableZoneIds = ZONES.filter((z) => model.pieces.some((p) => z.groups.includes(p.priceGroup))).map((z) => z.id);
  const selectedZones = doc.selection.zones ?? availableZoneIds;
  const includeFootboard = doc.selection.footboard && model.pieces.some((p) => p.footboard);
  const wanted = model.pieces.filter((p) => (p.footboard ? includeFootboard : selectedZones.includes(zoneOfPiece(p)?.id)));
  if (!wanted.length) throw new Error('A tervben nincs egyetlen gyártandó darab sem.');

  // --- rétegek → minta + kép-források (egyszer, rétegenként) ---
  const layerCache = new Map();
  async function layerInfo(key) {
    if (layerCache.has(key)) return layerCache.get(key);
    const layer = readLayer(doc, key);
    const tier = tierForLayer(layer);
    let pattern, asset = null, patternName;
    if (layer.patternId === UPLOAD_PATTERN_ID) {
      if (!layer.image?.url) throw new Error(`A(z) ${key} réteg saját képe nincs a szerveren.`);
      const img = await resolveUploadedImage(layer.image.url);
      asset = img;
      pattern = { type: 'image', name: 'Saját kép', category: 'upload', href: img.href, width: img.width, height: img.height, luminance: 0.35 };
      patternName = `Saját kép (${img.width}×${img.height} px)`;
    } else {
      pattern = getPattern(layer.patternId);
      if (!pattern) throw new Error(`Ismeretlen minta: ${layer.patternId}`);
      patternName = pattern.name;
      if (pattern.type === 'image-tile') {
        asset = await resolveTextureAsset(pattern);
        if (!asset) throw new Error(`A(z) ${pattern.id} textúra képe nem található.`);
        if (!asset.isMaster) warnings.push(`"${pattern.name}": nincs nyomdai mester (server/print/assets/patterns/${pattern.id}.png), az előnézeti ${asset.width} px-es képből készült – ~${Math.round((asset.width / (pattern.tile * (print.mmPerUnit?.schematic ?? 1.2))) * 25.4)} dpi.`);
      }
    }
    const category = getCategory(pattern.category ?? 'solid');
    const info = { key, layer, tier, pattern, asset, patternName, category, autoColor: labelColorFor(pattern) };
    layerCache.set(key, info);
    return info;
  }

  // --- darabonként SVG + PNG ---
  onProgress('darabok renderelése');
  const pieceEntries = [];
  const nestItems = [];
  for (const piece of wanted) {
    const printPiece = print.pieces.find((p) => p.id === piece.id);
    if (!printPiece) { warnings.push(`A(z) ${piece.id} darabnak nincs nyomdai kontúrja – kihagyva.`); continue; }
    const zone = zoneOfPiece(piece);
    const layerKey = piece.footboard ? LAYER_FOOTBOARD : (zone && doc.style.zones[zone.id] ? zoneLayerKey(zone.id) : LAYER_BASE);
    const info = await layerInfo(layerKey);
    const pv = pickPreview(piece, printPiece, doc, model);

    // a felhasználói transzformáció + a "fő darab" eltolás, ahogy az előnézet is számolja
    const { fx, fy } = piece.footboard ? { fx: 0, fy: 0 } : focusOffset(info.layer, pv.previewPieces, pv.viewBox);
    const transform = { ...info.layer.transform, dx: info.layer.transform.dx + fx, dy: info.layer.transform.dy + fy };
    const extraScale = doc.options.sizeAwareTiling && (info.pattern.type === 'image-tile' || info.pattern.type === 'tile')
      ? ((info.pattern.patternScale ?? info.category.patternScale)?.[piece.size] ?? 1) : 1;
    const paint = patternDefs({ pattern: info.pattern, asset: info.asset, transform, viewBox: pv.viewBox, previewMap: pv.map, extraScale, id: `p_${piece.id}` });

    // feliratok, amelyek erre a darabra kerülnek
    const labelSources = piece.footboard
      ? (doc.footboard.label?.enabled ? [doc.footboard.label] : [])
      : doc.labels.filter((l) => l.enabled && l.pieceId === piece.id);
    const labels = labelSources.map((l, i) => labelSvg({
      label: l,
      font: resolveLabelFont(l, info.category.labelFont),
      color: resolveLabelColor(l, info.autoColor),
      previewPiece: piece.footboard ? { d: printPiece.d, labelAngle: 0 } : pv.previewPiece,
      uid: `t_${piece.id}_${i}`,
    }));
    if (labels.length && !existsSync(config.print.fontsDir)) {
      warnings.push('Nincs server/print/fonts mappa – a feliratok tartalék betűtípussal készültek (lásd server/print/fonts/README.md).');
    }

    let dpiEffective = null;
    if (info.pattern.type === 'image') {
      const mmPerUnit = pv.view === 'footboard' ? 1 : (print.mmPerUnit?.[pv.view] ?? null);
      dpiEffective = effectiveDpi({ width: info.asset.width, height: info.asset.height }, pv.viewBox, info.layer.transform.scale, mmPerUnit);
      if (dpiEffective != null && dpiEffective < config.print.minDpiWarn) {
        warnings.push(`${piece.name}: a saját kép effektív felbontása ${dpiEffective} dpi (< ${config.print.minDpiWarn}) – szemcsés lehet.`);
      }
    }

    const copies = [];
    for (let c = 0; c < (printPiece.quantity ?? 1); c++) {
      const mirror = c === 1 && Boolean(printPiece.mirror);
      const key = `${piece.id}${(printPiece.quantity ?? 1) > 1 ? (mirror ? '-R' : '-L') : ''}`;
      copies.push({ key, mirror });
      nestItems.push({ key, w: printPiece.widthMm + 2 * bleedMm, h: printPiece.heightMm + 2 * bleedMm });
    }
    pieceEntries.push({ piece, printPiece, info, pv, paint, labels, copies, dpiEffective });
  }

  // --- elrendezés ---
  onProgress('elrendezés a tekercsen');
  const { placements, lengthMm } = shelfPack(nestItems, config.print);
  const placementOf = Object.fromEntries(placements.map((p) => [p.key, p]));

  // --- raszter + vágóvonal darabonként (a forgatás az elrendezésből jön) ---
  const pdfItems = [];
  const manifestPieces = [];
  for (const e of pieceEntries) {
    const copiesOut = [];
    for (const copy of e.copies) {
      const pl = placementOf[copy.key];
      const built = buildPieceSvg({
        piece: e.printPiece, bleedMm, paint: e.paint, labels: e.labels, previewMap: e.pv.map,
        mirror: copy.mirror, rotate90: pl.rotated, dpi,
      });
      let png = null;
      if (e.paint.printable) {
        const r = new Resvg(built.svg, {
          font: { fontDirs: [config.print.fontsDir], loadSystemFonts: true, defaultFontFamily: 'DejaVu Sans' },
          imageRendering: 0, shapeRendering: 2, textRendering: 1,
        });
        png = r.render().asPng();
        writeFileSync(join(dir, 'pieces', `${copy.key}.png`), png);
      }
      writeFileSync(join(dir, 'pieces', `${copy.key}.svg`), built.svg);
      // vágóvonal a lapon: darab-tér (mm) → tükrözés/forgatás → eltolás a helyére (a kifutós doboz bal-felső sarka + b)
      const M = multiply(translateM(pl.x + bleedMm, pl.y + bleedMm), built.placementMatrix);
      pdfItems.push({
        png, x: pl.x, y: pl.y, w: built.widthMm, h: built.heightMm,
        cutPathMm: transformPath(e.printPiece.d, M), label: `${copy.key} · ${designId}`,
      });
      copiesOut.push({ key: copy.key, mirror: copy.mirror, rotated: pl.rotated, xMm: pl.x, yMm: pl.y, wMm: built.widthMm, hMm: built.heightMm,
        png: png ? `pieces/${copy.key}.png` : null, svg: `pieces/${copy.key}.svg` });
    }
    manifestPieces.push({
      id: e.piece.id, name: e.piece.name, footboard: Boolean(e.piece.footboard), zone: zoneOfPiece(e.piece)?.id ?? null,
      widthMm: e.printPiece.widthMm, heightMm: e.printPiece.heightMm, bleedMm, mirror: Boolean(e.printPiece.mirror),
      layer: e.info.key, tier: e.info.tier, patternId: e.info.layer.patternId, patternName: e.info.patternName,
      printable: e.paint.printable, vinylColor: e.paint.vinylColor, dpiEffective: e.dpiEffective,
      previewView: e.pv.view, copies: copiesOut, labels: e.labels.length,
    });
  }

  // --- PDF ---
  onProgress('PDF összeállítása');
  const zonesOut = selectedZones.map((zid) => {
    const z = ZONES.find((x) => x.id === zid);
    const info = layerCache.get(doc.style.zones[zid] ? zoneLayerKey(zid) : LAYER_BASE);
    return { id: zid, name: z?.name ?? zid, tier: info?.tier ?? 'solid', patternName: info?.patternName ?? '–', vinylColor: info?.pattern?.color ?? null };
  });
  const tier = highestTier(zonesOut.map((z) => z.tier).concat(includeFootboard ? [layerCache.get(LAYER_FOOTBOARD)?.tier ?? 'solid'] : []));
  const title = `Scoover ${designId} – ${meta.name}${doc.year ? ` ${doc.year}` : ''}`;
  const pdfBytes = await composePdf({
    widthMm: config.print.rollWidthMm, heightMm: lengthMm, items: pdfItems,
    meta: { title, subject: `Roller-fólia ${tier.toUpperCase()} · ${orderRef ?? 'rendelés nélkül'}`, keywords: ['scoover', designId, 'CutContour'] },
  });
  const pdfName = `${designId}-${jobId}.pdf`;
  writeFileSync(join(dir, pdfName), pdfBytes);

  const fbInfo = includeFootboard ? layerCache.get(LAYER_FOOTBOARD) : null;
  const manifest = {
    schemaVersion: 1,
    jobId, designId, orderRef, createdAt: new Date().toISOString(),
    model: { id: meta.id, name: meta.name }, year: doc.year ?? null, view: doc.view,
    tier, mixed: Object.keys(doc.style.zones).length > 0,
    zones: zonesOut,
    footboard: fbInfo ? { tier: fbInfo.tier, patternName: fbInfo.patternName } : null,
    installation: doc.installation,
    bleedMm, dpi,
    geometry: { source: print.source, sourceFile: print.sourceFile ?? null, generatedAt: print.generatedAt ?? null },
    sheet: { rollWidthMm: config.print.rollWidthMm, lengthMm: Math.round(lengthMm * 10) / 10, pieceCount: pdfItems.length, gapMm: config.print.gapMm, marginMm: config.print.marginMm },
    pieces: manifestPieces,
    files: { pdf: pdfName, jobSheet: 'job-sheet.png', manifest: 'manifest.json' },
    warnings,
    design: doc,
  };

  onProgress('munkalap');
  const sheetPng = renderJobSheet(manifest, { previewPng });
  writeFileSync(join(dir, 'job-sheet.png'), sheetPng);
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

/** Segéd: a terv előnézeti képének beolvasása, ha van. */
export function readPreviewPng(path) {
  return path && existsSync(path) ? readFileSync(path) : null;
}

