/**
 * Sematikus roller-vázlat generátor (fejlesztői segédeszköz).
 *
 * Ez a szkript NEM része a futó alkalmazásnak. Egyszerű paraméterekből
 * (kerékméret, dekk hossza, kormányoszlop teteje stb.) állít elő egy oldalnézeti
 * roller-vázlatot, ahol minden fóliázható darab egy SVG path (`d` string).
 *
 * A végleges rendszerben ezt a lépést a valódi vektoros vágófájl importálása
 * váltja ki: ott a `d` stringek közvetlenül a CAD/Illustrator exportból jönnek,
 * az adatszerkezet (src/data/models/*.js) viszont változatlan marad.
 *
 * Futtatás:  node tools/generate-schematic.js
 * Kimenet:   src/data/models/<id>.js
 */
import { writeFileSync, existsSync } from 'node:fs';

// ---------- geometriai segédfüggvények ----------
const r1 = (n) => Math.round(n * 10) / 10;
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`;
const polar = ([cx, cy], r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
const polygon = (pts) => `M ${pts.map(pt).join(' L ')} Z`;
/** Gyűrűcikk (sárvédő): külső ív a0→a1, belső ív vissza. */
const ringSector = (c, rOut, rIn, a0, a1) => {
  const large = a1 - a0 > 180 ? 1 : 0;
  return [
    `M ${pt(polar(c, rOut, a0))}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${pt(polar(c, rOut, a1))}`,
    `L ${pt(polar(c, rIn, a1))}`,
    `A ${rIn} ${rIn} 0 ${large} 0 ${pt(polar(c, rIn, a0))}`,
    'Z',
  ].join(' ');
};
/** Sokszög területe (shoelace). */
const polyArea = (pts) =>
  Math.abs(pts.reduce((a, p, i) => a + p[0] * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * p[1], 0)) / 2;
const centroid = (pts) => [
  pts.reduce((s, p) => s + p[0], 0) / pts.length,
  pts.reduce((s, p) => s + p[1], 0) / pts.length,
];

/**
 * Egy modell felépítése paraméterekből.
 * A "tengely" a első kerékagytól a kormány tetejéig húzott egyenes; a villa,
 * a csukló és a kormányoszlop ezen a tengelyen ülnek.
 */
function buildModel(p) {
  const { rearHub, frontHub, wheelR, deck, top, splitStem } = p;
  const axis = [top[0] - frontHub[0], top[1] - frontHub[1]];
  const len = Math.hypot(...axis);
  const dir = [axis[0] / len, axis[1] / len];
  const perp = [-dir[1], dir[0]]; // tengelyre merőleges (előre mutat)
  const at = (t) => [frontHub[0] + axis[0] * t, frontHub[1] + axis[1] * t];
  const side = (t, hw) => [at(t)[0] + perp[0] * hw, at(t)[1] + perp[1] * hw];
  const axisQuad = (t0, t1, hw) =>
    [side(t0, hw), side(t1, hw), side(t1, -hw), side(t0, -hw)];

  const pieces = [];
  const add = (id, name, group, pts, extra = {}) =>
    pieces.push({ id, name, group, d: polygon(pts), c: centroid(pts), area: polyArea(pts), ...extra });

  // --- kormány / oszlop ---
  const disp = [
    [top[0] - 58, top[1] - 14], [top[0] + 58, top[1] - 14],
    [top[0] + 54, top[1] + 22], [top[0] - 54, top[1] + 22],
  ];
  add('display', 'Kormány-középrész (kijelzőborítás)', 'front', disp);
  if (splitStem) {
    add('stem-upper', 'Kormányoszlop – felső', 'front', axisQuad(0.79, 0.92, 15));
    add('stem-lower', 'Kormányoszlop – alsó', 'front', axisQuad(0.63, 0.78, 15));
  } else {
    add('stem', 'Kormányoszlop', 'front', axisQuad(0.63, 0.92, 15));
  }
  add('joint', 'Csuklóborítás (hajtás)', 'front', axisQuad(0.5, 0.62, 26));
  add('fork', 'Első villaborítás', 'front', axisQuad(0.2, 0.49, 20));

  // --- dekk-nyak: a dekk elejétől a villa hátsó éléig ---
  const [dx0, dx1] = deck.x;
  add('neck', 'Dekk-nyak / első lengőkar-borítás', 'deck', [
    [dx1 - 2, deck.top + 2], [dx1 + 2, deck.bottom],
    side(0.36, -20), side(0.5, -20),
  ]);

  // --- dekk ---
  add('deck-top', 'Dekk teteje (állófelület)', 'deck', [
    [dx0 + 2, deck.top - 2], [dx1 - 2, deck.top - 2],
    [dx1 + 6, deck.top + 12], [dx0 - 6, deck.top + 12],
  ]);
  add('deck-side', 'Dekk oldala', 'deck', [
    [dx0 - 6, deck.top + 14], [dx1 + 6, deck.top + 14],
    [dx1, deck.bottom], [dx0, deck.bottom],
  ]);
  add('battery', 'Akkudoboz alja', 'deck', [
    [dx0 + 12, deck.bottom + 3], [dx1 - 12, deck.bottom + 3],
    [dx1 - 24, deck.bottom + 22], [dx0 + 24, deck.bottom + 22],
  ]);

  // --- hátsó lengőkar ---
  // Elkeskenyedő kar a dekktől a kerékagyig, kerek "dropout" véggel (ív).
  const [rx, ry] = rearHub;
  const armPts = [[dx0 - 4, deck.top + 22], [dx0 - 4, deck.bottom], [rx + 10, ry + 28], [rx + 10, ry - 28]];
  pieces.push({
    id: 'rear-swingarm', name: 'Hátsó lengőkar-borítás', group: 'rear',
    d: `M ${pt(armPts[0])} L ${pt(armPts[1])} L ${pt(armPts[2])} A 30 30 0 1 1 ${pt(armPts[3])} Z`,
    c: centroid([...armPts, [rx - 30, ry]]),
    area: polyArea(armPts) + Math.PI * 30 * 30 * 0.75,
  });

  // --- sárvédők (gyűrűcikkek) ---
  const rOut = wheelR + 18, rIn = wheelR + 6;
  pieces.push({
    id: 'rear-fender', name: 'Hátsó sárvédő', group: 'rear',
    d: ringSector(rearHub, rOut, rIn, -182, -55),
    c: polar(rearHub, (rOut + rIn) / 2, -118),
    area: (127 / 360) * Math.PI * (rOut * rOut - rIn * rIn),
  });
  pieces.push({
    id: 'front-fender', name: 'Első sárvédő', group: 'front',
    d: ringSector(frontHub, rOut, rIn, -92, 8),
    c: polar(frontHub, (rOut + rIn) / 2, -42),
    area: (100 / 360) * Math.PI * (rOut * rOut - rIn * rIn),
  });

  // --- szétnyitási (explode) irány: a modell középpontjától kifelé ---
  const center = [p.viewBox.width / 2, p.viewBox.height / 2 + 40];
  for (const piece of pieces) {
    const v = [piece.c[0] - center[0], piece.c[1] - center[1]];
    const l = Math.hypot(...v) || 1;
    piece.explode = [r1((v[0] / l) * 55), r1((v[1] / l) * 55)];
    delete piece.c;
  }

  // --- méretosztály (large/medium/small) a darab tényleges területe alapján ---
  // A csempézett minták léptéke ehhez igazodik (patternScale a kategóriában).
  const maxArea = Math.max(...pieces.map((piece) => piece.area));
  for (const piece of pieces) {
    const ratio = piece.area / maxArea;
    piece.size = ratio > 0.35 ? 'large' : ratio > 0.15 ? 'medium' : 'small';
    delete piece.area;
  }

  // --- felirat iránya: a tengelyen ülő darabokon a tengellyel párhuzamos ---
  const axisAngle = r1((Math.atan2(dir[1], dir[0]) * 180) / Math.PI);
  for (const piece of pieces) {
    if (['stem', 'stem-upper', 'stem-lower', 'fork', 'joint'].includes(piece.id)) piece.labelAngle = axisAngle;
  }
  // a dekk a felirat alapértelmezett helye
  pieces.find((piece) => piece.id === 'deck-side').defaultLabel = true;

  // --- nem fóliázott, csak kontextust adó alkatrészek ---
  const decor = [
    { type: 'line', x1: 40, y1: rearHub[1] + wheelR + 2, x2: p.viewBox.width - 40, y2: rearHub[1] + wheelR + 2, stroke: 'ground' },
    { type: 'circle', cx: rearHub[0], cy: rearHub[1], r: wheelR, fill: 'tire' },
    { type: 'circle', cx: rearHub[0], cy: rearHub[1], r: wheelR * 0.45, fill: 'rim' },
    { type: 'circle', cx: rearHub[0], cy: rearHub[1], r: 7, fill: 'hub' },
    { type: 'circle', cx: frontHub[0], cy: frontHub[1], r: wheelR, fill: 'tire' },
    { type: 'circle', cx: frontHub[0], cy: frontHub[1], r: wheelR * 0.45, fill: 'rim' },
    { type: 'circle', cx: frontHub[0], cy: frontHub[1], r: 7, fill: 'hub' },
    // kormányrúd vége (a nézővel szemben) + fék
    { type: 'circle', cx: top[0], cy: top[1] - 24, r: 9, fill: 'grip' },
    { type: 'line', x1: top[0] + 40, y1: top[1] - 22, x2: top[0] + 78, y2: top[1] - 12, stroke: 'grip' },
    // fényszóró a csukló elején
    { type: 'circle', cx: r1(side(0.56, 32)[0]), cy: r1(side(0.56, 32)[1]), r: 6, fill: 'lamp' },
  ];

  return { pieces, decor };
}

// ---------- modellek paraméterei ----------
const MODELS = [
  {
    id: 'kukirin-g2', name: 'Kukirin G2', brand: 'Kukirin',
    description: 'Kompakt, dupla felfüggesztésű városi roller – 11 fóliázható darab.',
    viewBox: { width: 1000, height: 560 },
    rearHub: [175, 440], frontHub: [830, 440], wheelR: 70,
    deck: { x: [250, 650], top: 378, bottom: 428 }, top: [720, 80],
    splitStem: false,
  },
  {
    id: 'kukirin-g2-master', name: 'Kukirin G2 Master', brand: 'Kukirin',
    description: 'Nagyobb kerekű, hosszabb dekkű változat, osztott kormányoszloppal – 12 darab.',
    viewBox: { width: 1000, height: 560 },
    rearHub: [168, 432], frontHub: [848, 432], wheelR: 78,
    deck: { x: [236, 664], top: 362, bottom: 420 }, top: [740, 58],
    splitStem: true,
  },
];

for (const m of MODELS) {
  const { pieces, decor } = buildModel(m);
  // Kézzel készített fotós nézet (maszkok a termékfotón): <id>.photo.js, ha létezik.
  const hasPhoto = existsSync(new URL(`../src/data/models/${m.id}.photo.js`, import.meta.url));
  const out = `/**
 * ${m.name} – sematikus oldalnézeti vázlat.
 *
 * GENERÁLT FÁJL (tools/generate-schematic.js). Kézzel is szerkeszthető:
 * minden darab egy SVG path (\`d\`), ugyanabban a koordináta-rendszerben
 * (viewBox ${m.viewBox.width}×${m.viewBox.height}). A valódi vágófájl importálásakor
 * csak a \`d\` stringek cserélődnek, a szerkezet marad.
 *
 * Darab-mezők: id, name, group, explode [dx,dy], size (large|medium|small –
 * a csempézett minta léptékéhez), labelAngle (felirat forgatása, opcionális),
 * defaultLabel (ide kerül alapból a felirat), d (SVG path).
 */
