# Scoover – roller-fólia konfigurátor (prototípus)

Kliens oldali, önállóan futó React-demó: a felhasználó kiválaszt egy mintát
(vagy feltölti a sajátját), és azonnal látja, ahogy az kirajzolódik a roller
vágott fóliadarabjain – a darabhatárokon folytonosan, mintha egy nagy fóliaívből
vágták volna ki.

## Indítás

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ – statikusan hosztolható
```

## Mit tud

- 2 rollermodell (Kukirin G2, G2 Master), 11 ill. 12 fóliázható darabbal, legördülőből váltható
- 8 beépített minta 4 kategóriában (egyszínű, színátmenet, tech, szerves)
- saját kép feltöltése (JPG/PNG/WebP, kliens oldali kicsinyítés)
- minta-illesztés: méret, forgatás, eltolás – minden darabra egyszerre
- "darabok szétnyitása" nézet: a kivágott darabok szétcsúsznak, a minta velük mozog
- vágóvonalak ki/be, darab ki/bekapcsolása kattintással (sraffozott = fólia nélkül)

## Mappastruktúra

```
src/
  data/
    models/           # rollermodellek – EGY FÁJL = EGY MODELL
      index.js        #   regiszter: metaadat + lazy import (csak a kiválasztott töltődik)
      kukirin-g2.js   #   darabok SVG path-ként (d), csoport, explode-irány
      kukirin-g2-master.js
    patterns/         # minták – EGY FÁJL = EGY MINTA
      index.js        #   regiszter + kategóriák
      _helpers.js     #   procedurális csempe-segédek (seamless wrap, blob, hex)
      solid-*.js / gradient-*.js / carbon-3d.js / hex-tech.js / urban-camo.js / topo-lines.js
  components/
    ScooterCanvas.jsx   # roller-vázlat: darabok + közös minta-fill + szétnyitás
    PatternDefs.jsx     # minta → SVG <defs> (pattern / gradient / image), fill-érték
    PatternGallery.jsx  # mintaválasztó galéria
    PatternThumb.jsx    # bélyegkép (ugyanazzal a renderelővel, mint a vászon)
    UploadPanel.jsx     # saját kép feltöltése (drag&drop + fájlválasztó)
    ModelSelector.jsx   # modellválasztó legördülő
    PatternControls.jsx # méret/forgatás/eltolás + nézeti kapcsolók
    PieceList.jsx       # darablista, hover-kiemelés, ki/bekapcsolás
  hooks/useScooterModel.js  # lazy modellbetöltés + cache
  utils/image.js            # feltöltés-validálás, kicsinyítés
tools/generate-schematic.js # sematikus vázlat-generátor (fejlesztői segéd, nem fut az appban)
```

## Hogyan működik a folytonos minta

Minden minta `userSpaceOnUse` egységben, a teljes vázlat koordináta-rendszerében
van definiálva (`PatternDefs.jsx`). A darabok ugyanarra a `<pattern>`/`<linearGradient>`
elemre hivatkoznak, ezért mindegyik a saját helyének megfelelő részt mutatja
ugyanabból a "végtelen" textúrából – nincs darabonkénti újrakezdés, nincs törés.
Szétnyitott nézetben a darab `<g>` elemét toljuk el, és mivel a minta a hivatkozó
elem koordináta-rendszerét követi, a "rányomtatott" részlet együtt mozog a darabbal.

## Új modell / új minta hozzáadása (kódmódosítás nélkül)

**Modell:** új fájl a `src/data/models/` mappába a meglévők szerkezetével
(`id, name, brand, viewBox, decor[], pieces[]`; minden darab `id, name, group, explode, d`),
majd egy sor a `MODEL_REGISTRY` tömbbe. A build automatikusan külön chunkot készít belőle.

**Minta:** új fájl a `src/data/patterns/` mappába (`solid` / `gradient` / `tile` típus),
import + egy sor a `PATTERNS` tömbbe. Csempés mintánál a `tile.markup` tetszőleges SVG,
a `__ID__` helyőrzővel egyedi belső id-k (gradiens) is használhatók.

## Út a végleges rendszerhez (vázlat)

1. **Valódi vágófájlok importálása.** Az Illustrator/CAD SVG-exportból egy
   build-idejű szkript (pl. `svgo` + saját parser) kinyeri a rétegneveket és a
   path-okat, és legenerálja a modell adatfájlt – a `d` stringek cserélődnek,
   az adatszerkezet marad. A darab-neveket/csoportokat a rétegnevek adják
   (konvenció: `deck-top | Dekk teteje`). A `viewBox` a valós mm-méreteket hordozza,
   így a minta skálája fizikailag értelmezhető lesz (pl. 1 egység = 1 mm).
2. **Több nézet és 2D→"2.5D".** Modellenként több vázlat (oldal, felül, elöl),
   ugyanazokkal a darab-id-kkal; a darab minden nézetben a saját path-ját kapja,
   a minta-transzformáció közös. Később opcionálisan valódi 3D (three.js + UV-térkép),
   de a fólia-előnézethez a nézetenkénti 2D vetítés elég és sokkal olcsóbb.
3. **Kiterített vágóív-nézet és export.** A darabok bbox alapján egy nyomdai
   ívre rendezve (nesting), a kiválasztott mintával kitöltve → ez egyben a
   gyártási előnézet és a nyomtatási fájl (SVG/PDF export, vágóvonal külön rétegen,
   kifutó/bleed hozzáadásával). A `userSpaceOnUse` logika miatt a darab a rolleren
   látott mintarészletet viszi magával az ívre.
4. **Feltöltés-validálás.** Minimális felbontás ellenőrzése a darab valós
   méretéhez képest (DPI-számítás mm-ből), színprofil, EXIF-forgatás, fájlméret,
   tartalom-moderálás; a kép szerver oldalon is újratömörítve tárolódik,
   csak a transzformáció paraméterei (scale/rotate/dx/dy) utaznak a rendeléssel.
5. **Modell- és mintaregiszter API-ból.** A `MODEL_REGISTRY` / `PATTERNS` helyét
   egy JSON-végpont veszi át (lista könnyű metaadattal, modell-geometria külön
   URL-ről, cache-elhető CDN-en). A React-kód nem változik, csak a `load()`
   forrása. 20 modell × 15 minta így is csak a kiválasztott párost tölti.
6. **Webshop-összekötés.** A konfigurátor kimenete egy rendelési JSON:
   `{ modelId, patternId | uploadId, transform, pieces: [id, enabled], preview: png }`.
   Ezt egy "Kosárba" gomb küldi a webshopnak (WooCommerce/Shopify egyedi termék-meta),
   árazás darabszám és felület (mm²) alapján, a preview PNG-t a `<svg>`-ből
   kliens oldalon rendereljük (canvas → dataURL).
7. **Minőség.** Egységtesztek az adatfájlok sémájára (minden darabnak van `d`,
   egyedi `id`), vizuális regressziós teszt (Playwright screenshot) modellenként,
   hogy egy vágófájl-frissítés ne törje el csendben az előnézetet.
