/**
 * Kukirin G2 – fotós nézet (termékfotó + darab-maszkok).
 *
 * GENERÁLT FÁJL: tools/photo-masks.py tools/photo-masks/kukirin-g2.json
 * A durva sokszögeket a JSON-ban kell szerkeszteni; a szkript a fotó
 * sziluettjére vágja őket, így a maszk nem lóg a háttérre.
 * Koordináták: fotó-pixel (1032×863). A darab-id-k a vázlat/vágófájl id-jai.
 */
export default {
  image: 'models/kukirin-g2-photo.jpg',
  viewBox: { width: 1032, height: 863 },
  shading: {"blend": "overlay", "gamma": 0.5, "opacity": 0.95},
  pieces: [
    { id: 'display', name: 'Kormány-középrész (kijelzőborítás)', group: 'front', size: 'small',
      d: 'M 767 39 L 748 42 L 750 104 L 760 103 L 771 95 L 777 87 L 779 76 L 786 75 L 785 65 L 780 64 L 775 60 Z' },
    { id: 'stem', name: 'Kormányoszlop', group: 'front', size: 'medium', labelAngle: -100, patternTransform: 'skewX(-10)',
      d: 'M 698 100 L 716 211 L 775 497 L 816 497 L 813 476 L 809 473 L 803 460 L 745 176 L 746 168 L 742 161 L 738 158 L 736 151 L 736 119 L 745 111 L 753 108 L 752 100 Z' },
    { id: 'joint', name: 'Csuklóborítás (hajtás)', group: 'front', size: 'small',
      d: 'M 775 499 L 778 510 L 779 535 L 772 550 L 772 566 L 775 565 L 778 555 L 783 556 L 785 566 L 842 566 L 842 550 L 835 532 L 827 499 Z' },
    { id: 'neck', name: 'Dekk-nyak / első lengőkar-borítás', group: 'deck', size: 'medium', patternTransform: 'skewX(-28)',
      d: 'M 846 561 L 842 560 L 842 565 L 837 566 L 833 565 L 831 560 L 783 560 L 785 571 L 778 576 L 774 576 L 773 569 L 776 560 L 768 560 L 764 573 L 764 589 L 761 593 L 761 597 L 698 671 L 698 705 L 709 705 L 752 653 L 757 654 L 756 660 L 720 705 L 772 705 L 778 698 L 778 696 L 774 693 L 774 689 L 781 680 L 786 681 L 784 704 L 788 705 L 788 688 L 795 674 L 815 656 L 821 656 L 822 658 L 832 657 L 832 650 L 834 648 L 851 642 L 849 622 L 852 609 L 852 592 Z' },
    { id: 'deck-top', name: 'Dekk teteje (állófelület)', group: 'deck', size: 'medium',
      d: 'M 390 701 L 702 701 L 693 678 L 682 686 L 628 686 L 625 684 L 584 685 L 396 682 L 394 676 L 391 676 Z' },
    { id: 'deck-side', name: 'Dekk oldala', group: 'deck', size: 'large', defaultLabel: true,
      d: 'M 398 762 L 401 760 L 402 756 L 408 754 L 433 754 L 436 758 L 439 758 L 442 755 L 455 755 L 458 757 L 458 766 L 470 766 L 469 758 L 472 755 L 664 756 L 671 757 L 673 760 L 692 760 L 695 757 L 700 730 L 702 729 L 702 702 L 398 702 Z' },
    { id: 'rear-swingarm', name: 'Hátsó lengőkar-borítás', group: 'rear', size: 'medium',
      d: 'M 397 720 L 271 731 L 222 737 L 217 739 L 198 766 L 212 790 L 270 790 L 302 784 L 307 778 L 310 761 L 319 762 L 323 767 L 325 775 L 372 763 L 373 760 L 382 762 L 397 762 Z' },
    { id: 'front-swingarm', name: 'Első lengőkar-borítás', group: 'front', size: 'small', patternTransform: 'skewY(20)',
      d: 'M 716 716 L 711 750 L 720 758 L 759 771 L 767 771 L 769 767 L 774 767 L 777 769 L 776 779 L 833 796 L 832 788 L 838 787 L 846 795 L 847 800 L 880 800 L 886 776 L 866 763 L 791 729 L 782 729 L 770 725 L 768 719 L 753 712 Z' },
    { id: 'rear-fender', name: 'Hátsó sárvédő', group: 'rear', size: 'small',
      d: 'M 256 680 L 246 675 L 238 675 L 236 673 L 236 658 L 207 656 L 187 659 L 161 672 L 157 672 L 141 687 L 140 691 L 128 707 L 142 714 L 155 694 L 179 683 L 204 679 L 233 684 L 256 694 Z' },
  ],
};
