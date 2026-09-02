/**
 * Carbon 3D – klasszikus 2×2 vászonkötésű szénszál-hatás.
 * Két, egymásra merőleges gradiens-négyzet váltakozik; a csempe 20×20 egység.
 */
const grad = (id, x2, y2) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">` +
  `<stop offset="0" stop-color="#4a4c50"/><stop offset="0.45" stop-color="#1f2023"/>` +
  `<stop offset="1" stop-color="#050506"/></linearGradient>`;

export default {
  id: 'carbon-3d',
  name: 'Carbon 3D',
  category: 'tech',
  type: 'tile',
  tile: {
    width: 20,
    height: 20,
    markup:
      `<defs>${grad('__ID__-h', 0, 1)}${grad('__ID__-v', 1, 0)}</defs>` +
      `<rect width="20" height="20" fill="#0c0c0d"/>` +
      `<rect x="0" y="0" width="10" height="10" fill="url(#__ID__-h)"/>` +
      `<rect x="10" y="10" width="10" height="10" fill="url(#__ID__-h)"/>` +
      `<rect x="10" y="0" width="10" height="10" fill="url(#__ID__-v)"/>` +
      `<rect x="0" y="10" width="10" height="10" fill="url(#__ID__-v)"/>`,
  },
};
