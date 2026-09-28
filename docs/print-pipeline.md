# Nyomdai pipeline – a tervtől a vágógépig

Ez a dokumentum írja le, hogyan lesz a vevő konfigurációjából gyártható fájl,
mit kell a plotteres/nyomdai kollégának előkészítenie, és hol lehet a
folyamatba nyúlni.

## 1. Alapelv: recept, nem fájl

A böngésző **sosem gyárt nyomdai fájlt**. A konfigurátor egyetlen dolgot
állít elő: a **terv-dokumentumot** (`src/design/schema.js`, JSON, `schemaVersion`
mezővel). Ez tartalmazza:

- modell + évjárat, melyik nézetben tervezett a vevő (fotó / vázlat),
- rétegek: az egész rollerre érvényes minta, zónánkénti felülírások
  (design-keverés), a taposó saját rétege – mindegyikhez minta-azonosító vagy a
  szerverre feltöltött kép URL-je, nagyítás/forgatás/eltolás, "fő darab",
- feliratok (szöveg, darab, méret, eltolás, forgatás, betű, szín),
- kiválasztott zónák, taposó igen/nem, felrakás vagy postázás.

A dokumentum **determinisztikus**: két azonos tervből azonos nyomat készül,
bármikor, bármelyik szerveren. Ezért:

- a kosárba tétel elmenti (`designs` tábla, `SCV-XXXXXX` azonosító), és az
  azonosító a WooCommerce rendelés metájába kerül (`scoover.designId`);
- a megosztható link (`#id=SCV-…`) ugyanezt nyitja meg;
- a nyomdai fájl a szerveren, **kizárólag ebből** készül.

## 2. Mi történik a szerveren (server/print)

```
terv (SCV-…)  +  modell nyomdai geometriája (src/data/models/<id>.print.js, mm)
   │
   ├─ darabonként:  pieceSvg.js  → SVG mm-ben
   │      minta a nézet egységeiből mm-be leképezve (previewMaps), kifutó (a kontúr
   │      a mintával húzva 2×bleed szélesen), feliratok a darab kontúrjára vágva
   │      → resvg → 300 dpi PNG   (pieces/<id>[-L|-R].png)
   ├─ nest.js:     polcos elrendezés a tekercs szélességére (forgatás, ha kell)
   ├─ pdf.js:      egy lap PDF – raszterek + VÁGÓVONAL "CutContour" spot-színnel
   ├─ jobSheet.js: munkalap PNG (mi készül, méretek, darabszám, anyag, figyelmeztetések)
   └─ manifest.json: minden adat gépi formában (+ a terv másolata)
```

A CutContour egy `/Separation /CutContour /DeviceCMYK` színtér a PDF-ben
(100% magenta fedvény): a Roland VersaWorks, Summa, Mimaki RasterLink stb. a
**név** alapján ismeri fel vágóvonalnak. Vonalvastagság 0,25 mm, a nyomat
fölött külön rétegként.

SOLID (egyszínű vinyl) zónánál nincs nyomat: a PDF csak a vágóvonalat
tartalmazza, a munkalap a vinyl színkódját.

### Indítás

Ügyfélszolgálati nézet: **`<konfigurátor URL>#admin`** → belépés admin fiókkal
(`ADMIN_EMAILS`) vagy az `ADMIN_TOKEN`-nel → terv kiválasztása →
**Nyomdai fájl generálása** (rendelésszám opcionális) → állapot → letöltés:
PDF, munkalap, manifest.

API (admin): `POST /api/print-jobs {designId, orderRef}` →
`GET /api/print-jobs/:id` → `GET /api/print-jobs/:id/files/<név>?token=…`.

Kimenet: `server/data/print-jobs/<PJ-…>/` – ezt a mappát (és a SQLite
adatbázist) rendszeres mentés alá kell vonni.

## 3. Vágófájl-követelmények (a plotteres kollégának)

Modellenként és évjáratonként **egy SVG**, ebből készül a
`src/data/models/<id>.print.js` a `node tools/import-cutfile.js <id> <fájl.svg>`
paranccsal.

1. **1 egység = 1 mm.** A `viewBox` mm-ben; a `width`/`height` lehet `…mm`.
2. **Minden transzformáció kilapítva** (Illustrator: Object → Expand,
   exportnál "Flatten transforms"; Inkscape: Apply transforms). Az importáló a
   `transform` attribútumot értelmezi, de ne bízzunk benne.
