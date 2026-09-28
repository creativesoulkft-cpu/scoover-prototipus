/**
 * Nyomtatási minőség becslése saját képnél – a kliens (élő visszajelzés az
 * EGYEDI fülön) és a szerver (manifest figyelmeztetés) ugyanezt számolja.
 *
 * A feltöltött kép a vázlat teljes nézetét ("cover" illesztéssel) fedi le,
 * erre jön a felhasználói nagyítás. Egy képpont fizikai mérete:
 *   mmPerPx = imgFit × scale × mmPerUnit
 * ahol imgFit = a nézet lefedéséhez szükséges lépték (nézet-egység / képpont).
 * Az effektív felbontás: 25,4 / mmPerPx dpi.
 *
 * Irányszámok vinyl-nyomtatáshoz (eco-solvent / latex, laminálva, ~1 m-ről nézve):
 *   ≥ 150 dpi: jó · 100–150: elfogadható, közelről szemcsés · < 100: nem javasolt
 */
export const DPI_GOOD = 150;
export const DPI_MIN = 100;

/**
 * @param {{width:number,height:number}} imagePx a feltöltött kép EREDETI pixelmérete
 * @param {{width:number,height:number}} viewBox a nézet (vázlat/fotó) mérete egységben
 * @param {number} scale a felhasználói nagyítás (transform.scale)
 * @param {number} mmPerUnit a nézet egy egysége milliméterben (modellenként, lásd model.printScale)
 * @returns {number|null} effektív dpi
 */
export function effectiveDpi(imagePx, viewBox, scale, mmPerUnit) {
  if (!imagePx?.width || !imagePx?.height || !viewBox || !mmPerUnit) return null;
  const imgFit = Math.max(viewBox.width / imagePx.width, viewBox.height / imagePx.height);
  const mmPerPx = imgFit * (scale || 1) * mmPerUnit;
  return mmPerPx > 0 ? Math.round(25.4 / mmPerPx) : null;
}

export function dpiVerdict(dpi) {
  if (dpi == null) return { level: 'unknown', text: 'nem becsülhető' };
  if (dpi >= DPI_GOOD) return { level: 'good', text: `${dpi} dpi – nyomdai minőség` };
  if (dpi >= DPI_MIN) return { level: 'ok', text: `${dpi} dpi – elfogadható, közelről kissé szemcsés lehet` };
  return { level: 'low', text: `${dpi} dpi – túl alacsony, tölts fel nagyobb képet vagy nagyíts kevésbé` };
}