${hasPhoto ? `import photoView from './${m.id}.photo.js';\n\n` : ''}export default {
  id: ${JSON.stringify(m.id)},${hasPhoto ? '\n  photoView,' : ''}
  name: ${JSON.stringify(m.name)},
  brand: ${JSON.stringify(m.brand)},
  description: ${JSON.stringify(m.description)},
  view: 'side',
  viewBox: ${JSON.stringify(m.viewBox)},

  /** Nem fóliázott alkatrészek (kerék, felni, markolat) – csak vizuális kontextus. */
  decor: [
${decor.map((d) => `    ${JSON.stringify(d)},`).join('\n')}
  ],

  /** Fóliázható darabok – a valódi rendszerben ezek a vágókontúrok. */
  pieces: [
${pieces.map((pc) => `    {
      id: ${JSON.stringify(pc.id)},
      name: ${JSON.stringify(pc.name)},
      group: ${JSON.stringify(pc.group)},
      explode: ${JSON.stringify(pc.explode)},
      size: ${JSON.stringify(pc.size)},${pc.labelAngle !== undefined ? `\n      labelAngle: ${pc.labelAngle},` : ''}${pc.defaultLabel ? '\n      defaultLabel: true,' : ''}
      d: ${JSON.stringify(pc.d)},
    },`).join('\n')}
  ],
};
`;
  writeFileSync(new URL(`../src/data/models/${m.id}.js`, import.meta.url), out);
  console.log(`${m.id}: ${pieces.length} darab`);
}