3. **Minden fóliadarab egy zárt `<path>`**, `id="<darab-id>"` ahol a darab-id a
   modell darabjának azonosítója (`kukirin-g2.js`): `deck-side`, `stem`,
   `display`, `joint`, `fork`, `neck`, `battery`, `rear-swingarm`,
   `rear-fender`, (`front-fender`), és a taposó: `deck-top`.
   Elfogadott még `<polygon>` és `<rect>` is id-val.
4. **Bal/jobb páros darabból csak a bal oldalit** rajzold (`deck-side`, `fork`,
   `rear-swingarm`) – a jobb a tükörképe. Ha a jobb oldal más, rajzold külön
   `<darab-id>-R` id-val.
5. A kontúr a **vágás vonala** (a fólia végleges széle), kifutó nélkül – a
   kifutót (alapból 3 mm, `--bleed`) a render adja hozzá.
6. Sarkok: ahol a fólia felszedhető (taposó, sárvédő), a rádiusz legyen a
   fájlban; a render nem kerekít.
7. Ne legyen a fájlban más elem id-val (segédvonalak, méretek) – vagy legyen
   id nélkül.

Az importáló kiírja, mely darabok hiányoznak, és mekkora az eltérés az
előnézeti darab és a vágókontúr aránya között (5% fölött a minta illesztése
közelítő). Utána a `src/data/models/index.js` `printScale` mezőjét a kiírt
értékekre kell állítani (saját kép dpi-becslése).

**Amíg nincs vágófájl:** `node tools/derive-print-placeholder.js` a vázlatból
készít helyőrzőt (`source: 'placeholder'`) – a lánc futtatható, de a munkalap
és a manifest **"NEM gyártható"** figyelmeztetést ad.

## 4. Nyomdai textúra-mesterek

`server/print/assets/patterns/<minta-id>.png` – nyomdai felbontású,
varratmentes csempe mintánként (lásd az ottani README-t; ~4500 px ritka,
~3400 px sűrű mintához). Nélküle az előnézeti 1024 px-es WebP megy
**figyelmeztetéssel** (~70–90 dpi). Ellenőrzés: `npm run check-print-assets`
a `server` mappában.

## 5. Betűtípusok

`server/print/fonts/` – a hat Google Fonts betű TTF-jei (Orbitron, Anton,
Bebas Neue, Rajdhani, Oswald, Teko). Nélkülük a feliratok tartalék betűvel
készülnek, figyelmeztetéssel.

## 6. Saját kép (EGYEDI) felbontás

A kép a roller teljes nézetét fedi ("cover"), erre jön a nagyítás. Egy 2000 px
széles kép egy ~1,2 m-es rolleren ~40 dpi. Ezért:

- a konfigurátor az EGYEDI fülön élőben mutatja az **effektív dpi-t**
  (`src/utils/printQuality.js`; jó ≥ 150, elfogadható ≥ 100),
- a render ugyanezt a manifestbe és a munkalapra írja (`PRINT_MIN_DPI_WARN`),
- a feltöltés az **eredeti** fájlt küldi a szerverre (a kliens csak az
  előnézethez kicsinyít), minimum 2000×2000 px (`MIN_CUSTOM_IMAGE_*`).

## 7. Beállítások (server/.env)

| Változó | Alap | Jelentés |
|---|---|---|
| `PRINT_ROLL_WIDTH_MM` | 610 | tekercs szélessége |
| `PRINT_DPI` | 300 | raszter felbontás |
| `PRINT_BLEED_MM` | 3 | kifutó (a modell `.print.js` felülírhatja) |
| `PRINT_GAP_MM` / `PRINT_MARGIN_MM` | 6 / 10 | darabok köze / lapszél |
| `PRINT_MIN_DPI_WARN` | 150 | saját kép figyelmeztetési küszöb |
| `PRINT_ASSETS_DIR` | print/assets | textúra-mesterek |
| `PRINT_FONTS_DIR` | print/fonts | betűtípusok |
| `ADMIN_TOKEN` / `ADMIN_EMAILS` | – | ki indíthat nyomdai feladatot |

## 8. Amit a folyamat még nem tud (tudatosan)

- **Fotós nézet perspektívája**: a fotón a darabok ferdítve (`patternTransform`)
  látszanak; a nyomatra a ferdítés nélküli, síkba terített minta kerül, a
  darab befoglaló dobozához illesztve. Sík darabokon pontos, sárvédőn közelítő.
- **Színkezelés**: sRGB raszter megy; az ICC-profilt a RIP kezeli.
- **Elrendezés**: egyszerű polcos pakolás – a nyomda a PDF-ben átrendezheti.
- **Feliratok**: a raszterbe kerülnek 300 dpi-n (nem külön vektor).
