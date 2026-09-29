/**
 * NYOMDAI RENDER – a terv-dokumentumból (recept) determinisztikusan:
 *
 *   terv (SCV-…) + modell nyomdai geometriája (geometry.js)
 *     → darab-példányonként SVG a saját terében (minta a nézetből leképezve,
 *       kifutó, feliratok) → 300 dpi PNG (resvg)
 *     → elrendezés:
 *         'sheet' (valódi vágóív): a darabok az EREDETI vágóív helyén, a lap
 *                  mérete a vágóívé – a vágóvonal pontosan az eredeti
 *         'nest'  (helyőrző): polcos elrendezés a tekercsre (nest.js)
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
import { getFootboardFlat } from '../../src/data/footboardFlat.js';
import { readLayer, zoneLayerKey, LAYER_BASE, LAYER_FOOTBOARD } from '../../src/design/useDesign.js';
import { tierForLayer, focusOffset } from '../../src/design/layers.js';
import { highestTier } from '../../src/pricing.js';
import { resolveLabelFont, resolveLabelColor } from '../../src/utils/labelStyle.js';
import { labelColorFor } from '../../src/utils/color.js';
import { effectiveDpi } from '../../src/utils/printQuality.js';
import { transformPath, multiply, translateM, rotateM, pathBounds } from '../../src/print/pathTransform.js';
import { resolveTextureAsset, resolveUploadedImage } from './assets.js';
import { patternDefs, labelSvg, buildCopySvg } from './pieceSvg.js';
import { loadPrintGeometry } from './geometry.js';
import { shelfPack } from './nest.js';
import { composePdf } from './pdf.js';
import { renderJobSheet } from './jobSheet.js';

const det = (m) => m[0] * m[3] - m[1] * m[2];

/** A nézet, amiben a vevő tervezett (taposónál a felülnézet); ha arra nincs leképezés, az első elérhető. */
function pickView(piece, copy, doc, model) {
  const wanted = piece.footboard ? 'footboard' : doc.view;
  const view = copy.previewMaps[wanted] ? wanted : Object.keys(copy.previewMaps)[0];
  if (!view) return null;
  if (view === 'footboard') {
    const flat = getFootboardFlat(model);
    return { view, map: copy.previewMaps.footboard, viewBox: flat.viewBox, previewPieces: [flat.piece], previewPiece: { d: flat.piece.d, labelAngle: 0 } };
  }
  const previewPieces = view === 'photo' ? model.photoView.pieces : model.pieces;
  const previewPiece = previewPieces.find((p) => p.id === piece.id)
    ?? previewPieces.find((p) => piece.priceGroup && p.priceGroup === piece.priceGroup) ?? piece;
  const viewBox = view === 'photo' ? model.photoView.viewBox : model.viewBox;
  return { view, map: copy.previewMaps[view], viewBox, previewPieces, previewPiece };
}

