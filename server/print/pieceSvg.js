/**
 * Egy nyomdai darab SVG-je milliméterben – ugyanazzal a logikával, amivel a
 * kliens a vásznon rajzol (PatternDefs.transformString, LabelLayer méretezés),
 * csak a nézet-egységekből a darab mm-es terébe leképezve (previewMaps).
 *
 * Felépítés:
 *   <svg viewBox="-b -b W+2b H+2b">          b = kifutó (bleed)
 *     <defs> minta (userSpaceOnUse, patternTransform = M_preview→mm · felhasználói) </defs>
 *     <g transform=[tükrözés/forgatás]>
 *       <path d fill=url(#p) stroke=url(#p) stroke-width=2b/>   ← kifutó: a kontúr
 *                                                                mintával húzva
 *       <g clip-path=kontúr><g transform=M_preview→mm> feliratok (nézet-egységben) </g></g>
 *     </g>
 *   </svg>
 *
 * A kliens sosem gyárt ilyet – ez a szerver egyetlen igazságforrása a nyomathoz.
 */
import { pathBounds, matrixString, multiply, translateM, scaleM, rotateM, parseTransform } from '../../src/print/pathTransform.js';
import { getFontOption } from '../../src/data/fonts.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/**
 * A PatternDefs.transformString megfelelője: pre (darab-ferdítés a fotós
 * nézetben – a nyomaton NEM alkalmazzuk, mert az csak vizuális perspektíva),
 * eltolás, forgatás a nézet közepe körül, lépték (felhasználói × méretosztály).
 */
function userTransform(transform, viewBox, extraScale) {
  const { scale = 1, rotate = 0, dx = 0, dy = 0 } = transform ?? {};
  const cx = viewBox.width / 2, cy = viewBox.height / 2;
  return multiply(translateM(dx, dy), multiply(rotateM(rotate, cx, cy), scaleM(scale * extraScale)));
}

/**
 * Minta-def a darab mm-es terébe.
 * @returns {{ defs: string, fill: string, printable: boolean, vinylColor: string|null }}
 */
export function patternDefs({ pattern, asset, transform, viewBox, previewMap, extraScale, id }) {
  if (!pattern) return { defs: '', fill: '#888', printable: false, vinylColor: null };
  if (pattern.type === 'solid') return { defs: '', fill: pattern.color, printable: false, vinylColor: pattern.color };

  const M = multiply(previewMap, userTransform(transform, viewBox, extraScale));
  const tf = matrixString(M);

  if (pattern.type === 'gradient') {
    const a = ((pattern.angle ?? 0) * Math.PI) / 180;
    const r = Math.max(viewBox.width, viewBox.height) / 2;
    const stops = pattern.stops.map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`).join('');
    return {
      defs: `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${viewBox.width / 2 - Math.cos(a) * r}" y1="${viewBox.height / 2 - Math.sin(a) * r}" x2="${viewBox.width / 2 + Math.cos(a) * r}" y2="${viewBox.height / 2 + Math.sin(a) * r}" gradientTransform="${tf}">${stops}</linearGradient>`,
      fill: `url(#${id})`, printable: true, vinylColor: null,
    };
  }
  if (pattern.type === 'tile') {
    return {
      defs: `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${pattern.tile.width}" height="${pattern.tile.height}" patternTransform="${tf}">${pattern.tile.markup.replaceAll('__ID__', id)}</pattern>`,
      fill: `url(#${id})`, printable: true, vinylColor: null,
    };
  }
  if (pattern.type === 'image-tile') {
    const t = pattern.tile;
    const mirror = pattern.tiling === 'mirror';
    const size = mirror ? t * 2 : t;
    const img = (extra = '') => `<image href="${asset.href}" width="${t}" height="${t}" preserveAspectRatio="none" ${extra}/>`;
    const body = mirror
      ? img() + img(`transform="translate(${2 * t} 0) scale(-1 1)"`) + img(`transform="translate(0 ${2 * t}) scale(1 -1)"`) + img(`transform="translate(${2 * t} ${2 * t}) scale(-1 -1)"`)
      : img();
    return {
      defs: `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}" patternTransform="${tf}">${body}</pattern>`,
      fill: `url(#${id})`, printable: true, vinylColor: null,
    };
  }
  if (pattern.type === 'image') {
    return {
      defs: `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${viewBox.width}" height="${viewBox.height}" patternTransform="${tf}"><image href="${asset.href}" width="${viewBox.width}" height="${viewBox.height}" preserveAspectRatio="xMidYMid slice"/></pattern>`,
      fill: `url(#${id})`, printable: true, vinylColor: null,
    };
  }
  return { defs: '', fill: '#888', printable: false, vinylColor: null };
}

