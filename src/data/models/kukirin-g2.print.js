/**
 * Kukirin G2 – NYOMDAI GEOMETRIA (mm).
 *
 * GENERÁLT, HELYŐRZŐ fájl (tools/derive-print-placeholder.js): a vázlat
 * darabjaiból közelített kontúrok, 1 vázlat-egység = 1.2 mm. NEM gyártási
 * pontosságú – a valódi vágófájl importja (tools/import-cutfile.js) cseréli
 * le, a szerkezet változatlan marad.
 *
 * Darab-mezők: id (= a modell darab-id-ja), d (mm, saját origó), widthMm,
 * heightMm, quantity (bal/jobb), mirror (a 2. példány tükrözött),
 * previewMaps.<nézet>: affin mátrix [a,b,c,d,e,f] a nézet egységeiből ebbe
 * a mm-es térbe – a minta ezen keresztül kerül pontosan oda, ahol a vevő látta.
 */
export default {
  "model": "kukirin-g2",
  "source": "placeholder",
  "sourceFile": null,
  "generatedAt": "2026-09-28T21:18:29.828Z",
  "unit": "mm",
  "bleedMm": 3,
  "safeMm": 2,
  "mmPerUnit": {
    "schematic": 1.2,
    "photo": 1.179,
    "footboard": 1
  },
  "pieces": [
    {
      "id": "display",
      "name": "Kormány-középrész (kijelzőborítás)",
      "priceGroup": "display",
      "size": "medium",
      "d": "M 0 0 L 139.2 0 L 134.4 26.4 L 4.8 26.4 Z",
      "widthMm": 139.2,
      "heightMm": 26.4,
      "quantity": 1,
      "mirror": false,
      "previewMaps": {
        "schematic": [
          1.2,
          0,
          0,
          1.2,
          -802.8,
          -39.6
        ],
        "photo": [
          0.406,
          0,
          0,
          0.406,
          -241.92,
          -15.84
        ]
      }
    },
    {
      "id": "stem",
      "name": "Kormányoszlop",
      "priceGroup": "stem",
      "size": "large",
      "d": "M 107.28 455.88 L 35.52 0 L 0 5.52 L 71.64 461.4 Z",
      "widthMm": 107.28,
      "heightMm": 461.4,
      "quantity": 1,
      "mirror": false,
      "previewMaps": {
        "schematic": [
          1.2,
          0,
          0,
          1.2,
          -854.64,
          -53.64
        ],
        "photo": [
          0.909,
          0,
          0,
          0.909,
          -634.588,
          -40.682
        ]
      }
    },
    {
      "id": "joint",
      "name": "Csuklóborítás (hajtás)",
      "priceGroup": "joint",
      "size": "medium",
      "d": "M 2.4 0 L 81.6 0 L 84 80.4 L 0 80.4 Z",
      "widthMm": 84,
      "heightMm": 80.4,
      "quantity": 1,
      "mirror": false,
      "previewMaps": {
        "schematic": [
          1.2,
          0,
          0,
          1.2,
          -892.8,
          -535.2
        ],
        "photo": [
          1.2,
          0,
          0,
          1.2,
          -926.4,
          -598.8
        ]
      }
    },
    {
      "id": "fork",
      "name": "Első lengőkar-borítás (C-futómű)",
      "priceGroup": "fork",
      "size": "large",
      "d": "M 2.4 0 L 54 14.4 L 114 33.6 L 164.4 46.8 L 183.6 51.6 L 200.4 56.4 L 204 68.4 L 183.6 75.6 L 114 78 L 54 75.6 L 12 63.6 L 0 36 Z",
      "widthMm": 204,
      "heightMm": 78,
      "quantity": 2,
      "mirror": true,
      "previewMaps": {
        "schematic": [
          1.2,
          0,
          0,
          1.2,
          -812.4,
          -794.4
        ]
      }
    },
    {
      "id": "neck",
      "name": "Dekk-nyak / első lengőkar-borítás",
      "priceGroup": "neck",
      "size": "large",
      "d": "M 187.2 0 L 111.6 0 L 111.6 3.6 L 103.2 9.6 L 97.2 8.4 L 98.4 0 L 87.6 0 L 86.4 25.2 L 82.8 30 L 82.8 34.8 L 37.2 87.6 L 0 158.4 L 33.6 208.8 L 96 194.4 L 97.2 189.6 L 92.4 187.2 L 91.2 177.6 L 96 174 L 96 164.4 L 102 157.2 L 98.4 145.2 L 106.8 134.4 L 112.8 132 L 189.6 12 Z",
      "widthMm": 189.6,
      "heightMm": 208.8,
      "quantity": 1,
      "mirror": false,
      "previewMaps": {
        "schematic": [
          1.2,
          0,
          0,
          1.2,
          -796.8,
          -618
        ],
        "photo": [
          1.231,
          0,
          0,
          1.231,
          -859.356,
          -674.314
        ]
      }
    },
    {
      "id": "deck-side",
      "name": "Dekk oldala",
      "priceGroup": "deck-side",
      "size": "large",
      "d": "M 0 0 L 386.4 0 L 379.2 61.2 L 7.2 61.2 Z",
      "widthMm": 386.4,
      "heightMm": 61.2,
      "quantity": 2,
      "mirror": true,
      "previewMaps": {
        "schematic": [
          1.2,
          0,
          0,
          1.2,
          -427.2,
          -763.2
        ],
        "photo": [
          0.956,
          0,
          0,
          0.956,
          -332.738,
          -671.287
        ]
      }
    },
    {
      "id": "battery",
      "name": "Akkudoboz alja",
      "priceGroup": "battery",
      "size": "medium",
      "d": "M 0 0 L 343.2 0 L 328.8 22.8 L 14.4 22.8 Z",
      "widthMm": 343.2,
      "heightMm": 22.8,
      "quantity": 1,
      "mirror": false,
      "previewMaps": {
        "schematic": [
          1.2,
          0,
          0,
          1.2,
          -448.8,
          -828
        ]
      }
    },
    {
      "id": "rear-swingarm",
      "name": "Hátsó lengőkar-borítás",
      "priceGroup": "rear-swingarm",
      "size": "large",
      "d": "M 269.724 0 L 269.724 51.6 L 48.924 103.2 A 36 36 0 1 1 48.924 36 Z",
      "widthMm": 269.724,
      "heightMm": 105.353,
      "quantity": 2,
      "mirror": true,
      "previewMaps": {
        "schematic": [
          1.2,
          0,
          0,
          1.2,
          -159.876,
          -772.8
        ],
        "photo": [
          1.355,
          0,
          0,
          1.355,
          -268.369,
          -970.648
        ]
      }
    },
    {
      "id": "rear-fender",
      "name": "Hátsó sárvédő",
      "priceGroup": "rear-fender",
      "size": "large",
      "d": "M 0 13.2 L 66 3.6 L 141.6 0 L 192 19.2 L 207.6 46.8 L 200.4 67.2 L 78 68.4 L 6 62.4 Z",
      "widthMm": 207.6,
      "heightMm": 68.4,
      "quantity": 1,
      "mirror": false,
      "previewMaps": {
        "schematic": [
          1.2,
          0,
          0,
          1.2,
          -80.4,
          -711.6
        ],
        "photo": [
          1.179,
          0,
          0,
          1.179,
          -122.628,
          -773.628
        ]
      }
    },
    {
      "id": "deck-top",
      "name": "Dekk teteje (állófelület)",
      "priceGroup": null,
      "size": "medium",
      "footboard": true,
      "d": "M 28.08 0 H 615.92 A 28.08 28.08 0 0 1 644 28.08 V 127.92 A 28.08 28.08 0 0 1 615.92 156 H 28.08 A 28.08 28.08 0 0 1 0 127.92 V 28.08 A 28.08 28.08 0 0 1 28.08 0 Z",
      "widthMm": 644,
      "heightMm": 156,
      "quantity": 1,
      "mirror": false,
      "previewMaps": {
        "footboard": [
          1,
          0,
          0,
          1,
          0,
          0
        ]
      }
    }
  ]
};