/** 'nest' elrendezésnél a helyére tett példány: d és leképezés a lap terébe (eltolás + esetleg 90° forgatás). */
function placeCopy(copy, pl, bleedMm) {
  const W = copy.widthMm, H = copy.heightMm;
  let P = translateM(pl.x + bleedMm, pl.y + bleedMm);
  if (pl.rotated) P = multiply(P, multiply(translateM(H, 0), rotateM(90))); // (x,y) → (H − y, x)
  const d = transformPath(copy.d, P);
  const bb = pathBounds(d);
  return {
    ...copy, d, xMm: bb.x, yMm: bb.y, widthMm: bb.width, heightMm: bb.height, rotated: pl.rotated,
    previewMaps: Object.fromEntries(Object.entries(copy.previewMaps).map(([v, m]) => [v, multiply(P, m)])),
  };
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
  const [model, geo] = await Promise.all([loadModel(doc.model), loadPrintGeometry(doc.model)]);
  if (geo.source === 'placeholder') {
    warnings.push('A nyomdai geometria HELYŐRZŐ (a vázlatból közelítve) – a valódi vágóív importja előtt NEM gyártható.');
  }
  mkdirSync(join(dir, 'pieces'), { recursive: true });
  const { dpi } = config.print;
  const bleedMm = geo.bleedMm;

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
        const mmPerUnit = geo.mmPerUnit?.[doc.view] ?? geo.mmPerUnit?.schematic ?? 1.2;
        if (!asset.isMaster) warnings.push(`"${pattern.name}": nincs nyomdai mester (server/print/assets/patterns/${pattern.id}.png), az előnézeti ${asset.width} px-es képből készült – ~${Math.round((asset.width / (pattern.tile * mmPerUnit)) * 25.4)} dpi.`);
      }
    }
    const category = getCategory(pattern.category ?? 'solid');
    const info = { key, layer, tier, pattern, asset, patternName, category, autoColor: labelColorFor(pattern) };
    layerCache.set(key, info);
    return info;
  }

  // --- a gyártandó példányok ---
  onProgress('darabok előkészítése');
  const jobs = [];
  for (const piece of wanted) {
    const gp = geo.pieces.find((p) => p.id === piece.id);
    if (!gp) { warnings.push(`A(z) ${piece.name} (${piece.id}) darab nincs a vágóíven / nincs hozzárendelve – kihagyva.`); continue; }
    const zone = zoneOfPiece(piece);
    const layerKey = piece.footboard ? LAYER_FOOTBOARD : (zone && doc.style.zones[zone.id] ? zoneLayerKey(zone.id) : LAYER_BASE);
    const info = await layerInfo(layerKey);
    for (const copy of gp.copies) {
      jobs.push({ piece, gp, copy, info });
    }
  }
  if (!jobs.length) throw new Error('A kiválasztott zónákhoz egyetlen vágóív-darab sincs hozzárendelve.');

  // --- elrendezés: vágóív (eredeti hely) vagy polcos ---
  let page;
  if (geo.layout === 'sheet') {
    page = { widthMm: geo.sheet.widthMm, heightMm: geo.sheet.heightMm, layout: 'sheet' };
  } else {
    onProgress('elrendezés a tekercsen');
    const { placements, lengthMm } = shelfPack(jobs.map((j) => ({ key: j.copy.key, w: j.copy.widthMm + 2 * bleedMm, h: j.copy.heightMm + 2 * bleedMm })), config.print);
    const at = Object.fromEntries(placements.map((p) => [p.key, p]));
    for (const j of jobs) j.copy = placeCopy(j.copy, at[j.copy.key], bleedMm);
    page = { widthMm: config.print.rollWidthMm, heightMm: lengthMm, layout: 'nest' };
  }

  // --- raszter + vágóvonal példányonként ---
  onProgress('darabok renderelése');
  const pdfItems = [];
  const byPiece = new Map();
  let fontWarned = false;
  for (const { piece, copy, info } of jobs) {
    const pv = pickView(piece, copy, doc, model);
    if (!pv) { warnings.push(`${copy.key}: nincs nézet-leképezés – kihagyva.`); continue; }
    const { fx, fy } = piece.footboard ? { fx: 0, fy: 0 } : focusOffset(info.layer, pv.previewPieces, pv.viewBox);
    const transform = { ...info.layer.transform, dx: info.layer.transform.dx + fx, dy: info.layer.transform.dy + fy };
    const extraScale = doc.options.sizeAwareTiling && (info.pattern.type === 'image-tile' || info.pattern.type === 'tile')
      ? ((info.pattern.patternScale ?? info.category.patternScale)?.[piece.size] ?? 1) : 1;
    const paint = patternDefs({ pattern: info.pattern, asset: info.asset, transform, viewBox: pv.viewBox, previewMap: pv.map, extraScale, id: `p_${copy.key}` });

    const labelSources = piece.footboard
      ? (doc.footboard.label?.enabled ? [doc.footboard.label] : [])
      : doc.labels.filter((l) => l.enabled && l.pieceId === piece.id);
    const labels = labelSources.map((l, i) => labelSvg({
      label: l,
      font: resolveLabelFont(l, info.category.labelFont),
      color: resolveLabelColor(l, info.autoColor),
      previewPiece: pv.previewPiece,
      uid: `t_${copy.key}_${i}`,
      unmirror: det(pv.map) < 0,
    }));
    if (labels.length && !fontWarned && !existsSync(config.print.fontsDir)) {
      fontWarned = true;
      warnings.push('Nincs server/print/fonts mappa – a feliratok tartalék betűtípussal készültek (lásd server/print/fonts/README.md).');
    }

    let dpiEffective = null;
    if (info.pattern.type === 'image') {
      const mmPerUnit = pv.view === 'footboard' ? 1 : (geo.mmPerUnit?.[pv.view] ?? null);
      dpiEffective = effectiveDpi({ width: info.asset.width, height: info.asset.height }, pv.viewBox, info.layer.transform.scale, mmPerUnit);
      if (dpiEffective != null && dpiEffective < config.print.minDpiWarn) {
        warnings.push(`${copy.key}: a saját kép effektív felbontása ${dpiEffective} dpi (< ${config.print.minDpiWarn}) – szemcsés lehet.`);
      }
    }

    const built = buildCopySvg({ copy, bleedMm, paint, labels, previewMap: pv.map, dpi });
    let png = null;
    if (paint.printable) {
      png = new Resvg(built.svg, {
        font: { fontDirs: [config.print.fontsDir], loadSystemFonts: true, defaultFontFamily: 'DejaVu Sans' },
        imageRendering: 0, shapeRendering: 2, textRendering: 1,
      }).render().asPng();
      writeFileSync(join(dir, 'pieces', `${copy.key}.png`), png);
    }
    writeFileSync(join(dir, 'pieces', `${copy.key}.svg`), built.svg);
    // a vágóvonal a darab SAJÁT, változatlan kontúrja (vágóívnél: pontosan az eredeti)
    pdfItems.push({ png, x: built.xMm, y: built.yMm, w: built.widthMm, h: built.heightMm, cutPathMm: copy.d, label: `${copy.key} · ${designId}` });

    const entry = byPiece.get(piece.id) ?? {
      id: piece.id, name: piece.name, footboard: Boolean(piece.footboard), zone: zoneOfPiece(piece)?.id ?? null,
      widthMm: copy.widthMm, heightMm: copy.heightMm, bleedMm, mirror: false,
      layer: info.key, tier: info.tier, patternId: info.layer.patternId, patternName: info.patternName,
      printable: paint.printable, vinylColor: paint.vinylColor, dpiEffective, previewView: pv.view, copies: [], labels: labels.length,
    };
    if (copy.side === 'L') entry.mirror = true;
    entry.copies.push({
      key: copy.key, n: copy.n ?? null, side: copy.side ?? null, confidence: copy.confidence ?? null, rotated: Boolean(copy.rotated),
      xMm: Math.round(copy.xMm * 10) / 10, yMm: Math.round(copy.yMm * 10) / 10,
      wMm: Math.round(copy.widthMm * 10) / 10, hMm: Math.round(copy.heightMm * 10) / 10,
      png: png ? `pieces/${copy.key}.png` : null, svg: `pieces/${copy.key}.svg`,
    });
    byPiece.set(piece.id, entry);
  }

  // a kérdéses hozzárendelések egy sorban
  const uncertain = jobs.filter((j) => j.copy.confidence === 'kérdéses').map((j) => `#${j.copy.n ?? '?'} ${j.copy.key}`);
  if (uncertain.length) warnings.push(`KÉRDÉSES vágóív-hozzárendelés (${uncertain.length}): ${uncertain.join(', ')} – gyártás előtt megerősítendő (tools/cutfile/${doc.model}/mapping.json).`);

  if (geo.unassigned?.length) {
    const groups = {};
    for (const u of geo.unassigned) { const k = u.extra ?? 'azonosítatlan'; groups[k] = (groups[k] ?? 0) + 1; }
    warnings.push(`A vágóíven ${geo.unassigned.length} darab nincs a konfigurátor zónáihoz rendelve (${Object.entries(groups).map(([k, n]) => `${k} ×${n}`).join(', ')}) – nem került a nyomatra.`);
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
    widthMm: page.widthMm, heightMm: page.heightMm, items: pdfItems,
    meta: { title, subject: `Roller-fólia ${tier.toUpperCase()} · ${orderRef ?? 'rendelés nélkül'}`, keywords: ['scoover', designId, 'CutContour'] },
  });
  const pdfName = `${designId}-${jobId}.pdf`;
  writeFileSync(join(dir, pdfName), pdfBytes);

  const fbInfo = includeFootboard ? layerCache.get(LAYER_FOOTBOARD) : null;
  const manifest = {
    schemaVersion: 2,
    jobId, designId, orderRef, createdAt: new Date().toISOString(),
    model: { id: meta.id, name: meta.name }, year: doc.year ?? null, view: doc.view,
    tier, mixed: Object.keys(doc.style.zones).length > 0,
    zones: zonesOut,
    footboard: fbInfo ? { tier: fbInfo.tier, patternName: fbInfo.patternName } : null,
    installation: doc.installation,
    bleedMm, dpi,
    geometry: { source: geo.source, layout: page.layout, sourceFile: geo.sourceFile ?? null, sourceTitle: geo.sourceTitle ?? null, generatedAt: geo.generatedAt ?? null },
    sheet: {
      layout: page.layout, rollWidthMm: page.widthMm, lengthMm: Math.round(page.heightMm * 10) / 10,
      pieceCount: pdfItems.length, gapMm: config.print.gapMm, marginMm: config.print.marginMm,
    },
    pieces: [...byPiece.values()],
    unassigned: geo.unassigned ?? [],
    files: { pdf: pdfName, jobSheet: 'job-sheet.png', manifest: 'manifest.json' },
    warnings: [...new Set(warnings)],
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
