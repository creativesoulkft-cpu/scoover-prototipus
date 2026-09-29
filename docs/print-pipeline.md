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
terv (SCV-…)  +  modell nyomdai geometriája (server/print/models/<id>.print.json – a vágóívből)
   │
   ├─ darabonként:  pieceSvg.js  → SVG mm-ben
   │      minta a nézet egységeiből mm-be leképezve (previewMaps), kifutó (a kontúr
   │      a mintával húzva 2×bleed szélesen), feliratok a darab kontúrjára vágva
   │      → resvg → 300 dpi PNG   (pieces/<id>[-L|-R].png)
   ├─ elrendezés:  a VÁGÓÍV EREDETI elrendezése (helyőrzőnél: nest.js polcos pakolás)
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

## 3. A vágóív importja (CorelDRAW PDF)

A nyomdai geometria forrása a **Corelből exportált vágóív-PDF** (egy oldal, a
vágóvonal színes körvonal – ahogy a "…matrica szett CUT vonal" fájlok).
Semmit nem kell átrajzolni vagy elnevezni; a darabokat a szkript számozza.

```bash
# egyszer: pip install pymupdf numpy pillow
python3 tools/cutfile/cutfile.py extract "Kukirin G2 matrica szett CUT vonal.pdf" kukirin-g2
#   → tools/cutfile/kukirin-g2/overview.png  (számozott darabok, méretekkel)
#   → tools/cutfile/kukirin-g2/mapping.json  (szám → modell-darab, bal/jobb)
python3 tools/cutfile/cutfile.py build kukirin-g2
#   → server/print/models/kukirin-g2.print.json  (a szerver ebből renderel)
```

**Hozzárendelés (mapping.json):** melyik számú darab melyik konfigurátor-darab
(`id`: deck-top, deck-side, stem, …), melyik oldal (`copy`: `L` / `R` / üres),
és mennyire biztos (`biztos` / `valószínű` / `kérdéses`). A `kérdéses`
hozzárendelés a munkalapon és a manifestben piros figyelmeztetést kap. A
konfigurátor modelljében nem szereplő darabok (`extra`: felni-csík,
kerékagy-takaró) nem kerülnek a nyomatra, amíg nincs zónájuk.

**Új változat ("pici pontosítás"):** ugyanaz a két parancs. Az `extract` az
új darabokat hely + méret + terület alapján az előző változat darabjaihoz
párosítja, a hozzárendelést átviszi, és megjelöli az új, eltűnt vagy
jelentősen megváltozott darabokat.

**Irány és tükör:** a `build` alak-illesztéssel (5°-os forgatás) megkeresi,
hogyan fekszik a vevő előnézetében látott darab a vágóíven. A bal oldali (`L`)
darab mindig a jobb oldali tükörképe (a matricát a nyomott oldaláról
rajzolják); a fotó a roller jobb oldalát mutatja. Ha egy irány rossz, a
mapping.json-ban kézzel rögzíthető: `"fit": {"photo": {"rotate": 90, "mirror": false}}`.

**Elrendezés:** a nyomdai PDF lapja **pontosan a vágóív lapja**, a darabok az
**eredeti helyükön**, a vágóvonal az eredeti görbe (ellenőrizve: < 0,001 mm
eltérés) – a nyomda ugyanazt a vágást kapja, amit a Corelben megrajzoltatok,
csak kitöltve. A kiválasztatlan zónák darabjai kimaradnak (se nyomat, se vágás).
A kifutó 2 mm, szoros darabköznél automatikusan kisebb.

**Titoktartás:** a repó NYILVÁNOS, ezért a vágóív PDF, a kinyert darabok és a
`server/print/models/*.print.json` **nincs a gitben** (.gitignore), és a
kliens (böngésző) sosem kapja meg – csak a szerver olvassa. A gitben csak a
`mapping.json` van (számok, id-k, méret-aláírás). Éles szerveren a két
parancsot ott kell lefuttatni, ahol a híd fut.

**Amíg nincs vágóív:** `node tools/derive-print-placeholder.js` a vázlatból
helyőrzőt készít (server/print/placeholders) – a lánc futtatható, de a
munkalap "NEM gyártható" figyelmeztetést ad.

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
| `PRINT_BLEED_MM` | 3 | kifutó a helyőrzőnél (a vágóívnél a build adja: 2 mm, szoros darabköznél kevesebb) |
| `PRINT_MODELS_DIR` | print/models | a vágóívből épült geometria (nincs gitben) |
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
