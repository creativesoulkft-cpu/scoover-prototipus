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
  // Tengelyszakaszok (villa/csukló/kormányoszlop) aránya a tengelyen –
  // modellenként felülírható, ha a valódi arányok eltérnek az alapértelmezettől.
  // A kormányoszlop alapból a "top" pontig ér (nem áll meg alatta), hogy a
  // kijelzőborítás alatt sose maradjon rés.
  const segT = { fork: [0.2, 0.49], joint: [0.5, 0.62], stem: [0.63, 1], ...p.segT };
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
  // A kijelzőborítás alja néhány pixellel a "top" pont (a kormányoszlop
  // tetejének) alá nyúlik, hogy sose maradjon rés a kormányoszlop és a
  // kijelzőborítás között, még kisebb tengely-elforgatásnál sem.
  const disp = [
    [top[0] - 58, top[1] - 14], [top[0] + 58, top[1] - 14],
    [top[0] + 54, top[1] + 8], [top[0] - 54, top[1] + 8],
  ];
  add('display', 'Kormány-középrész (kijelzőborítás)', 'front', disp);
  const [stemT0, stemT1] = segT.stem;
  if (splitStem) {
    const stemMid = (stemT0 + stemT1) / 2;
    add('stem-upper', 'Kormányoszlop – felső', 'front', axisQuad(stemMid, stemT1, 15));
    add('stem-lower', 'Kormányoszlop – alsó', 'front', axisQuad(stemT0, stemMid, 15));
  } else {
    add('stem', 'Kormányoszlop', 'front', axisQuad(stemT0, stemT1, 15));
  }
  // A csuklóborítás valódi, fotóból mért sziluettje, ha a modell megadja;
  // egyébként az egyszerű, tengelyre támaszkodó négyszög az alapértelmezett.
  add('joint', 'Csuklóborítás (hajtás)', 'front', p.jointPoints ?? axisQuad(...segT.joint, 26));
  // "C" futómű: a lengőkar NEM a kormányoszlop tengelyén ül, hanem attól
  // külön, a csuklóborítás/rugó alján lévő csuklópontból indul, és onnan
  // ível le a kerékagyig (egyoldali felfogás) – ha a modell megadja a valódi
  // sziluettet, azt használjuk, egyébként az egyszerű tengely-négyszög marad.
  add('fork', p.frontArmName ?? 'Első villaborítás', 'front', p.frontArmPoints ?? axisQuad(...segT.fork, 20));
  const lampT = p.lampT ?? (segT.joint[0] + segT.joint[1]) / 2;

  // --- dekk-nyak: a dekk elejétől a villa hátsó éléig ---
  const [dx0, dx1] = deck.x;
  // Valódi fotó alapján mért, a csuklóborítás melletti lengőkar-burkolatot is
  // magába foglaló forma – ha a modell megadja, azt használjuk; egyébként az
  // egyszerű, tengelyre támaszkodó négyszög az alapértelmezett.
  add('neck', 'Dekk-nyak / első lengőkar-borítás', 'deck', p.neckPoints ?? [
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

  // --- sárvédők ---
  const rOut = wheelR + 18, rIn = wheelR + 6;
  // A hátsó sárvédő valódi (szögletes, hegyes végű) sziluettje a fotóból mérve,
  // ha a modell megadja; egyébként az egyszerű gyűrűcikk az alapértelmezett.
  if (p.rearFenderPoints) {
    add('rear-fender', 'Hátsó sárvédő', 'rear', p.rearFenderPoints);
  } else {
    pieces.push({
      id: 'rear-fender', name: 'Hátsó sárvédő', group: 'rear',
      d: ringSector(rearHub, rOut, rIn, -182, -55),
      c: polar(rearHub, (rOut + rIn) / 2, -118),
      area: (127 / 360) * Math.PI * (rOut * rOut - rIn * rIn),
    });
  }
  // Első sárvédő: csak azoknál a modelleknél, amelyeknél ténylegesen van ilyen
  // burkolat a villán (alapértelmezésben igen; a Kukirin G2-nél nincs).
  if (p.frontFender !== false) {
    pieces.push({
      id: 'front-fender', name: 'Első sárvédő', group: 'front',
      d: ringSector(frontHub, rOut, rIn, -92, 8),
      c: polar(frontHub, (rOut + rIn) / 2, -42),
      area: (100 / 360) * Math.PI * (rOut * rOut - rIn * rIn),
    });
  }

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
  // a "C" lengőkar (frontArmPoints) nem a kormányoszlop tengelyén fekszik,
  // ezért nem kapja meg a tengely-feliratszöget
  const axisAlignedIds = ['stem', 'stem-upper', 'stem-lower', 'joint', ...(p.frontArmPoints ? [] : ['fork'])];
  for (const piece of pieces) {
    if (axisAlignedIds.includes(piece.id)) piece.labelAngle = axisAngle;
  }
  // a dekk a felirat alapértelmezett helye
  pieces.find((piece) => piece.id === 'deck-side').defaultLabel = true;
  // a taposófelület külön, kültéri csúszásgátló anyagból készül: opcionális,
  // külön árazott extra (lásd src/pricing.js), ezért meg van jelölve
  pieces.find((piece) => piece.id === 'deck-top').footboard = true;

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
    { type: 'circle', cx: r1(side(lampT, 32)[0]), cy: r1(side(lampT, 32)[1]), r: 6, fill: 'lamp' },
    // első felfüggesztés rugója (a lengőkar-burkolat és a dekk találkozásánál),
    // ha a modell megadja a helyét
    // (a fóliázott darabok fölé kerül, mert a valóságban is a burkolat előtt/mellett ül)
    ...(p.springAt ? [{
      type: 'path',
      d: `M ${pt(p.springAt)} l 6 5 l -12 5 l 12 5 l -12 5 l 6 4`,
      stroke: 'spring', strokeWidth: 5, over: true,
    }] : []),
    // a "C" lengőkar hátsó csuklópontja (a kormányoszlopétól független
    // forgáspont, amiből a kar a kerékagyig ível)
    ...(p.frontArmPivot ? [{ type: 'circle', cx: p.frontArmPivot[0], cy: p.frontArmPivot[1], r: 6, fill: 'hub', over: true }] : []),
  ];

  return { pieces, decor };
}

