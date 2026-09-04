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
 * defaultLabel (ide kerül alapból a felirat), footboard (külön anyagból készülő,
 * külön árazott taposófelület), priceGroup (darabonkénti árcsoport id-ja,
 * lásd src/pricing.js PRICE_GROUPS), d (SVG path).
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
    {"type":"circle","cx":835.9,"cy":533.3,"r":6,"fill":"lamp"},
    {"type":"path","d":"M 740 643 l 6 5 l -12 5 l 12 5 l -12 5 l 6 4","stroke":"spring","strokeWidth":5,"over":true},
    {"type":"circle","cx":682,"cy":677,"r":6,"fill":"hub","over":true},
  ],

  /** Fóliázható darabok – a valódi rendszerben ezek a vágókontúrok. */
  pieces: [
    {
      id: "display",
      name: "Kormány-középrész (kijelzőborítás)",
      group: "front",
      explode: [26.8,-48],
      size: "medium",
      priceGroup: "display",
      d: "M 669 33 L 785 33 L 781 55 L 673 55 Z",
    },
    {
      id: "stem",
      name: "Kormányoszlop",
      group: "front",
      explode: [42.3,-35.1],
      size: "large",
      labelAngle: -98.9,
      priceGroup: "stem",
      d: "M 801.6 424.6 L 741.8 44.7 L 712.2 49.3 L 771.9 429.2 Z",
    },
    {
      id: "joint",
      name: "Csuklóborítás (hajtás)",
      group: "front",
      explode: [54.7,5.8],
      size: "medium",
      labelAngle: -98.9,
      priceGroup: "joint",
      d: "M 746 446 L 812 446 L 814 513 L 744 513 Z",
    },
    {
      id: "fork",
      name: "Első lengőkar-borítás (C-futómű)",
      group: "front",
      explode: [39.8,37.9],
      size: "large",
      priceGroup: "fork",
      d: "M 679 662 L 722 674 L 772 690 L 814 701 L 830 705 L 844 709 L 847 719 L 830 725 L 772 727 L 722 725 L 687 715 L 677 692 Z",
    },
    {
      id: "neck",
      name: "Dekk-nyak / első lengőkar-borítás",
      group: "deck",
      explode: [47.5,27.8],
      size: "large",
      priceGroup: "neck",
      d: "M 820 515 L 757 515 L 757 518 L 750 523 L 745 522 L 746 515 L 737 515 L 736 536 L 733 540 L 733 544 L 695 588 L 664 647 L 692 689 L 744 677 L 745 673 L 741 671 L 740 663 L 744 660 L 744 652 L 749 646 L 746 636 L 753 627 L 758 625 L 822 525 Z",
    },
    {
      id: "deck-top",
      name: "Dekk teteje (állófelület)",
      group: "deck",
      explode: [5.3,54.7],
      size: "medium",
      /** Külön, kültéri csúszásgátló anyagból készül – opcionális extra (lásd pricing.js). */
      footboard: true,
      d: "M 364 620 L 670 620 L 678 634 L 356 634 Z",
    },
    {
      id: "deck-side",
      name: "Dekk oldala",
      group: "deck",
      explode: [4.4,54.8],
      size: "large",
      defaultLabel: true,
      priceGroup: "deck-side",
      d: "M 356 636 L 678 636 L 672 687 L 362 687 Z",
    },
    {
      id: "battery",
      name: "Akkudoboz alja",
      group: "deck",
      explode: [3.7,54.9],
      size: "medium",
      /** Ideiglenesen a "Dekk oldala" árcsoportba sorolva (a dekk alsó
       *  fóliázott felülete) – a valódi vágófájl megérkeztével pontosítható. */
      priceGroup: "deck-side",
      d: "M 374 690 L 660 690 L 648 709 L 386 709 Z",
    },
    {
      id: "rear-swingarm",
      name: "Hátsó lengőkar-borítás",
      group: "rear",
      explode: [-40.6,37.1],
      size: "large",
      priceGroup: "rear-swingarm",
      d: "M 358 644 L 358 687 L 174 730 A 30 30 0 1 1 174 674 Z",
    },
    {
      id: "rear-fender",
      name: "Hátsó sárvédő",
      group: "rear",
      explode: [-49.1,24.8],
      size: "large",
      priceGroup: "rear-fender",
      d: "M 67 604 L 122 596 L 185 593 L 227 609 L 240 632 L 234 649 L 132 650 L 72 645 Z",
    },
  ],
};
