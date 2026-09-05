/**
 * Egy SVG path befoglaló dobozának becslése a `d` stringből, DOM nélkül.
 *
 * Miért nem getBBox: a "fő darab" pozicionálásához (a feltöltött kép lényege
 * melyik darabra essen) akkor is kell a darab középpontja, amikor az adott
 * darab épp nincs kirajzolva (más nézet van aktív, vagy ki van kapcsolva).
 *
 * A projekt path-jai M / L / H / V / A / Z parancsokból állnak. Az ívnél (A)
 * csak a végpontot vesszük figyelembe, nem az ív kidudorodását – a doboz így
 * néhány pixellel kisebb lehet a valósnál, ami a KÖZÉPPONT becsléséhez bőven
 * elég (a fókusz úgyis csúszkákkal finomítható).
 */

const NUM = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;

export function pathBBox(d) {
  if (typeof d !== 'string' || !d) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let cx = 0, cy = 0;
  const add = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  };

  for (const [, cmd, argsRaw] of d.matchAll(/([MmLlHhVvAaZz])([^MmLlHhVvAaZz]*)/g)) {
    const n = (argsRaw.match(NUM) ?? []).map(Number);
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case 'M':
      case 'L':
        for (let i = 0; i + 1 < n.length; i += 2) {
          cx = rel ? cx + n[i] : n[i];
          cy = rel ? cy + n[i + 1] : n[i + 1];
          add(cx, cy);
        }
        break;
      case 'H':
        for (const v of n) { cx = rel ? cx + v : v; add(cx, cy); }
        break;
      case 'V':
        for (const v of n) { cy = rel ? cy + v : v; add(cx, cy); }
        break;
      case 'A':
        // A rx ry xRot largeArc sweep x y – csak a végpont (utolsó két szám)
        for (let i = 0; i + 6 < n.length; i += 7) {
          cx = rel ? cx + n[i + 5] : n[i + 5];
          cy = rel ? cy + n[i + 6] : n[i + 6];
          add(cx, cy);
        }
        break;
      default: // Z: nincs új pont
        break;
    }
  }

  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY,
    cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

/**
 * Több darab (azonos árcsoport több fizikai darabja) együttes középpontja.
 * @param {{d:string}[]} pieces
 */
export function piecesCenter(pieces) {
  const boxes = pieces.map((p) => pathBBox(p.d)).filter(Boolean);
  if (!boxes.length) return null;
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}
