/**
 * Nyomdai PDF összeállítása: raszteres nyomat (300 dpi PNG darabonként) +
 * vektoros VÁGÓVONAL "CutContour" spot-színnel.
 *
 * Miért spot-szín: a nyomtató-vágó RIP-ek (Roland VersaWorks, Summa,
 * Mimaki RasterLink) a "CutContour" nevű direkt színt ismerik fel
 * vágóvonalként – a fedvény színe lényegtelen, a NÉV számít. A pdf-lib nem
 * ismer Separation színteret, ezért itt kézzel írjuk a PDF-objektumot:
 *   [/Separation /CutContour /DeviceCMYK <tintTransform: 100% magenta>]
 * és a tartalomfolyamban `/CutContour CS 1 SCN` állítja be a húzószínt.
 *
 * Koordináták: a lap mm-ben, felül-bal origó (mint az SVG); a PDF alul-bal
 * origójú pontokban (1 mm = 72/25,4 pt) – a lap magasságából tükrözünk.
 */
import { createRequire } from 'node:module';
import {
  PDFDocument, PDFName, PDFNumber, PDFOperator, PDFOperatorNames, PDFDict, StandardFonts, rgb,
  pushGraphicsState, popGraphicsState, translate, scale, setLineWidth, setLineJoin, LineJoinStyle, stroke,
} from 'pdf-lib';

const require = createRequire(import.meta.url);
// a pdf-lib SVG-path fordítója nincs a publikus exportban – belső modul, verzióhoz kötve (package.json)
const { svgPathToOperators } = require('pdf-lib/cjs/api/svgPath.js');

const MM = 72 / 25.4;
export const CUT_SPOT_NAME = 'CutContour';

function separationColorSpace(context) {
  const tint = context.obj({
    FunctionType: 2, Domain: [0, 1], C0: [0, 0, 0, 0], C1: [0, 1, 0, 0], N: 1,
  });
  const cs = context.obj([PDFName.of('Separation'), PDFName.of(CUT_SPOT_NAME), PDFName.of('DeviceCMYK'), context.register(tint)]);
  return context.register(cs);
}

function registerColorSpace(page, name, ref) {
  const resources = page.node.Resources() ?? page.node.context.obj({});
  page.node.set(PDFName.of('Resources'), resources);
  let csDict = resources.lookupMaybe(PDFName.of('ColorSpace'), PDFDict);
  if (!csDict) { csDict = page.node.context.obj({}); resources.set(PDFName.of('ColorSpace'), csDict); }
  csDict.set(PDFName.of(name), ref);
}

/**
 * @param {object} p
 * @param {number} p.widthMm lapszélesség (tekercs)
 * @param {number} p.heightMm laphossz
 * @param {Array<{png:Buffer|null, x:number, y:number, w:number, h:number, cutPathMm:string, label:string}>} p.items
 * @param {{ title:string, subject:string, keywords?:string[] }} p.meta
 * @param {number} [p.cutLineWidthMm]
 * @returns {Promise<Uint8Array>}
 */
export async function composePdf({ widthMm, heightMm, items, meta, cutLineWidthMm = 0.25 }) {
  const doc = await PDFDocument.create();
  doc.setTitle(meta.title);
  doc.setSubject(meta.subject);
  doc.setProducer('Scoover konfigurátor – nyomdai render');
  doc.setCreator('scoover-print');
  if (meta.keywords) doc.setKeywords(meta.keywords);
  const page = doc.addPage([widthMm * MM, heightMm * MM]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const csRef = separationColorSpace(doc.context);
  registerColorSpace(page, CUT_SPOT_NAME, csRef);
  const pageHpt = heightMm * MM;

  // 1) nyomat: raszterek
  for (const it of items) {
    if (!it.png) continue;
    const img = await doc.embedPng(it.png);
    page.drawImage(img, { x: it.x * MM, y: pageHpt - (it.y + it.h) * MM, width: it.w * MM, height: it.h * MM });
  }

  // 2) vágóvonalak: külön "réteg" a nyomat fölött, CutContour spot-színnel
  for (const it of items) {
    page.pushOperators(
      pushGraphicsState(),
      translate(0, pageHpt),
      scale(MM, -MM),
      PDFOperator.of(PDFOperatorNames.StrokingColorspace, [PDFName.of(CUT_SPOT_NAME)]),
      PDFOperator.of(PDFOperatorNames.StrokingColorN, [PDFNumber.of(1)]),
      setLineWidth(cutLineWidthMm),
      setLineJoin(LineJoinStyle.Round),
      ...svgPathToOperators(it.cutPathMm),
      stroke(),
      popGraphicsState(),
    );
  }

  // 3) apró azonosító feliratok a darabok mellé (a vágóvonalon KÍVÜL, a hézagban)
  for (const it of items) {
    if (!it.label) continue;
    page.drawText(it.label, {
      x: it.x * MM, y: pageHpt - (it.y - 1.2) * MM, size: 6, font, color: rgb(0.35, 0.35, 0.35),
    });
  }
  page.drawText(`${meta.title} · ${new Date().toISOString().slice(0, 10)} · CutContour = vágóvonal · lap ${Math.round(widthMm)}×${Math.round(heightMm)} mm`, {
    x: 4 * MM, y: 2.5 * MM, size: 7, font, color: rgb(0.35, 0.35, 0.35),
  });

  // objektumfolyamok nélkül: a Separation/CutContour szótár nyers szövegként is
  // ellenőrizhető (grep), és minden RIP biztosan olvassa
  return doc.save({ useObjectStreams: false });
}