// ---------- modellek paraméterei ----------
const MODELS = [
  {
    // Geometria a termékfotóból (public/models/kukirin-g2-photo.jpg) mért
    // valódi arányok alapján (kerékméret, tengelyhossz/dőlésszög, dekkhossz),
    // hogy a vázlat felismerhetően ugyanazt a modellt ábrázolja, mint a fotó.
    id: 'kukirin-g2', name: 'Kukirin G2', brand: 'Kukirin',
    description: 'Kompakt, dupla felfüggesztésű városi roller – 10 fóliázható darab.',
    viewBox: { width: 1000, height: 820 },
    rearHub: [164, 702], frontHub: [830, 702], wheelR: 70,
    deck: { x: [362, 672], top: 622, bottom: 687 }, top: [727, 47],
    splitStem: false,
    // a villán nincs első sárvédő-burkolat a valóságban
    frontFender: false,
    // a csukló és a kormányoszlop a fotón mérthez képest jóval hosszabb/meredekebb
    // a kormányoszlop a "top" pontig ér (nem áll meg alatta), hogy a
    // kijelzőborítás alatt ne maradjon rés
    segT: { fork: [0.06, 0.28], joint: [0.19, 0.31], stem: [0.42, 1] },
    lampT: 0.25,
    // "C" futómű: a Kukirin G2-nek nem hagyományos, a kormányoszlop tengelyén
    // ülő villája van, hanem egyoldali C-lengőkarja – külön csuklópontból
    // (a rugó alján) ível le a kerékagyig, azt egyetlen ponton fogva közre
    // (nem kétoldali villával). A pontok a fotóból mérve, ugyanazzal a
    // (−28, −53) eltolással, mint a joint/neck/rearFender.
    frontArmName: 'Első lengőkar-borítás (C-futómű)',
    frontArmPivot: [682, 677],
    frontArmPoints: [
      [679, 662], [722, 674], [772, 690], [814, 701], [830, 705],
      [844, 709], [847, 719], [830, 725], [772, 727], [722, 725],
      [687, 715], [677, 692],
    ],
    // az első felfüggesztés rugójának teteje (a lengőkar-burkolat és a dekk
    // találkozásánál, a fotón jól látható tekercsrugó helyén)
    springAt: [740, 643],
    // a hátsó sárvédő szögletes, hegyes végű valódi sziluettje a fotóból mérve
    // (később fóliázható darabként tervezett elem, ezért fontos a pontos forma)
    rearFenderPoints: [
      [67, 604], [122, 596], [185, 593], [227, 609],
      [240, 632], [234, 649], [132, 650], [72, 645],
    ],
    // a csuklóborítás (fotómaszk: tools/photo-masks/kukirin-g2.json → joint)
    // és a dekk-nyak (→ neck) valódi, már a fotós nézetben is bevált sziluettje,
    // ugyanabból a koordináta-rendszerből (fotópixel − 28, − 53 eltolással)
    jointPoints: [
      [746, 446], [812, 446], [814, 513], [744, 513],
    ],
    neckPoints: [
      [820, 515], [757, 515], [757, 518], [750, 523], [745, 522], [746, 515],
      [737, 515], [736, 536], [733, 540], [733, 544], [695, 588], [664, 647],
      [692, 689], [744, 677], [745, 673], [741, 671], [740, 663], [744, 660],
      [744, 652], [749, 646], [746, 636], [753, 627], [758, 625], [822, 525],
    ],
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
 * defaultLabel (ide kerül alapból a felirat), footboard (külön anyagból készülő,
 * külön árazott taposófelület), d (SVG path).
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
      size: ${JSON.stringify(pc.size)},${pc.labelAngle !== undefined ? `\n      labelAngle: ${pc.labelAngle},` : ''}${pc.defaultLabel ? '\n      defaultLabel: true,' : ''}${pc.footboard ? '\n      footboard: true,' : ''}
      d: ${JSON.stringify(pc.d)},
    },`).join('\n')}
  ],
};
`;
  writeFileSync(new URL(`../src/data/models/${m.id}.js`, import.meta.url), out);
  console.log(`${m.id}: ${pieces.length} darab`);
}
