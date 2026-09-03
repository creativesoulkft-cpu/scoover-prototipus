/**
 * GRIP – csúszásgátló, domborított textúrák a taposófelülethez (`deck-top`,
 * `standingSurface: true`).
 *
 * Ez a három minta más anyagot jelöl (strukturált, recézett fólia), nem a
 * PRINT/SOLID vonal folytatása – ezért induló készletnek elég procedurális
 * SVG-vel, ugyanazzal a csempe-motorral, mint a carbon-3d.js/hex-tech.js.
 * Amint lesz valódi fotózott/domborított textúra, image-tile-lá cserélhető
 * (lásd print-textures.js mintáját).
 */
const grad = (id, x2, y2, light, dark) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">` +
  `<stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient>`;

/** Gyémántlemez – dupla, egymásra merőleges rombusz-dombormű, mint a valódi anti-slip lemezeken. */
const diamond = (() => {
  const s = 16; // rombusz fél-átló
  const W = s * 2;
  const H = s * 2;
  return {
    id: 'antislip-diamond',
    name: 'Csúszásgátló · Gyémántlemez',
    line: 'grip',
    category: 'antislip',
    luminance: 0.22,
    type: 'tile',
    tile: {
      width: W,
      height: H,
      markup:
        `<defs>${grad('__ID__-a', 1, 1, '#7a828c', '#2b2f34')}${grad('__ID__-b', 0, 1, '#4a4f56', '#16181b')}</defs>` +
        `<rect width="${W}" height="${H}" fill="#1c1e21"/>` +
        `<path d="M ${s} 0 L ${W} ${s} L ${s} ${H} L 0 ${s} Z" fill="url(#__ID__-a)"/>` +
        `<path d="M ${s} 4 L ${W - 4} ${s} L ${s} ${H - 4} L 4 ${s} Z" fill="url(#__ID__-b)" opacity="0.6"/>`,
    },
  };
})();

/** Hatszög-recés – sűrű, kerek dudorrács, mint a gördeszka-/motoros grip-tape. */
const hexGrip = (() => {
  const s = 9;
  const w = Math.sqrt(3) * s;
  const W = 2 * w;
  const H = 3 * s;
  const dot = (cx, cy) =>
    `<circle cx="${cx}" cy="${cy}" r="${s * 0.62}" fill="url(#__ID__-dot)"/>` +
    `<circle cx="${cx - 1}" cy="${cy - 1}" r="${s * 0.3}" fill="#ffffff" opacity="0.18"/>`;
  return {
    id: 'antislip-hex',
    name: 'Csúszásgátló · Hatszög-recés',
    line: 'grip',
    category: 'antislip',
    luminance: 0.18,
    type: 'tile',
    tile: {
      width: W,
      height: H,
      markup:
        `<defs><radialGradient id="__ID__-dot" cx="0.35" cy="0.3" r="0.75">` +
        `<stop offset="0" stop-color="#5a6069"/><stop offset="1" stop-color="#1a1c1f"/></radialGradient></defs>` +
        `<rect width="${W}" height="${H}" fill="#131416"/>` +
        dot(0, 0) + dot(w, 0) + dot(W, 0) +
        dot(w / 2, 1.5 * s) + dot(1.5 * w, 1.5 * s) +
        dot(0, 3 * s) + dot(w, 3 * s) + dot(W, 3 * s),
    },
  };
})();

/** Bordázott csík – átlós, egyenletes rovátkák, mint a szélesebb tapadó sávok. */
const ribbed = (() => {
  const W = 18;
  const H = 18;
  return {
    id: 'antislip-line',
    name: 'Csúszásgátló · Bordázott csík',
    line: 'grip',
    category: 'antislip',
    luminance: 0.16,
    type: 'tile',
    tile: {
      width: W,
      height: H,
      markup:
        `<defs>${grad('__ID__-r', 1, 0.4, '#6a7078', '#1a1c1f')}</defs>` +
        `<rect width="${W}" height="${H}" fill="#131416"/>` +
        `<g transform="rotate(45 ${W / 2} ${H / 2})">` +
        [0, 6, 12, -6, -12, 18, -18].map((o) =>
          `<rect x="${o}" y="-10" width="4" height="${H + 20}" fill="url(#__ID__-r)"/>`,
        ).join('') +
        `</g>`,
    },
  };
})();

export default [diamond, hexGrip, ribbed];
