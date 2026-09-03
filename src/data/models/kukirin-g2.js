/**
 * Kukirin G2 – sematikus oldalnézeti vázlat.
 *
 * GENERÁLT FÁJL (tools/generate-schematic.js). Kézzel is szerkeszthető:
 * minden darab egy SVG path (`d`), ugyanabban a koordináta-rendszerben
 * (viewBox 1000×820). A valódi vágófájl importálásakor
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
  description: "Kompakt, dupla felfüggesztésű városi roller – 10 fóliázható darab.",
  view: 'side',
  viewBox: {"width":1000,"height":820},

  /** Nem fóliázott alkatrészek (kerék, felni, markolat) – csak vizuális kontextus. */
  decor: [
    {"type":"line","x1":40,"y1":774,"x2":960,"y2":774,"stroke":"ground"},
    {"type":"circle","cx":164,"cy":702,"r":70,"fill":"tire"},
    {"type":"circle","cx":164,"cy":702,"r":31.5,"fill":"rim"},
    {"type":"circle","cx":164,"cy":702,"r":7,"fill":"hub"},
    {"type":"circle","cx":830,"cy":702,"r":70,"fill":"tire"},
    {"type":"circle","cx":830,"cy":702,"r":31.5,"fill":"rim"},
    {"type":"circle","cx":830,"cy":702,"r":7,"fill":"hub"},
    {"type":"circle","cx":727,"cy":23,"r":9,"fill":"grip"},
    {"type":"line","x1":767,"y1":25,"x2":805,"y2":35,"stroke":"grip"},
    {"type":"circle","cx":825.6,"cy":467.8,"r":6,"fill":"lamp"},
  ],

  /** Fóliázható darabok – a valódi rendszerben ezek a vágókontúrok. */
  pieces: [
    {
      id: "display",
      name: "Kormány-középrész (kijelzőborítás)",
      group: "front",
      explode: [27.2,-47.8],
      size: "medium",
      d: "M 669 33 L 785 33 L 781 69 L 673 69 Z",
    },
    {
      id: "stem",
      name: "Kormányoszlop",
      group: "front",
      explode: [43.8,-33.2],
      size: "large",
      labelAngle: -98.9,
      d: "M 801.6 424.6 L 747 77.4 L 717.3 82.1 L 771.9 429.2 Z",
    },
    {
      id: "joint",
      name: "Csuklóborítás (hajtás)",
      group: "front",
      explode: [54.8,4.2],
      size: "medium",
      labelAngle: -98.9,
      d: "M 824.8 501.5 L 814.5 436 L 763.1 444 L 773.4 509.5 Z",
    },
    {
      id: "fork",
      name: "Első villaborítás",
      group: "front",
      explode: [50.2,22.6],
      size: "large",
      labelAngle: -98.9,
      d: "M 843.6 659.6 L 820.9 515.5 L 781.4 521.7 L 804.1 665.8 Z",
    },
    {
      id: "neck",
      name: "Dekk-nyak / első lengőkar-borítás",
      group: "deck",
      explode: [47.9,27.1],
      size: "large",
      d: "M 814 507 L 755 507 L 670 624 L 728 607 L 674 687 L 760 635 L 767 621 L 804 604 L 824 556 Z",
    },
    {
      id: "deck-top",
      name: "Dekk teteje (állófelület)",
      group: "deck",
      explode: [5.3,54.7],
      size: "medium",
      d: "M 364 620 L 670 620 L 678 634 L 356 634 Z",
    },
    {
      id: "deck-side",
      name: "Dekk oldala",
      group: "deck",
      explode: [4.4,54.8],
      size: "large",
      defaultLabel: true,
      d: "M 356 636 L 678 636 L 672 687 L 362 687 Z",
    },
    {
      id: "battery",
      name: "Akkudoboz alja",
      group: "deck",
      explode: [3.7,54.9],
      size: "medium",
      d: "M 374 690 L 660 690 L 648 709 L 386 709 Z",
    },
    {
      id: "rear-swingarm",
      name: "Hátsó lengőkar-borítás",
      group: "rear",
      explode: [-40.6,37.1],
      size: "large",
      d: "M 358 644 L 358 687 L 174 730 A 30 30 0 1 1 174 674 Z",
    },
    {
      id: "rear-fender",
      name: "Hátsó sárvédő",
      group: "rear",
      explode: [-49.1,24.8],
      size: "large",
      d: "M 67 604 L 122 596 L 185 593 L 227 609 L 240 632 L 234 649 L 132 650 L 72 645 Z",
    },
  ],
};
