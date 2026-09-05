/**
 * Kukirin G2 Master – fotós nézet (termékfotó + darab-maszkok).
 *
 * GENERÁLT FÁJL: tools/photo-masks.py tools/photo-masks/kukirin-g2-master.json
 * A durva sokszögeket a JSON-ban kell szerkeszteni; a szkript a fotó
 * sziluettjére vágja őket, így a maszk nem lóg a háttérre.
 * Koordináták: fotó-pixel (1000×1042). A darab-id-k a vázlat/vágófájl id-jai.
 */
export default {
  image: 'models/kukirin-g2-master-photo.jpg',
  viewBox: { width: 1000, height: 1042 },
  shading: {"blend": "overlay", "gamma": 0.5, "opacity": 0.95},
  pieces: [
    { id: 'display', name: 'Kormány-középrész (kijelzőborítás)', group: 'front', size: 'small', priceGroup: 'display',
      d: 'M 708 68 L 686 70 L 684 76 L 680 79 L 667 80 L 665 78 L 668 108 L 712 105 Z' },
    { id: 'stem', name: 'Kormányoszlop', group: 'front', size: 'large', labelAngle: -100, patternTransform: 'skewX(-10)', priceGroup: 'stem',
      d: 'M 672 120 L 673 129 L 676 133 L 684 134 L 689 126 L 693 126 L 707 186 L 707 194 L 700 214 L 702 242 L 708 253 L 708 259 L 746 433 L 782 588 L 782 596 L 790 595 L 713 122 L 712 118 Z' },
    { id: 'joint', name: 'Csuklóborítás (hajtás)', group: 'front', size: 'small', priceGroup: 'joint',
      d: 'M 863 602 L 860 599 L 853 599 L 850 602 L 849 608 L 837 608 L 828 599 L 824 578 L 822 576 L 810 575 L 782 593 L 783 618 L 779 629 L 778 640 L 769 661 L 788 665 L 841 665 L 850 660 L 845 644 L 848 626 L 856 625 L 861 635 L 868 634 L 867 619 Z' },
    { id: 'fork', name: 'Első villaborítás', group: 'front', size: 'medium', patternTransform: 'skewY(20)', priceGroup: 'fork',
      d: 'M 785 655 L 768 693 L 769 704 L 764 708 L 761 757 L 786 732 L 791 732 L 792 738 L 761 767 L 760 787 L 765 850 L 801 880 L 855 860 L 860 801 L 834 810 L 829 810 L 818 796 L 806 770 L 806 763 L 834 734 L 849 730 L 840 665 L 805 659 L 804 663 L 791 663 L 790 656 Z' },
    { id: 'neck', name: 'Dekk-nyak / első lengőkar-borítás', group: 'deck', size: 'large', patternTransform: 'skewX(-28)', priceGroup: 'neck',
      d: 'M 790 660 L 770 658 L 760 681 L 745 700 L 740 721 L 730 740 L 684 784 L 670 820 L 675 820 L 716 779 L 760 720 L 767 706 L 755 717 L 750 716 L 750 711 L 761 691 L 766 691 L 769 695 L 769 702 L 775 690 L 775 678 L 777 673 L 780 670 L 785 670 Z' },
    { id: 'deck-top', name: 'Dekk teteje (állófelület)', group: 'deck', size: 'medium', footboard: true,
      d: 'M 270 805 L 275 838 L 705 833 L 700 808 L 675 808 L 668 823 L 661 825 L 629 824 L 626 822 L 616 823 L 615 825 L 513 826 L 508 825 L 507 823 L 495 823 L 494 825 L 465 827 L 304 828 L 299 826 L 301 816 L 298 813 L 282 805 Z' },
    { id: 'deck-side', name: 'Dekk oldala', group: 'deck', size: 'large', defaultLabel: true, priceGroup: 'deck-side',
      d: 'M 715 835 L 218 838 L 217 840 L 205 841 L 204 846 L 217 846 L 218 854 L 226 857 L 226 861 L 220 863 L 218 866 L 220 870 L 226 872 L 226 876 L 220 879 L 212 877 L 203 862 L 200 900 L 705 897 L 714 868 L 717 867 Z' },
    { id: 'rear-swingarm', name: 'Hátsó lengőkar-borítás', group: 'rear', size: 'medium', priceGroup: 'rear-swingarm',
      d: 'M 196 783 L 197 788 L 213 792 L 213 802 L 225 821 L 225 833 L 218 835 L 217 840 L 207 841 L 208 846 L 218 847 L 218 854 L 225 856 L 226 858 L 240 865 L 271 860 L 300 845 L 300 815 L 298 813 L 244 788 L 204 781 Z' },
    { id: 'rear-fender', name: 'Hátsó sárvédő', group: 'rear', size: 'small', priceGroup: 'rear-fender',
      d: 'M 76 835 L 96 834 L 133 837 L 184 850 L 186 847 L 186 843 L 177 839 L 176 844 L 163 844 L 152 839 L 138 836 L 137 831 L 141 828 L 141 826 L 136 825 L 135 823 L 104 825 Z' },
    { id: 'front-fender', name: 'Első sárvédő', group: 'front', size: 'small',
      d: 'M 837 808 L 915 820 L 909 811 L 906 802 L 895 799 L 863 800 Z' },
  ],
};