/**
 * Felirat a nézet egységeiben (a LabelLayer.jsx méretezése), majd a
 * previewMap viszi mm-be. `previewPiece`: a nézet darabja (d, labelAngle).
 */
export function labelSvg({ label, font, color, previewPiece, uid }) {
  const text = String(label.text ?? '').trim().toUpperCase();
  if (!text) return '';
  const box = pathBounds(previewPiece.d);
  if (!box) return '';
  let length, thickness;
  if (previewPiece.labelAngle) {
    length = Math.hypot(box.width, box.height) * 0.9;
    thickness = Math.min(box.width, box.height) * 0.55;
  } else { length = box.width; thickness = box.height; }
  const chars = Math.max(text.length, 1);
  const baseSize = Math.max(6, Math.min(thickness * 0.7, (length * 0.72) / (chars * font.glyph)));
  const fontSize = baseSize * (label.scale ?? 1);
  const cx = box.cx + (label.dx ?? 0);
  const cy = box.cy + (label.dy ?? 0);
  const angle = (previewPiece.labelAngle ?? 0) + (label.rotate ?? 0);
  const ls = typeof font.letterSpacing === 'string' && font.letterSpacing.endsWith('em')
    ? parseFloat(font.letterSpacing) * fontSize : (Number(font.letterSpacing) || 0);
  const stroke = color === '#ffffff' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)';
  return `<text id="${uid}" x="${cx}" y="${cy}" transform="rotate(${angle} ${cx} ${cy}) translate(${cx} ${cy}) skewX(${font.skew ?? 0}) translate(${-cx} ${-cy})" text-anchor="middle" dominant-baseline="central" font-family="${esc(font.family)}, DejaVu Sans, Arial, sans-serif" font-weight="${font.weight}" font-size="${fontSize}" letter-spacing="${ls}" fill="${color}" stroke="${stroke}" stroke-width="${fontSize * 0.04}" paint-order="stroke">${esc(text)}</text>`;
}

/**
 * @param {object} p
 * @param {object} p.piece nyomdai darab (d mm, widthMm, heightMm)
 * @param {number} p.bleedMm
 * @param {{defs:string, fill:string}} p.paint a patternDefs eredménye
 * @param {string[]} p.labels labelSvg stringek (nézet-egységben)
 * @param {number[]} p.previewMap a feliratok mm-be vitele
 * @param {boolean} p.mirror
 * @param {boolean} p.rotate90
 * @param {number} p.dpi
 * @returns {{ svg: string, widthMm: number, heightMm: number, pxWidth: number, pxHeight: number, placementMatrix: number[] }}
 */
export function buildPieceSvg({ piece, bleedMm, paint, labels, previewMap, mirror = false, rotate90 = false, dpi }) {
  const W = piece.widthMm, H = piece.heightMm, b = bleedMm;
  const boxW = W + 2 * b, boxH = H + 2 * b;
  // tükrözés / forgatás a kifutós dobozon belül – ugyanez a mátrix kerül a vágóvonalra a PDF-ben
  let M = [1, 0, 0, 1, 0, 0];
  if (mirror) M = multiply([-1, 0, 0, 1, W, 0], M);
  if (rotate90) M = multiply(multiply(translateM(H + 2 * b - b, -b), rotateM(90)), multiply(translateM(b, b), M)); // (x,y) → (H+b-y', x')
  const outW = rotate90 ? boxH : boxW;
  const outH = rotate90 ? boxW : boxH;
  const pxW = Math.round((outW / 25.4) * dpi);
  const pxH = Math.round((outH / 25.4) * dpi);
  const clipId = 'clip';
  const labelsBlock = labels.length
    ? `<g clip-path="url(#${clipId})"><g transform="${matrixString(previewMap)}">${labels.join('')}</g></g>`
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${pxW}" height="${pxH}" viewBox="${rotate90 ? -b : -b} ${-b} ${outW} ${outH}">
<defs>${paint.defs}<clipPath id="${clipId}"><path d="${piece.d}"/></clipPath></defs>
<g transform="${matrixString(M)}">
<path d="${piece.d}" fill="${paint.fill}" stroke="${paint.fill}" stroke-width="${2 * b}" stroke-linejoin="round" stroke-linecap="round"/>
${labelsBlock}
</g>
</svg>`;
  return { svg, widthMm: outW, heightMm: outH, pxWidth: pxW, pxHeight: pxH, placementMatrix: M };
}

/** A fotós nézet darabjának saját ferdítése (patternTransform) – a nyomaton nem használjuk, csak naplózzuk. */
export function previewSkewOf(previewPiece) {
  return previewPiece?.patternTransform ? parseTransform(previewPiece.patternTransform) : null;
}

export { getFontOption };
