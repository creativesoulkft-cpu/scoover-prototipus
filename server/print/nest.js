/**
 * Darabok elrendezése a tekercsen – egyszerű "polcos" (shelf) pakolás.
 *
 * A darabok (kifutós dobozukkal) magasság szerint csökkenő sorrendben,
 * balról jobbra sorokba kerülnek; ha egy darab nem fér a tekercs
 * szélességébe, 90°-kal elforgatjuk. A nyomda a PDF-ben átrendezheti –
 * a cél a helyes méret és a hézag, nem az optimális anyagfelhasználás.
 *
 * @param {Array<{key:string, w:number, h:number}>} items mm
 * @param {{ rollWidthMm:number, gapMm:number, marginMm:number }} opts
 * @returns {{ placements: Array<{key:string, x:number, y:number, w:number, h:number, rotated:boolean}>, lengthMm:number, usableWidthMm:number }}
 */
export function shelfPack(items, { rollWidthMm, gapMm, marginMm }) {
  const usable = rollWidthMm - 2 * marginMm;
  const prepared = items.map((it) => {
    const rotated = it.w > usable && it.h <= usable;
    if (it.w > usable && it.h > usable) throw new Error(`A(z) ${it.key} darab (${Math.round(it.w)}×${Math.round(it.h)} mm) nem fér a tekercsre (${rollWidthMm} mm).`);
    return { ...it, rotated, w: rotated ? it.h : it.w, h: rotated ? it.w : it.h };
  }).sort((a, b) => b.h - a.h || b.w - a.w);

  const placements = [];
  let shelfY = marginMm, shelfH = 0, cursorX = marginMm;
  for (const it of prepared) {
    if (cursorX + it.w > marginMm + usable) {
      shelfY += shelfH + gapMm;
      shelfH = 0;
      cursorX = marginMm;
    }
    placements.push({ key: it.key, x: cursorX, y: shelfY, w: it.w, h: it.h, rotated: it.rotated });
    cursorX += it.w + gapMm;
    shelfH = Math.max(shelfH, it.h);
  }
  const lengthMm = shelfY + shelfH + marginMm;
  return { placements, lengthMm, usableWidthMm: usable };
}
