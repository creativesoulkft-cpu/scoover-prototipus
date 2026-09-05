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
- két termékvonal: SOLID (egyszínű vinyl) és PRINT (nyomtatott minta), külön füleken
- 9 nyomtatott textúra két stíluskategóriában (Cyber, Motocross), színvariáns és
  sűrűség (ritka/sűrű) szerint szűrhetően; jövőbeli kategóriák (Organic, Y2K, Urban camo)
  "hamarosan" jelzéssel, adatból
- a textúrák ismétlődő SVG `<pattern>` csempeként kerülnek a darabokra (nem nyújtva),
  darabméret-osztály szerinti léptékkel (dekk ≠ villaborítás); nem varratmentes
  képhez tükrözött 2×2 csempézés (`tiling: 'mirror'`)
- **feliratréteg** (`LabelLayer`): a "SCOOVER" / modellnév vektoros `<text>`-ként a
  textúra fölött, saját rétegben, a darab alakjára vágva; alapértelmezett
  betűtípus/szín a minta kategóriájából jön, de feliratonként felülírható 6
  Google Fonts közül (Orbitron, Anton, Bebas Neue, Rajdhani, Oswald, Teko) és
  egy szabad színválasztóval (Auto/Fehér/Fekete/Egyedi szín) – lásd
  `src/data/fonts.js`, `FontColorPicker.jsx`; ki/be kapcsolható, szöveg és
  céldarab szerkeszthető
- saját kép feltöltése (JPG/PNG/WebP, kliens oldali kicsinyítés)
- minta-illesztés: méret, forgatás, eltolás – minden darabra egyszerre
- "darabok szétnyitása" nézet: a kivágott darabok szétcsúsznak, a minta velük mozog
- vágóvonalak ki/be, darab ki/bekapcsolása kattintással/koppintással (sraffozott = fólia nélkül)
- **állandóan látható ársáv** (`PriceBar`): élőben frissülő végösszeg, kinyitható
  bontással (alapár + taposófelület + felrakás); asztali nézetben a jobb oszlop
  tetejére tapad, mobilon a képernyő aljára rögzül és felfelé nyílik
- **taposófelület** (dekk állófelülete): külön, kültéri csúszásgátló anyag, ezért a
  darablistában kiemelve ("Prémium csúszásgátló"), alapból kikapcsolva, és a
  ki/bekapcsolása egyben a +6 900 Ft-os extra kapcsolója is
- **taposó-szerkesztő** (`FootboardEditor`): a "Taposó" gombra a fő előnézet
  helyén a taposófelület nagyított, önálló nézete jelenik meg, teljesen saját
  mintával/feltöltött képpel/felirattal (a roller fő mintájától függetlenül) –
  "Vissza a teljes rollerhez" gombbal léphetsz ki belőle
- **gyorsnavigáció** (`QuickNav`): rögzített gombsor (Minta / Feliratok /
  Darabok / Taposó) a konfigurátor tetején, sima görgetéssel az adott
  szekcióhoz; a látott/aktív szekció gombja görgetés közben kiemelődik
- **felrakás** mint szolgáltatás (normál / komplex), csak személyes átvétellel
- **kosárba teszem**: valódi WooCommerce kosártétel dinamikus, szerver oldalon
  hitelesített árral – lásd `server/README.md`
- **"Mentsd le a tervedet!"**: a látható konfiguráció (minta/saját kép, felirat,
  darabválasztás) éles, vízjelezett PNG-ként letölthető (modell, szint, ár a
  képen), plusz Web Share API gyorsgombok (WhatsApp, Instagram) mobilon –
  lásd `src/utils/exportImage.js`. Kliens oldali, szerver oldali mentés nincs;
  a fiókos mentés terve `src/components/ShareExportPanel.jsx` végén, kommentben.

## Mappastruktúra

