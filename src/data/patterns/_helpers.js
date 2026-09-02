/**
 * Segédfüggvények procedurális (kliens oldalon generált) SVG mintacsempékhez.
 *
 * A minták SVG markup-stringként vannak leírva, amit a PatternDefs komponens
 * egy `<pattern>` elembe illeszt. A `__ID__` helyőrzőt a komponens cseréli le
 * a tényleges, egyedi pattern-azonosítóra (így belső gradiens-id-k nem ütköznek
 * ha ugyanaz a minta egyszerre a galéria-bélyegképen és a fő vásznon is fut).
 */

/** Determinisztikus pszeudo-véletlen (mulberry32) – ugyanaz a seed, ugyanaz a minta. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f1 = (n) => Math.round(n * 10) / 10;

/**
 * Sima, zárt "folt" (blob) path pontok alapján – kvadratikus Bézier-ívekkel
 * a pontok felezőpontjain át. Camo-foltokhoz, terepvonalakhoz.
 */
export function smoothClosedPath(points) {
  const n = points.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M ${f1(mid(points[0], points[1])[0])} ${f1(mid(points[0], points[1])[1])}`;
  for (let i = 1; i <= n; i++) {
    const p = points[i % n];
    const m = mid(p, points[(i + 1) % n]);
    d += ` Q ${f1(p[0])} ${f1(p[1])} ${f1(m[0])} ${f1(m[1])}`;
  }
  return d + ' Z';
}

/** Szabálytalan folt pontjai: `cx,cy` körül, `r` átlagsugárral, `k` csúccsal. */
export function blobPoints(cx, cy, r, k, random, scale = 1) {
  const pts = [];
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2;
    const rr = r * (0.65 + random() * 0.7) * scale;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}

/**
 * Egy elemet 3×3-as eltolással megismétel, hogy a csempe széleit átlépő alakzatok
 * a túloldalon folytatódjanak → varrat nélküli (seamless) csempe.
 */
export function wrapTile(inner, w, h) {
  const out = [];
  for (const dx of [-w, 0, w]) {
    for (const dy of [-h, 0, h]) {
      out.push(`<g transform="translate(${dx} ${dy})">${inner}</g>`);
    }
  }
  return out.join('');
}

/** Hatszög path (csúcsával felfelé), `s` sugárral. */
export function hexPath(cx, cy, s) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    pts.push(`${f1(cx + s * Math.cos(a))} ${f1(cy + s * Math.sin(a))}`);
  }
  return `M ${pts.join(' L ')} Z`;
}
