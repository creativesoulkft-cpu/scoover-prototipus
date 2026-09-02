/**
 * Kukirin G2 Master – sematikus oldalnézeti vázlat.
 *
 * GENERÁLT FÁJL (tools/generate-schematic.js). Kézzel is szerkeszthető:
 * minden darab egy SVG path (`d`), ugyanabban a koordináta-rendszerben
 * (viewBox 1000×560). A valódi vágófájl importálásakor
 * csak a `d` stringek cserélődnek, a szerkezet marad.
 *
 * Darab-mezők: id, name, group, explode [dx,dy], size (large|medium|small –
 * a csempézett minta léptékéhez), labelAngle (felirat forgatása, opcionális),
 * defaultLabel (ide kerül alapból a felirat), d (SVG path).
 */
export default {
  id: "kukirin-g2-master",
  name: "Kukirin G2 Master",
  brand: "Kukirin",
  description: "Nagyobb kerekű, hosszabb dekkű változat, osztott kormányoszloppal – 12 darab.",
  view: 'side',
  viewBox: {"width":1000,"height":560},

  /** Nem fóliázott alkatrészek (kerék, felni, markolat) – csak vizuális kontextus. */
  decor: [
    {"type":"line","x1":40,"y1":512,"x2":960,"y2":512,"stroke":"ground"},
    {"type":"circle","cx":168,"cy":432,"r":78,"fill":"tire"},
    {"type":"circle","cx":168,"cy":432,"r":35.1,"fill":"rim"},
    {"type":"circle","cx":168,"cy":432,"r":7,"fill":"hub"},
    {"type":"circle","cx":848,"cy":432,"r":78,"fill":"tire"},
    {"type":"circle","cx":848,"cy":432,"r":35.1,"fill":"rim"},
    {"type":"circle","cx":848,"cy":432,"r":7,"fill":"hub"},
    {"type":"circle","cx":740,"cy":34,"r":9,"fill":"grip"},
    {"type":"line","x1":780,"y1":36,"x2":818,"y2":46,"stroke":"grip"},
    {"type":"circle","cx":818.3,"cy":213.7,"r":6,"fill":"lamp"},
  ],

  /** Fóliázható darabok – a valódi rendszerben ezek a vágókontúrok. */
  pieces: [
    {
      id: "display",
      name: "Kormány-középrész (kijelzőborítás)",
      group: "front",
      explode: [37.5,-40.3],
      size: "medium",
      d: "M 682 44 L 798 44 L 794 80 L 686 80 Z",
    },
    {
      id: "stem-upper",
      name: "Kormányoszlop – felső",
      group: "front",
      explode: [42.7,-34.7],
      size: "small",
      labelAngle: -106.1,
      d: "M 777.1 132.4 L 763.1 83.8 L 734.2 92.1 L 748.3 140.7 Z",
    },
    {
      id: "stem-lower",
      name: "Kormányoszlop – alsó",
      group: "front",
      explode: [48,-26.8],
      size: "small",
      labelAngle: -106.1,
      d: "M 794.4 192.2 L 778.2 136.1 L 749.3 144.4 L 765.5 200.5 Z",
    },
    {
      id: "joint",
      name: "Csuklóborítás (hajtás)",
      group: "front",
      explode: [52.1,-17.7],
      size: "small",
      labelAngle: -106.1,
      d: "M 819 237.8 L 806 192.9 L 756.1 207.3 L 769 252.2 Z",
    },
    {
      id: "fork",
      name: "Első villaborítás",
      group: "front",
      explode: [54.9,-3],
      size: "medium",
      labelAngle: -106.1,
      d: "M 845.6 351.7 L 814.3 243.2 L 775.9 254.3 L 807.2 362.7 Z",
    },
    {
      id: "neck",
      name: "Dekk-nyak / első lengőkar-borítás",
      group: "deck",
      explode: [54.9,3.5],
      size: "large",
      d: "M 662 364 L 666 420 L 789.9 302.9 L 774.8 250.5 Z",
    },
    {
      id: "deck-top",
      name: "Dekk teteje (állófelület)",
      group: "deck",
      explode: [-40.1,37.7],
      size: "medium",
      d: "M 238 360 L 662 360 L 670 374 L 230 374 Z",
    },
    {
      id: "deck-side",
      name: "Dekk oldala",
      group: "deck",
      explode: [-29.7,46.3],
      size: "large",
      defaultLabel: true,
      d: "M 230 376 L 670 376 L 664 420 L 236 420 Z",
    },
    {
      id: "battery",
      name: "Akkudoboz alja",
      group: "deck",
      explode: [-22.3,50.3],
      size: "large",
      d: "M 248 423 L 652 423 L 640 442 L 260 442 Z",
    },
    {
      id: "rear-swingarm",
      name: "Hátsó lengőkar-borítás",
      group: "rear",
      explode: [-52.3,17],
      size: "medium",
      d: "M 232 384 L 232 420 L 178 460 A 30 30 0 1 1 178 404 Z",
    },
    {
      id: "rear-fender",
      name: "Hátsó sárvédő",
      group: "rear",
      explode: [-54.8,4.8],
      size: "small",
      d: "M 72.1 435.4 A 96 96 0 0 1 223.1 353.4 L 216.2 363.2 A 84 84 0 0 0 84.1 434.9 Z",
    },
    {
      id: "front-fender",
      name: "Első sárvédő",
      group: "front",
      explode: [54.6,6.8],
      size: "small",
      d: "M 844.6 336.1 A 96 96 0 0 1 943.1 445.4 L 931.2 443.7 A 84 84 0 0 0 845.1 348.1 Z",
    },
  ],
};