```
src/
  data/
    models/           # rollermodellek – EGY FÁJL = EGY MODELL
      index.js        #   regiszter: metaadat + lazy import (csak a kiválasztott töltődik)
      kukirin-g2.js   #   darabok SVG path-ként (d), csoport, explode-irány
      kukirin-g2-master.js
    patterns/         # minták – EGY FÁJL = EGY MINTA
      index.js        #   regiszter
      categories.js   #   termékvonalak, stíluskategóriák (+ betűtípus, csempe-lépték), színek, sűrűség
      print-textures.js #  a 9 nyomtatott textúra bejegyzései (kép: public/patterns/)
      _helpers.js     #   procedurális csempe-segédek
      solid-*.js / gradient-*.js / carbon-3d.js / hex-tech.js
    fonts.js          # felirat-betűtípus regiszter (6 Google Fonts) – kategóriák és feliratok innen választanak
  components/
    ScooterCanvas.jsx   # roller-vázlat: darabok + közös minta-fill + szétnyitás
    PatternDefs.jsx     # minta → SVG <defs> (pattern / gradient / image-tile / image), fill-érték
    LabelLayer.jsx      # vektoros felirat a textúra fölött (getBBox-alapú méretezés, clipPath)
    LabelControls.jsx   # felirat ki/be, szöveg, céldarab
    FontColorPicker.jsx # betűtípus-választó + szín (Auto/Fehér/Fekete/Egyedi) – közös LabelControls és FootboardEditor közt
    Slider.jsx          # közös csúszka (minta-illesztés, feliratkártyák, taposó-szerkesztő)
    PatternGallery.jsx  # mintaválasztó galéria
    PatternThumb.jsx    # bélyegkép (ugyanazzal a renderelővel, mint a vászon)
    UploadPanel.jsx     # saját kép feltöltése (drag&drop + fájlválasztó)
    ModelSelector.jsx   # modellválasztó legördülő
    PatternControls.jsx # méret/forgatás/eltolás + nézeti kapcsolók
    PieceList.jsx       # darablista, hover-kiemelés, ki/bekapcsolás
    QuickNav.jsx        # rögzített gyorsnavigáció (Minta/Feliratok/Darabok/Taposó), aktív-szekció kiemeléssel
    FootboardEditor.jsx # taposófelület önálló, nagyított tervező nézete
    CartPanel.jsx       # "Kosárba teszem" gomb + visszajelzések
    PriceBar.jsx        # állandóan látható ársáv, kinyitható árbontással
    ShareExportPanel.jsx # "Mentsd le a tervedet!" + Web Share gyorsgombok
  hooks/useScooterModel.js  # lazy modellbetöltés + cache
  hooks/useIsTouch.js       # érintéses eszköz? (súgószövegek: "koppints" vs "vidd az egeret")
  hooks/useScrollSpy.js     # QuickNav aktív-szekció figyelése görgetés közben
  utils/image.js            # feltöltés-validálás, kicsinyítés, világosság-mérés
  utils/color.js            # világosság → felirat-szín
  utils/labelStyle.js       # egy felirat tényleges betűtípusa/színe (kategória vagy felülbírálás)
  utils/assets.js           # statikus képek URL-je (normál / egyfájlos build)
  utils/format.js           # Ft-összeg egységes kiírása
  utils/cartConfig.js       # App state → kosár-híd JSON-csomag (a taposó saját tervét is idesorolja)
  utils/exportImage.js      # SVG → vízjelezett, megosztható PNG (natív szerializálás + Canvas)
  api/cartBridge.js         # kliens a köztes híd szerverhez (feltöltés + kosárba helyezés)
  pricing.js                 # KÖZPONTI árazási modul – kliens ÉS szerver ugyanazt importálja
server/                     # köztes híd szerver (Node/Express) → WooCommerce Store API; lásd server/README.md
public/patterns/            # nyomtatott textúrák (1024 px WebP + 256 px bélyegkép)
tools/generate-schematic.js # sematikus vázlat-generátor (fejlesztői segéd, nem fut az appban)
```

## Árazás – hol kell átírni?

**Minden ár egyetlen fájlban van: `src/pricing.js`.** Ezt importálja a kliens
(élő ársáv) és a híd szerver (`server/`, hitelesített, szerver oldali
újraszámolás) is, ezért egy szám átírása mindkét helyen azonnal érvényesül.

```js
MODEL_PRICES          // modellenként, szintenként (SOLID / PRINT / FULL CUSTOM)
FOOTBOARD_EXTRA_HUF   // taposófelület extra (jelenleg 6 900 Ft)
INSTALLATION_OPTIONS  // felrakás: normál / komplex (17 000 / 25 500 Ft)
```

**Ár módosítása:** írd át a számot a fenti tömbökben/objektumokban. Kész.

**Új modell felvétele:** egy új sor a `MODEL_PRICES`-ba, ahol a kulcs a modell
id-ja a `src/data/models/index.js` regiszterből, és mind a három szintnek van ára:

```js
'ninebot-max-g2': { name: 'Segway Ninebot Max G2', solid: 26900, print: 42900, custom: 62900 },
```

**Új szint felvétele:** egy új bejegyzés a `TIERS` tömbbe (`{ id, name, description }`),
és minden `MODEL_PRICES`-sorba az új szint ára. A validáció, az ársáv és a
szerver oldali ellenőrzés adatból dolgozik, ezért kódot nem kell módosítani.

