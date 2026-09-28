# Nyomdai textúra-mesterek

Ide kerülnek a PRINT minták **nyomdai minőségű, varratmentes** csempéi –
`patterns/<minta-id>.png` (vagy `.jpg`), ahol a minta-id a
`src/data/patterns/print-textures.js` `file` mezője (pl. `cyber-cian-ritka.png`).

**Amíg nincs mester**, a szerver a kliens előnézeti WebP-jét használja
(`public/patterns/<id>.webp`, 1024 px), és a manifest + munkalap
**figyelmeztet** – az 1024 px egy 290–380 mm-es fizikai csempén csak ~70–90 dpi.

## Elvárt méret

A csempe fizikai mérete = `tile` (vázlat-egység, print-textures.js) ×
`mmPerUnit` (≈ 1,2 mm) → ritka minta 320 e. ≈ 384 mm, sűrű 240 e. ≈ 288 mm.
300 dpi-hez ez **≈ 4500 px** (ritka) ill. **≈ 3400 px** (sűrű) oldalhosszú
csempe. sRGB, 8 bit, tömörítetlen PNG vagy 95%-os JPEG.

Ellenőrzés: `npm run check-print-assets` (a server mappában) – listázza,
melyik mintának van mestere és eléri-e a szükséges felbontást.

Ez a mappa **nem publikus**: a híd sosem szolgálja ki, csak a render olvassa.
