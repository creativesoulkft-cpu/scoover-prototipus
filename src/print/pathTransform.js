/**
 * SVG path-ok geometriai átalakítása DOM nélkül – a nyomdai geometriához.
 *
 * - `parsePath(d)`        → abszolút parancsok listája (M, L, C, Q, A, Z; H/V → L)
 * - `transformPath(d, m)` → a path affin transzformációja (SVG matrix [a,b,c,d,e,f]);
 *                           ívnél (A) a sugarak az egyenletes léptékkel, tükrözésnél
 *                           a körüljárás (sweep) megfordul
 * - `pathBounds(d)`       → befoglaló doboz (ívek és görbék mintavételezésével, ±0,5%)
 * - `serializePath(cmds)` → visszaírás `d` stringgé, 3 tizedesre kerekítve
 *
 * Kliens (előnézet, dpi-becslés) és szerver (nyomdai render) is ezt használja.
 */

const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

/** @returns {Array<{c:string, p:number[]}>} abszolút parancsok */
export function parsePath(d) {
  const out = [];
  let x = 0, y = 0, sx = 0, sy = 0, lastCtrl = null, lastCmd = '';
  for (const [, cmd, argsRaw] of String(d).matchAll(/([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g)) {
    const n = (argsRaw.match(NUM) ?? []).map(Number);
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    let i = 0;
    const take = (k) => { const v = n.slice(i, i + k); i += k; return v; };
    if (C === 'Z') { out.push({ c: 'Z', p: [] }); x = sx; y = sy; lastCtrl = null; lastCmd = 'Z'; continue; }
    let first = true;
    while (i < n.length || (first && n.length === 0)) {
      first = false;
      if (C === 'M' || C === 'L') {
        const [px, py] = take(2);
        if (px === undefined) break;
        x = rel ? x + px : px; y = rel ? y + py : py;
        const cc = C === 'M' && out.length && lastCmd === 'M' ? 'L' : C;
        out.push({ c: cc, p: [x, y] });
        if (cc === 'M') { sx = x; sy = y; }
        lastCmd = cc; lastCtrl = null;
        // egy M után a további koordinátapárok L-ek
        if (C === 'M') lastCmd = 'M';
      } else if (C === 'H') {
        const [px] = take(1); if (px === undefined) break;
        x = rel ? x + px : px; out.push({ c: 'L', p: [x, y] }); lastCtrl = null; lastCmd = 'L';
      } else if (C === 'V') {
        const [py] = take(1); if (py === undefined) break;
        y = rel ? y + py : py; out.push({ c: 'L', p: [x, y] }); lastCtrl = null; lastCmd = 'L';
      } else if (C === 'C') {
        const v = take(6); if (v.length < 6) break;
        const p = rel ? [x + v[0], y + v[1], x + v[2], y + v[3], x + v[4], y + v[5]] : v;
        out.push({ c: 'C', p }); lastCtrl = [p[2], p[3]]; x = p[4]; y = p[5]; lastCmd = 'C';
      } else if (C === 'S') {
        const v = take(4); if (v.length < 4) break;
        const c1 = lastCmd === 'C' && lastCtrl ? [2 * x - lastCtrl[0], 2 * y - lastCtrl[1]] : [x, y];
        const p = rel ? [c1[0], c1[1], x + v[0], y + v[1], x + v[2], y + v[3]] : [c1[0], c1[1], ...v];
        out.push({ c: 'C', p }); lastCtrl = [p[2], p[3]]; x = p[4]; y = p[5]; lastCmd = 'C';
      } else if (C === 'Q') {
        const v = take(4); if (v.length < 4) break;
        const p = rel ? [x + v[0], y + v[1], x + v[2], y + v[3]] : v;
        out.push({ c: 'Q', p }); lastCtrl = [p[0], p[1]]; x = p[2]; y = p[3]; lastCmd = 'Q';
      } else if (C === 'T') {
        const v = take(2); if (v.length < 2) break;
        const c1 = lastCmd === 'Q' && lastCtrl ? [2 * x - lastCtrl[0], 2 * y - lastCtrl[1]] : [x, y];
        const p = rel ? [c1[0], c1[1], x + v[0], y + v[1]] : [c1[0], c1[1], ...v];
        out.push({ c: 'Q', p }); lastCtrl = [p[0], p[1]]; x = p[2]; y = p[3]; lastCmd = 'Q';
      } else if (C === 'A') {
        const v = take(7); if (v.length < 7) break;
        const ex = rel ? x + v[5] : v[5], ey = rel ? y + v[6] : v[6];
        out.push({ c: 'A', p: [v[0], v[1], v[2], v[3], v[4], ex, ey] });
        x = ex; y = ey; lastCtrl = null; lastCmd = 'A';
      } else break;
    }
  }
  return out;
}

const fmt = (n) => {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};

export function serializePath(cmds) {
  return cmds.map(({ c, p }) => (c === 'Z' ? 'Z' : `${c} ${p.map(fmt).join(' ')}`)).join(' ');
}

/** [a,b,c,d,e,f] · (x,y) */
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/**
 * Affin transzformáció. Ívnél feltételezzük, hogy a mátrix egyenletes lépték
 * (+ forgatás/tükrözés) – a vágófájl-illesztésnél csak ilyet használunk.
 */
export function transformPath(d, m) {
  const scale = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
  const mirrored = m[0] * m[3] - m[1] * m[2] < 0;
  const rot = (Math.atan2(m[1], m[0]) * 180) / Math.PI;
  const cmds = parsePath(d).map(({ c, p }) => {
    if (c === 'Z') return { c, p };
    if (c === 'A') {
      const [rx, ry, rotDeg, large, sweep, ex, ey] = p;
      const [tx, ty] = apply(m, ex, ey);
      return { c, p: [rx * scale, ry * scale, mirrored ? -(rotDeg + rot) : rotDeg + rot, large, mirrored ? 1 - sweep : sweep, tx, ty] };
    }
    const q = [];
    for (let i = 0; i < p.length; i += 2) q.push(...apply(m, p[i], p[i + 1]));
    return { c, p: q };
  });
  return serializePath(cmds);
}

/** Ív pontjai (SVG "endpoint" paraméterezés → középponti), mintavételezéshez. */
function arcPoints(x1, y1, rx, ry, rotDeg, large, sweep, x2, y2, steps = 16) {
  if (rx === 0 || ry === 0) return [[x2, y2]];
  const phi = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy, y1p = -sin * dx + cos * dy;
  let rxa = Math.abs(rx), rya = Math.abs(ry);
  const lambda = (x1p * x1p) / (rxa * rxa) + (y1p * y1p) / (rya * rya);
  if (lambda > 1) { rxa *= Math.sqrt(lambda); rya *= Math.sqrt(lambda); }
  const num = rxa * rxa * rya * rya - rxa * rxa * y1p * y1p - rya * rya * x1p * x1p;
  const den = rxa * rxa * y1p * y1p + rya * rya * x1p * x1p;
  let coef = Math.sqrt(Math.max(0, num / (den || 1)));
  if (large === sweep) coef = -coef;
  const cxp = (coef * rxa * y1p) / rya, cyp = (-coef * rya * x1p) / rxa;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => {
    const dot = ux * vx + uy * vy, len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    let a = Math.acos(Math.max(-1, Math.min(1, dot / (len || 1))));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };
  const t1 = ang(1, 0, (x1p - cxp) / rxa, (y1p - cyp) / rya);
  let dt = ang((x1p - cxp) / rxa, (y1p - cyp) / rya, (-x1p - cxp) / rxa, (-y1p - cyp) / rya);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const pts = [];
  for (let i = 1; i <= steps; i++) {
    const t = t1 + (dt * i) / steps;
    const ex = rxa * Math.cos(t), ey = rya * Math.sin(t);
    pts.push([cos * ex - sin * ey + cx, sin * ex + cos * ey + cy]);
  }
  return pts;
}

/** Befoglaló doboz: egyeneseknél pontos, íveknél/görbéknél mintavételezett. */
export function pathBounds(d) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let x = 0, y = 0;
  const add = (px, py) => { minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py); };
  for (const { c, p } of parsePath(d)) {
    if (c === 'Z') continue;
    if (c === 'M' || c === 'L') { x = p[0]; y = p[1]; add(x, y); }
    else if (c === 'C') {
      for (let t = 0.05; t <= 1; t += 0.05) {
        const u = 1 - t;
        add(u * u * u * x + 3 * u * u * t * p[0] + 3 * u * t * t * p[2] + t * t * t * p[4],
          u * u * u * y + 3 * u * u * t * p[1] + 3 * u * t * t * p[3] + t * t * t * p[5]);
      }
      x = p[4]; y = p[5];
    } else if (c === 'Q') {
      for (let t = 0.05; t <= 1; t += 0.05) {
        const u = 1 - t;
        add(u * u * x + 2 * u * t * p[0] + t * t * p[2], u * u * y + 2 * u * t * p[1] + t * t * p[3]);
      }
      x = p[2]; y = p[3];
    } else if (c === 'A') {
      for (const [ax, ay] of arcPoints(x, y, p[0], p[1], p[2], p[3], p[4], p[5], p[6])) add(ax, ay);
      x = p[5]; y = p[6];
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

/** Mátrixszorzás: A · B (először B, aztán A hat). */
export function multiply(a, b) {
  return [
    a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

export const IDENTITY = [1, 0, 0, 1, 0, 0];
export const translateM = (tx, ty) => [1, 0, 0, 1, tx, ty];
export const scaleM = (sx, sy = sx) => [sx, 0, 0, sy, 0, 0];
export const rotateM = (deg, cx = 0, cy = 0) => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return multiply(translateM(cx, cy), multiply([c, s, -s, c, 0, 0], translateM(-cx, -cy)));
};
export const matrixString = (m) => `matrix(${m.map(fmt).join(' ')})`;

/**
 * SVG transform-attribútum (translate/scale/rotate/skewX/skewY/matrix) → mátrix.
 * A vágófájl-importáló és a fotós nézet `patternTransform`-jának értelmezéséhez.
 */
export function parseTransform(str) {
  let m = IDENTITY;
  for (const [, fn, argsRaw] of String(str ?? '').matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const a = (argsRaw.match(NUM) ?? []).map(Number);
    let t = IDENTITY;
    if (fn === 'translate') t = translateM(a[0] ?? 0, a[1] ?? 0);
    else if (fn === 'scale') t = scaleM(a[0] ?? 1, a[1] ?? a[0] ?? 1);
    else if (fn === 'rotate') t = rotateM(a[0] ?? 0, a[1] ?? 0, a[2] ?? 0);
    else if (fn === 'skewX') t = [1, 0, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 1, 0, 0];
    else if (fn === 'skewY') t = [1, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0];
    else if (fn === 'matrix' && a.length === 6) t = a;
    m = multiply(m, t);
  }
  return m;
}