Megjegyzés: a `kukirin-g2-pro-max` és a `race-kit` ára már be van vezetve, de
hozzájuk még nincs geometria a `src/data/models/` mappában, ezért a
konfigurátorban még nem választhatók – amint elkészül a vázlatuk, egyetlen
regiszter-sorral bekapcsolhatók.

## Fotós nézet (PhotoCanvas)

Egy modellhez opcionálisan tartozhat `src/data/models/<id>.photo.js`: a termékfotó
(`public/models/…`), a fotó pixelméretű `viewBox`-a, és a fotón körberajzolt darab-maszkok
(ugyanazok az `id`-k, mint a vágófájlban). A generátor automatikusan beköti `photoView`
néven, a fejlécen megjelenik a Vázlat / Fotó váltó. Rétegek: fotó → minta a maszkokban →
a fotó szürke, gammával emelt másolata overlay-keveréssel (fény-árnyék átvitele) → felirat.
Darabonként `patternTransform` (pl. `skewX(-18)`) ferdíti a mintát a felület dőlése szerint.

```js
export default {
  image: 'models/kukirin-g2-photo.jpg',
  viewBox: { width: 3000, height: 2000 },
  shading: { blend: 'overlay', gamma: 0.5, opacity: 0.95 },
  pieces: [
    { id: 'deck-side', name: 'Dekk oldala', group: 'deck', size: 'large', defaultLabel: true, d: 'M … Z' },
    { id: 'stem', name: 'Kormányoszlop', group: 'front', size: 'medium', labelAngle: -72, patternTransform: 'skewX(-18)', d: 'M … Z' },
  ],
};
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

**Nyomtatott textúra:** WebP a `public/patterns/` mappába (+ `.thumb.webp`), és egy sor a
`print-textures.js` listájába (`category`, `colorway`, `density`, `luminance`, opcionálisan
`tiling: 'mirror'`). **Új kategória:** `categories.js`-ben `available: true` + betűtípus.
**Procedurális minta:** új fájl (`solid` / `gradient` / `tile` típus) + import a regiszterbe.

## Feliratréteg – hogyan lesz belőle "egyedi felirat" funkció (vázlat)

A `LabelLayer` ma egy szöveget tesz egy darabra. A vevői egyedi felirat ebből így nő ki:

1. **Több felirat, darabonként.** A `label` állapot tömb lesz: `[{ pieceId, text, font, size, offset, angle }]`;
   a darabra kattintva "Felirat ide" gomb, a felirat húzással pozicionálható (pointer-eventek az SVG-ben,
   a darab clipPath-ja továbbra is levágja a kilógó részt).
2. **Betűtípus- és színválasztó** a kategória alapértelmezésével, de felülírhatóan; a szín továbbra is
   kontraszt-ellenőrzéssel (minimum WCAG-arány a háttér világosságához képest), figyelmeztetéssel.
3. **Validálás:** hossz-limit, tiltott karakterek/szavak, minimális betűméret mm-ben (a valós mm-alapú
   viewBox-ból számolva), hogy vágható/olvasható maradjon.
4. **Vektoros export:** a `<text>` a rendelésnél `opentype.js`-szel path-má konvertálódik (betűtípus-
   függetlenség a nyomdában), a felirat külön rétegen kerül a nyomtatási SVG/PDF-be; a textúra-réteg
   raszteres marad. Így a felirat minden felbontáson éles.
5. **Rendelési JSON** kiegészül: `labels: [{ pieceId, text, fontId, color, transform }]` – a webshop
   ebből mutat előnézetet és ebből készül a gyártási fájl.

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
6. **Webshop-összekötés – ELKÉSZÜLT (első kör).** A "Kosárba teszem" gomb egy
   `{ model, tier, category, colorway, density, uploadedImageUrl,
   imageTransform, labels, includeFootboard, calculatedPrice }` JSON-t küld a
   `server/` alatti köztes híd szervernek, ami hitelesíti az árat (közös
   modul: `src/pricing.js`), CUSTOM szintnél ellenőrzi a feltöltött kép
   felbontását, és a WooCommerce Store API-n keresztül létrehozza a
   kosártételt. Részletek, környezeti változók, helyi tesztelés valódi
   WooCommerce nélkül: `server/README.md`. Nyitott pont: a preview PNG még
   nem generálódik, és a kosár-átadás a klasszikus checkout oldalnak
   (session-áthidalás) a végleges hosting eldöltével dolgozandó ki – lásd a
   `server/README.md` "Kosár-átadás a pénztárnak" szakaszát.
7. **Minőség.** Egységtesztek az adatfájlok sémájára (minden darabnak van `d`,
   egyedi `id`), vizuális regressziós teszt (Playwright screenshot) modellenként,
   hogy egy vágófájl-frissítés ne törje el csendben az előnézetet.
