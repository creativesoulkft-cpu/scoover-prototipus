/**
 * Kukirin G2 Master – NYOMDAI GEOMETRIA (mm).
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
  "model": "kukirin-g2-master",
  "source": "placeholder",
  "sourceFile": null,
  "generatedAt": "2026-09-28T21:18:29.832Z",
  "unit": "mm",
  "bleedMm": 3,
  "safeMm": 2,
  "mmPerUnit": {
    "schematic": 1.2,
    "photo": 1.256,
    "footboard": 1
  },
  "pieces": [
    {
      "id": "display",
      "name": "Kormány-középrész (kijelzőborítás)",
      "priceGroup": "display",
      "size": "small",
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
          -818.4,
          -52.8
        ],
        "photo": [
          0.66,
          0,
          0,
          0.66,
          -384.81,
          -44.88
        ]
      }
    },
    {
      "id": "stem-upper",
      "name": "Kormányoszlop – felső",
      "priceGroup": "stem",
      "size": "small",
      "d": "M 58.56 83.04 L 34.56 0 L 0 10.08 L 24 93.12 Z",
      "widthMm": 58.56,
      "heightMm": 93.12,
      "quantity": 1,
      "mirror": false,
      "previewMaps": {
        "schematic": [
          1.2,
          0,
          0,
          1.2,
          -870.72,
          -64.56
        ]
      }
    },
    {
      "id": "stem-lower",
      "name": "Kormányoszlop – alsó",
      "priceGroup": "stem",
      "size": "small",
      "d": "M 58.56 83.04 L 34.56 0 L 0 10.08 L 23.88 93 Z",
      "widthMm": 58.56,
      "heightMm": 93,
      "quantity": 1,
      "mirror": false,
      "previewMaps": {
        "schematic": [
          1.2,
          0,
          0,
          1.2,
          -894.72,
          -147.6
        ]
      }
    },
    {
      "id": "joint",
      "name": "Csuklóborítás (hajtás)",
      "priceGroup": "joint",
      "size": "small",
      "d": "M 75.48 53.88 L 59.88 0 L 0 17.28 L 15.48 71.16 Z",
      "widthMm": 75.48,
      "heightMm": 71.16,
      "quantity": 1,
      "mirror": false,
      "previewMaps": {
        "schematic": [
          1.2,
          0,
          0,
          1.2,
          -907.32,
          -231.48
        ],
        "photo": [
          0.762,
          0,
          0,
          0.762,
          -586.304,
          -437.123
        ]
      }
    },
    {
      "id": "fork",
      "name": "Első villaborítás",
      "priceGroup": "fork",
      "size": "medium",
      "d": "M 83.64 130.2 L 46.08 0 L 0 13.32 L 37.56 143.4 Z",
      "widthMm": 83.64,
      "heightMm": 143.4,
      "quantity": 2,
      "mirror": true,
      "previewMaps": {
        "schematic": [
          1.2,
          0,
          0,
          1.2,
          -931.08,
          -291.84
        ],
        "photo": [
          1.34,
          0,
          0,
          1.34,
          -999.505,
          -936.791
        ]
      }
    },
    {
      "id": "neck",
      "name": "Dekk-nyak / első lengőkar-borítás",
      "priceGroup": "neck",
      "size": "large",
      "d": "M 0 136.2 L 4.8 203.4 L 153.48 62.88 L 135.36 0 Z",
      "widthMm": 153.48,
      "heightMm": 203.4,
      "quantity": 1,
      "mirror": false,
      "previewMaps": {
        "schematic": [
          1.2,
          0,
          0,
          1.2,
          -794.4,
          -300.6
        ],
        "photo": [
          1.256,
          0,
          0,
          1.256,
          -839.816,
          -826.156
        ]
      }
    },
    {
      "id": "deck-side",
      "name": "Dekk oldala",
      "priceGroup": "deck-side",
      "size": "large",
      "d": "M 0 0 L 528 0 L 520.8 52.8 L 7.2 52.8 Z",
      "widthMm": 528,
      "heightMm": 52.8,
      "quantity": 2,
      "mirror": true,
      "previewMaps": {
        "schematic": [
          1.2,
          0,
          0,
          1.2,
          -276,
          -451.2
        ],
        "photo": [
          0.812,
          0,
          0,
          0.812,
          -108.443,
          -678.277
        ]
      }
    },
    {
      "id": "battery",
      "name": "Akkudoboz alja",
      "priceGroup": "battery",
      "size": "large",
      "d": "M 0 0 L 484.8 0 L 470.4 22.8 L 14.4 22.8 Z",
      "widthMm": 484.8,
      "heightMm": 22.8,
      "quantity": 1,
      "mirror": false,
      "previewMaps": {
        "schematic": [
          1.2,
          0,
          0,
          1.2,
          -297.6,
          -507.6
        ]
      }
    },
    {
      "id": "rear-swingarm",
      "name": "Hátsó lengőkar-borítás",
      "priceGroup": "rear-swingarm",
      "size": "medium",
      "d": "M 113.724 0 L 113.724 43.2 L 48.924 91.2 A 36 36 0 1 1 48.924 24 Z",
      "widthMm": 113.724,
      "heightMm": 93.353,
      "quantity": 2,
      "mirror": true,
      "previewMaps": {
        "schematic": [
          1.2,
          0,
          0,
          1.2,
          -164.676,
          -460.8
        ],
        "photo": [
          1.094,
          0,
          0,
          1.094,
          -214.326,
          -853.274
        ]
      }
    },
    {
      "id": "rear-fender",
      "name": "Hátsó sárvédő",
      "priceGroup": "rear-fender",
      "size": "small",
      "d": "M 0 119.045 A 115.2 115.2 0 0 1 181.2 20.645 L 172.92 32.405 A 100.8 100.8 0 0 0 14.4 118.445 Z",
      "widthMm": 181.2,
      "heightMm": 119.045,
      "quantity": 1,
      "mirror": false,
      "previewMaps": {
        "schematic": [
          1.2,
          0,
          0,
          1.2,
          -86.52,
          -403.435
        ],
        "photo": [
          1.647,
          0,
          0,
          1.647,
          -125.193,
          -1318.421
        ]
      }
    },
    {
      "id": "front-fender",
      "name": "Első sárvédő",
      "priceGroup": "front-fender",
      "size": "small",
      "d": "M 0 0 A 115.2 115.2 0 0 1 118.2 131.16 L 103.92 129.12 A 100.8 100.8 0 0 0 0.6 14.4 Z",
      "widthMm": 119.268,
      "heightMm": 131.16,
      "quantity": 1,
      "mirror": false,
      "previewMaps": {
        "schematic": [
          1.2,
          0,
          0,
          1.2,
          -1013.52,
          -403.32
        ],
        "photo": [
          1.529,
          0,
          0,
          1.529,
          -1279.837,
          -1172.208
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
