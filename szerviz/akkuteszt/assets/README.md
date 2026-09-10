# Képek a jegyzőkönyvhöz

Ide kerülnek a jegyzőkönyvbe ágyazott képek. A build script ezeket keresi:

| Fájl | Mire való | Ha hiányzik |
|------|-----------|-------------|
| `whoosh-logo.png` (vagy `.jpg`) | az eredeti Whoosh logó | a `whoosh-logo.svg` vektoros újrarajzolás kerül a fejlécbe |
| a jegyzőkönyv JSON-jában megadott `test.photo` (pl. `teszt-kijelzo.jpg`) | a tesztkészülék kijelzőjéről készült fotó | a kijelző értékei szövegesen, LCD-stílusban jelennek meg |

Tedd be az eredeti fájlokat, futtasd újra a buildet, és a PDF már azokkal készül.
