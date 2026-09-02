/**
 * Kukirin G2 – fotós nézet (termékfotó + kézzel körberajzolt darab-maszkok).
 *
 * A koordináták a fotó pixelei (1032×863). A darab-id-k megegyeznek a vázlat
 * (és a vágófájl) id-jaival, így a darab-kikapcsolás és a felirat céldarabja
 * mindkét nézetben ugyanaz. A `patternTransform` a felület dőlése szerint
 * ferdíti a mintát, a `labelAngle` a felirat irányát adja.
 *
 * Első tesztkör: a maszkok kb. ±3 px pontosságúak; a gyári grafika (narancs
 * kockák, "Kukirin G2" felirat) a fotón marad, az árnyalás-rétegen halványan
 * átüthet – csupasz rollerről készült fotóval ez eltűnik.
 */
export default {
  image: 'models/kukirin-g2-photo.jpg',
  viewBox: { width: 1032, height: 863 },
  shading: { blend: 'overlay', gamma: 0.5, opacity: 0.95 },
  pieces: [
    { id: 'display', name: 'Kormány-középrész (kijelzőborítás)', group: 'front', size: 'small',
      d: 'M 750 45 L 778 40 L 783 98 L 752 100 Z' },
    { id: 'stem', name: 'Kormányoszlop', group: 'front', size: 'medium', labelAngle: -100,
      patternTransform: 'skewX(-10)',
      d: 'M 700 100 L 748 100 L 810 497 L 766 497 Z' },
    { id: 'joint', name: 'Csuklóborítás (hajtás)', group: 'front', size: 'small',
      d: 'M 780 498 L 832 498 L 836 565 L 778 565 Z' },
    { id: 'neck', name: 'Dekk-nyak / első lengőkar-borítás', group: 'deck', size: 'medium',
      patternTransform: 'skewX(-28)',
      d: 'M 765 562 L 850 562 L 776 690 L 770 728 L 722 740 L 696 700 Z' },
    { id: 'fork', name: 'Első villaborítás', group: 'front', size: 'small',
      d: 'M 822 598 L 850 598 L 850 700 L 822 700 Z' },
    { id: 'deck-top', name: 'Dekk teteje (állófelület)', group: 'deck', size: 'medium',
      d: 'M 393 680 L 690 680 L 700 700 L 393 700 Z' },
    { id: 'deck-side', name: 'Dekk oldala', group: 'deck', size: 'large', defaultLabel: true,
      d: 'M 400 702 L 700 702 L 700 762 L 400 762 Z' },
    { id: 'rear-swingarm', name: 'Hátsó lengőkar-borítás', group: 'rear', size: 'medium',
      d: 'M 400 722 L 400 762 L 265 785 L 215 785 L 202 765 L 220 742 L 265 735 Z' },
    { id: 'front-swingarm', name: 'Első lengőkar-borítás', group: 'front', size: 'small',
      patternTransform: 'skewY(20)',
      d: 'M 720 720 L 750 715 L 860 765 L 880 777 L 875 795 L 850 795 L 740 765 L 715 750 Z' },
    { id: 'rear-fender', name: 'Hátsó sárvédő', group: 'rear', size: 'small',
      d: 'M 127 700 L 145 675 L 175 660 L 207 656 L 235 662 L 250 672 L 250 690 L 232 682 L 207 677 L 180 681 L 155 692 L 142 710 Z' },
  ],
};
