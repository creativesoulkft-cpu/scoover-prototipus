/**
 * Kukirin G2 – sematikus oldalnézeti vázlat.
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
import photoView from './kukirin-g2.photo.js';

export default {
  id: "kukirin-g2",
  photoView,
  name: "Kukirin G2",
  brand: "Kukirin",
  description: "Kompakt, dupla felfüggesztésű városi roller – 11 fóliázható darab.",
  view: 'side',
  viewBox: {"width":1000,"height":560},

  /** Nem fóliázott alkatrészek (kerék, felni, markolat) – csak vizuális kontextus. */
  decor: [
    {"type":"line","x1":40,"y1":512,"x2":960,"y2":512,"stroke":"ground"},
    {"type":"circle","cx":175,"cy":440,"r":70,"fill":"tire"},
    {"type":"circle","cx":175,"cy":440,"r":31.5,"fill":"rim"},
    {"type":"circle","cx":175,"cy":440,"r":7,"fill":"hub"},
    {"type":"circle","cx":830,"cy":440,"r":70,"fill":"tire"},
    {"type":"circle","cx":830,"cy":440,"r":31.5,"fill":"rim"},
    {"type":"circle","cx":830,"cy":440,"r":7,"fill":"hub"},
    {"type":"circle","cx":720,"cy":56,"r":9,"fill":"grip"},
    {"type":"line","x1":760,"y1":58,"x2":798,"y2":68,"stroke":"grip"},
    {"type":"circle","cx":799,"cy":229,"r":6,"fill":"lamp"},
  ],

  /** Fóliázható darabok – a valódi rendszerben ezek a vágókontúrok. */
  pieces: [
    {
      id: "display",
      name: "Kormány-középrész (kijelzőborítás)",
      group: "front",
      explode: [37.5,-40.2],
      size: "medium",
      d: "M 662 66 L 778 66 L 774 102 L 666 102 Z",
    },
    {
      id: "stem",
      name: "Kormányoszlop",
      group: "front",
      explode: [46.1,-30],
      size: "medium",
      labelAngle: -107,
      d: "M 775 208.8 L 743.1 104.4 L 714.5 113.2 L 746.4 217.6 Z",
    },
    {
      id: "joint",
      name: "Csuklóborítás (hajtás)",
      group: "front",
      explode: [52.6,-16],
      size: "medium",
      labelAngle: -107,
      d: "M 799.9 252.4 L 786.7 209.2 L 736.9 224.4 L 750.1 267.6 Z",
    },
    {
      id: "fork",
      name: "Első villaborítás",
      group: "front",
      explode: [55,-0.8],
      size: "medium",
      labelAngle: -107,
      d: "M 827.1 362.2 L 795.2 257.8 L 757 269.4 L 788.9 373.8 Z",
    },
    {
      id: "neck",
      name: "Dekk-nyak / első lengőkar-borítás",
      group: "deck",
      explode: [54.5,7.3],
      size: "large",
      d: "M 648 380 L 652 428 L 771.3 316.2 L 755.9 265.8 Z",
    },
    {
      id: "deck-top",
      name: "Dekk teteje (állófelület)",
      group: "deck",
      explode: [-34.2,43.1],
      size: "large",
      d: "M 252 376 L 648 376 L 656 390 L 244 390 Z",
    },
    {
      id: "deck-side",
      name: "Dekk oldala",
      group: "deck",
      explode: [-26.7,48.1],
      size: "large",
      defaultLabel: true,
      d: "M 244 392 L 656 392 L 650 428 L 250 428 Z",
    },
    {
      id: "battery",
      name: "Akkudoboz alja",
      group: "deck",
      explode: [-21.1,50.8],
      size: "large",
      d: "M 262 431 L 638 431 L 626 450 L 274 450 Z",
    },
    {
      id: "rear-swingarm",
      name: "Hátsó lengőkar-borítás",
      group: "rear",
      explode: [-51.6,19],
      size: "medium",
      d: "M 246 400 L 246 428 L 185 468 A 30 30 0 1 1 185 412 Z",
    },
    {
      id: "rear-fender",
      name: "Hátsó sárvédő",
      group: "rear",
      explode: [-54.5,7.1],
      size: "small",
      d: "M 87.1 443.1 A 88 88 0 0 1 225.5 367.9 L 218.6 377.7 A 76 76 0 0 0 99 442.7 Z",
    },
    {
      id: "front-fender",
      name: "Első sárvédő",
      group: "front",
      explode: [54.3,9],
      size: "small",
      d: "M 826.9 352.1 A 88 88 0 0 1 917.1 452.2 L 905.3 450.6 A 76 76 0 0 0 827.3 364 Z",
    },
  ],
};
