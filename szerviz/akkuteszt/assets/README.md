# Képek a jegyzőkönyvhöz

| Fájl | Mire való |
|------|-----------|
| `LOGO_Whoosh.ai` | eredeti Illustrator 8 logó (CorelDRAW export) |
| `whoosh-logo.svg` | a fenti .ai-ból konvertált vektoros logó (felirat nélkül) – ez kerül a fejlécbe |
| `whoosh-logo-tagline.svg` | ugyanaz „ELEKTROMOSROLLER.NET” felirattal |
| a jegyzőkönyv JSON-jában megadott `test.photo` (pl. `teszt-kijelzo.jpg`) | a tesztkészülék kijelzőjéről készült fotó; ha hiányzik, a kijelző értékei LCD-stílusú átiratként jelennek meg |

Ha `whoosh-logo.png` / `.jpg` / `.webp` is van itt, a build azt részesíti előnyben az SVG-vel szemben.

Az .ai → SVG konverzió: `python3 szerviz/akkuteszt/ai2svg.py <logo.ai> <ki.svg>` (a CMYK
színeket a márka RGB színeire képezi: lila `#7A1F4E`, zöld `#22C000`).
