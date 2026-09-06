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

- 2 rollermodell (Kukirin G2, G2 Master) évjárattal, legördülőből váltható; a
  fóliázható darabok **6 zónába** vannak sorolva (dekk oldala, akkuház/oldalpanelek,
  kormányoszlop, első sárvédő+villa, hátsó sárvédő+lengőkar, + taposófelület)
- **szekciótagolt konfigurátor** (`Section`): öt jól elkülönülő kártya – A rollered /
  Stílus / Mit fóliázunk / Taposófelület / Felrakás vagy postázás –, egyszerre egy
  nyitva, a nyitott fejléce görgetés közben a panel tetejére tapad; minden
  fejléc alatt egysoros magyarázat és ⓘ ikon 2–3 mondatos súgóval
- **zónás választás** (`ZoneSelector`): alapból minden zóna kiválasztva, felül a
  bepipált "Teljes fólia szett" sor (szettár / külön-ár / megtakarítás); egy zóna
  kivétele kikapcsolja a szettet, a zónák saját árral jelennek meg, és a helyére
  a "Kérem egyben — spórolj X Ft-ot" sor csúszik; "Törlés mind"; minimális
  rendelési érték 9 900 Ft (üzenettel)
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
- vágóvonalak ki/be; a képen egy darabra kattintva/koppintva az egész **zónája**
  kapcsol – a fólia nélkül maradó rész a roller csupasz feketéjét mutatja
  (vázlaton és fotón is), nem sraffozást
- **állandóan látható ársáv** (`PriceBar`): mindig két szám –
  "Kiválasztva: 26 800 Ft · Egyben: 39 900 Ft (−18 200)" –, a második eltűnik,
  ha minden zóna ki van választva; kinyitható tételes bontás (zónák vagy szett,
  taposó, felrakás, végösszeg); asztalin a jobb oszlop tetejére tapad, mobilon a
  képernyő aljára rögzül és felfelé nyílik
- **taposófelület** (`FootboardSection`): NEM része a szettnek, alapból nincs
  kiválasztva, saját sor saját árral ("Kültéri csúszásgátló anyagból készül,
  ezért külön tétel."); bekapcsolva megjelenik a "Taposófelület tervezése" gomb
- **taposó-tervező** (`FootboardEditor`): a gombra a fő előnézet helyén a
  taposófelület felülnézete jelenik meg a rendelkezésre álló területet
  kitöltve, ugyanazokkal az eszközökkel (minta/saját kép, nagyítás, forgatás,
  eltolás, felirat), de csak erre a felületre; a panel tetején tapadó
  "← Vissza a teljes rollerhez" gomb mindig látható
- **gyorsnavigáció** (`QuickNav`): rögzített gombsor az öt szekcióhoz; a gomb
  megnyitja a szekciót és odagörget
- **segítség**: "Nem tudod, melyik évjárat?" lenyíló az évjárat mellett (hely a
  későbbi fotónak), ⓘ ikonok szekciónként, és mindig alul: "Nem boldogulsz?
  Hívj: [TELEFONSZÁM] — vagy gyere be hozzánk Veszprémbe." (`src/data/contact.js`)
- **felrakás** mint szolgáltatás (normál / komplex), csak személyes átvétellel
- **kosárba teszem**: valódi WooCommerce kosártétel dinamikus, szerver oldalon
  hitelesített árral – lásd `server/README.md`
- **"Mentsd le a tervedet!"**: a látható konfiguráció (minta/saját kép, felirat,
  darabválasztás) éles, vízjelezett PNG-ként letölthető (modell, szint, ár a
  képen), plusz Web Share API gyorsgombok (WhatsApp, Instagram) mobilon –
  lásd `src/utils/exportImage.js`. Kliens oldali, szerver oldali mentés nincs;
  a fiókos mentés terve `src/components/ShareExportPanel.jsx` végén, kommentben.
  A **vízjel kétrétegű**: (1) a teljes képen átfutó, 45°-os, ismétlődő
  `SCOOVER` / `SCOOVER.HU` felirat ~11% átlátszatlansággal – ez a tényleges
  védelem, mert kivágással sem tüntethető el; (2) a jobb alsó sarokban a logó
  és a "Tervezd meg a tiédet: scoover.hu" CTA, teljes átlátszatlansággal, ez
  hordozza az olvasható információt.

## Mappastruktúra

```
src/
  data/
    models/           # rollermodellek – EGY FÁJL = EGY MODELL
      index.js        #   regiszter: metaadat + lazy import (csak a kiválasztott töltődik)
      kukirin-g2.js   #   darabok SVG path-ként (d), priceGroup (→ zóna), explode-irány
      kukirin-g2-master.js
    zones.js          # ZÓNANEVEK ÉS -LEÍRÁSOK egy helyen (munkacímek) + priceGroup → zóna leképezés
    contact.js        # telefonszám / üzlet a "Nem boldogulsz?" sorhoz
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
    Section.jsx         # akkordeon-kártya (fejléc + blurb + ⓘ súgó + tapadó fejléc)
    ModelSection.jsx    # "A rollered": modell + évjárat + "Nem tudod, melyik évjárat?"
    ZoneSelector.jsx    # "Mit fóliázunk": zónák, teljes szett / "Kérem egyben" sor, Törlés mind
    FootboardSection.jsx # "Taposófelület": külön tétel + "Taposófelület tervezése" gomb
    DeliverySection.jsx # "Felrakás vagy postázás": postázás / felrakás nálunk (normál, komplex)
    HelpLine.jsx        # "Nem boldogulsz? Hívj: …" sor
    PatternControls.jsx # méret/forgatás/eltolás + nézeti kapcsolók
    QuickNav.jsx        # rögzített gyorsnavigáció az 5 szekcióhoz (a SECTIONS lista itt van)
    FootboardEditor.jsx # taposófelület önálló, FELÜLNÉZETI tervezője (valós arány)
    CartPanel.jsx       # "Kosárba teszem" gomb + visszajelzések
    PriceBar.jsx        # állandóan látható ársáv: "Kiválasztva · Egyben (−megtakarítás)" + tételes bontás
    ShareExportPanel.jsx # "Mentsd le a tervedet!" + Web Share gyorsgombok
    FullscreenPreview.jsx # teljes képernyős, csippentéssel nagyítható előnézet
    SplitHandle.jsx     # húzható elválasztó a kép/vezérlők felosztásához (osztott nézet)
  hooks/useScooterModel.js  # lazy modellbetöltés + cache
  hooks/useIsTouch.js       # érintéses eszköz? (súgószövegek: "koppints" vs "vidd az egeret")
  hooks/useReportHeight.js  # elem magasságát CSS-változóba írja (egymás alá tapadó sávokhoz)
  hooks/useMediaQuery.js    # keskeny (osztott) elrendezés? – DOM-átrendezéshez, nem csak stílushoz
  utils/image.js            # feltöltés-validálás, kicsinyítés, világosság-mérés
  utils/color.js            # világosság → felirat-szín
  utils/labelStyle.js       # egy felirat tényleges betűtípusa/színe (kategória vagy felülbírálás)
  utils/assets.js           # statikus képek URL-je (normál / egyfájlos build)
  utils/format.js           # Ft-összeg egységes kiírása
  data/footboardFlat.js     # a taposó síkba terített kontúrja (közelítés – cserélendő a valódi vágókontúrra)
  utils/pathBox.js          # SVG path befoglaló doboza DOM nélkül (a "fő darab" középpontjához)
  utils/analytics.js        # GA4-kompatibilis eseménymérés (egyelőre csak konzolra logol)
  utils/cartConfig.js       # App state → kosár-híd JSON-csomag (a taposó saját tervét is idesorolja)
  utils/exportImage.js      # SVG → vízjelezett, megosztható PNG (natív szerializálás + Canvas)
  api/cartBridge.js         # kliens a köztes híd szerverhez (feltöltés + kosárba helyezés)
  pricing.js                 # KÖZPONTI árazási modul – kliens ÉS szerver ugyanazt importálja
server/                     # köztes híd szerver (Node/Express) → WooCommerce Store API; lásd server/README.md
public/patterns/            # nyomtatott textúrák (1024 px WebP + 256 px bélyegkép)
public/brand/               # Scoover logó (SVG a fejlécben, PNG a mentett PNG vízjelén)
tools/generate-schematic.js # sematikus vázlat-generátor (fejlesztői segéd, nem fut az appban)
```

## Árazás – hol kell átírni?

**Minden ár egyetlen fájlban van: `src/pricing.js`.** Ezt importálja a kliens
(élő ársáv) és a híd szerver (`server/`, hitelesített, szerver oldali
újraszámolás) is, ezért egy szám átírása mindkét helyen azonnal érvényesül.

```js
ZONE_PRICES_HUF        // zónánkénti KÜLÖN árak (Kukirin G2, PRINT szint – ebből skálázódik a többi)
                       //   deck-side 17 900 · panels 12 900 · stem 9 900 · front 8 900 · rear 8 500
CANONICAL_KIT_BASE_HUF // 39 900 – a zónaárak ehhez a szettárhoz vannak belőve
MODEL_PRICES           // TELJES SZETT ára modellenként, szintenként (SOLID / PRINT / FULL CUSTOM)
FOOTBOARD_EXTRA_HUF    // taposófelület, külön tétel (9 900 Ft) – nincs a szettben
MIN_ORDER_HUF          // minimális rendelési érték (9 900 Ft) részleges rendelésnél
INSTALLATION_OPTIONS   // felrakás: normál / komplex
```

**Hogyan számol:** a zóna ára = `ZONE_PRICES_HUF[zóna] × MODEL_PRICES[modell][szint] / 39 900`
(50 Ft-ra kerekítve). A szett ára = `MODEL_PRICES[modell][szint]`. A
megtakarítás = a modellen létező zónák külön-árának összege − szettár; ez
automatikusan jelenik meg a "Teljes fólia szett" és a "Kérem egyben" sorban.
Példa: a G2 PRINT öt zónája külön 58 100 Ft, a szett 39 900 Ft → 18 200 Ft.
Ha más megtakarítást akarsz látni, a `ZONE_PRICES_HUF` (vagy a `MODEL_PRICES`)
számait írd át – kód nem változik.

**Zónanevek és leírások:** `src/data/zones.js` – EGY helyen, munkacímek.
Ugyanitt a `groups` lista mondja meg, melyik darab-csoport (`priceGroup` a
modellfájlokban) melyik zónába tartozik. A taposófelület nem zóna, hanem külön
tétel (`priceGroup: 'footboard'`).

**Telefonszám / üzlet** a "Nem boldogulsz?" sorhoz: `src/data/contact.js`.

**Új modell felvétele:** (1) modellfájl a `src/data/models/` mappában, ahol
minden darab `priceGroup`-ja a `zones.js` valamelyik csoportja (vagy
`footboard`); (2) egy sor a `MODEL_REGISTRY`-be az `index.js`-ben, benne a
`years` tömbbel; (3) egy sor a `MODEL_PRICES`-ba mind a három szint árával:

```js
'ninebot-max-g2': { name: 'Segway Ninebot Max G2', solid: 26900, print: 42900, custom: 62900 },
```

**Új évjárat:** a modell `years` tömbjébe egy új szám a `src/data/models/index.js`
regiszterben. (Ha egy évjárat más geometriát kap, az külön modellfájl és
külön regiszter-sor.)

**Új szint felvétele:** egy új bejegyzés a `TIERS` tömbbe (`{ id, name, description }`),
és minden `MODEL_PRICES`-sorba az új szint ára. A validáció, az ársáv és a
szerver oldali ellenőrzés adatból dolgozik, ezért kódot nem kell módosítani.

Megjegyzés: a `kukirin-g2-pro-max` és a `race-kit` ára már be van vezetve, de
hozzájuk még nincs geometria a `src/data/models/` mappában, ezért a
konfigurátorban még nem választhatók – amint elkészül a vázlatuk, egyetlen
regiszter-sorral bekapcsolhatók.

## Elrendezés: osztott nézet (a kép mindig látszik)

Az oldal **soha nem görög egyben** – az `.app` egy képernyőnyi magas
(`100dvh`, `-webkit-fill-available` és `100vh` fallbackkel), és két, egymástól
független régió van:

| | asztali (≥1024px) | keskeny (<1024px) |
|---|---|---|
| előnézet | bal oszlop, rögzített | felső sáv, rögzített (alapból 45%) |
| vezérlők | jobb oszlop, saját görgetéssel | alsó sáv, saját görgetéssel |
| gyorsnavigáció | a kép fölött | az alsó panel tetején tapadva |
| ársáv | a panel tetején, bontás nyitva | a képernyő alján rögzítve, bontás csukva |

Így a roller akkor is látszik, amikor a vevő lent a csúszkákat állítja – korábban
emiatt kellett le-fel görgetni minden apró módosítás ellenőrzéséhez.

**A felosztás** a `.layout` `--split-h` változója (a kép magassága %-ban), amit
az `App.jsx` `splitPct` állapota ad. Háromféleképpen változik:

1. a `SplitHandle` húzásával (elengedéskor a legközelebbi rögzülő pozícióra ugrik:
   70% / 45% / 25% – lásd `SPLIT_SNAPS`), vagy fel/le nyíllal, dupla kattintásra alap;
2. **automatikusan csúszka-húzáskor**: az `App.jsx` globális `pointerdown`-figyelője
   bármely `input[type=range]`-re 70%-ra nagyítja az előnézetet, elengedés után
   1 mp-cel visszaáll. Ezért nem kell egyetlen csúszkának sem külön prop – a
   minta-illesztés, a feliratkártyák és a taposó-szerkesztő is ugyanígy működik;
3. a képernyő átméretezésekor (media query váltás).

**Amit a DOM-ban is át kell rendezni:** a képaláírás/súgó és a "Mentsd le a
tervedet" gomb asztalin a kép alatt, keskeny nézetben a görgethető panel tetején
van. Ezt CSS-sel nem lehet megoldani, ezért a `useMediaQuery` hook adja meg
Reactnek, hova rendereljen (`belowCanvasEl` az `App.jsx`-ben).

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
(`id, name, brand, viewBox, decor[], pieces[]`; minden darab `id, name, group, priceGroup, explode, d`
– a `priceGroup` sorolja zónába, lásd `src/data/zones.js`), majd egy sor a
`MODEL_REGISTRY` tömbbe (`years` évjáratlistával) és egy a `MODEL_PRICES`-ba. A build automatikusan külön chunkot készít belőle.

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

## Mérés (GA4) – egy sorral élesíthető

A `src/utils/analytics.js` GA4-kompatibilis egyedi eseményeket készít elő.
**Amíg nincs bekötve a GA4, minden esemény csak a konzolra megy** – így
fejlesztés közben látszik, mi mérődne, de adat sehova nem megy.

**Élesítés:** tedd be a gtag.js kódot az `index.html`-be, majd az
`analytics.js` tetején állítsd az `ENABLED`-et `true`-ra. Ennyi.

| esemény | mikor | fő paraméterek |
|---|---|---|
| `configurator_opened` | betöltéskor, egyszer | `model` |
| `tier_selected` | szintváltás (a mintaválasztásból adódik) | `tier` |
| `pattern_selected` | konkrét minta választása | `pattern_name`, `pattern_id` |
| `image_uploaded` | saját kép feltöltése | `image_width/height`, `focus_piece` |
| `zone_toggled` | egy zóna be/ki (listából vagy a képre koppintva) | `zone`, `included` |
| `kit_toggled` | teljes szett vissza ("Kérem egyben") / Törlés mind | `full_kit` |
| `footboard_toggled` | taposó-extra be/ki (szekcióból vagy a képre koppintva) | `included` |
| `design_saved` | terv mentése képként | `model`, `tier`, `method` |
| `add_to_cart` | sikeres kosárba helyezés | `value`, `currency`, `full_kit`, `piece_count` |

Minden esemény kap egy `seconds_since_open` paramétert (a konfigurátor
megnyitása óta eltelt idő) – ebből látszik, mennyi idő után jut el a vevő a
kosárig, és hol akad el. Személyes adat egyetlen eseménybe sem kerül.

## Fő darab – hova essen a feltöltött kép lényege

A saját kép nem egyben kerül a rollerre: a darabok külön vágott fóliák, a kép
szétoszlik köztük, és a lényege (pl. egy kutya feje) alapból a vászon közepére,
gyakran két darab közé esne. Az EGYEDI fülön ezért választható **fő darab**
(alapból `deck-side`, a legnagyobb és legjobban látható felület).

A megoldás nem a `transform` állapotba ír, hanem **rendereléskor** ad hozzá egy
eltolást (`imageFocus` az `App.jsx`-ben): így a felhasználói csúszkák tartománya
és az "Alaphelyzet" gomb változatlan marad, a finomhangolás pedig a fókuszhoz
képest értendő. Az eltolást a darab (illetve az árcsoport összes darabjának)
befoglaló dobozából számoljuk – `utils/pathBox.js`, DOM nélkül, mert a darab
akkor is lehet fókuszban, amikor épp nincs kirajzolva.

## Scoover elemkészlet – jövőbeli funkció (VÁZLAT, nincs megvalósítva)

Előre megrajzolt, vektoros grafikai elemek, amiket a vevő szabadon a rollerre
húzhat és pozicionálhat – ugyanúgy, ahogy ma a feliratokat. A motocross-
iparágban ez bevett gyakorlat (szponzorlogó-készletek a matricaszettekben), és
**nulla extra gyártási költséggel** jelentősen növeli a testreszabás élményét:
ugyanaz a nyomtatott ív készül, csak más vektorok kerülnek rá.

**Elemtípusok:** villámok, ék/csík-sávok, rajtszám-keretek (a szám a vevőé),
feliratblokkok/„szalagok", sebesség-vonalak, sarok- és élkiemelők, egyszerű
geometrikus alakzatok (háromszög-raszter, hexagon-mező).

**Adatmodell** – a meglévő felirat-logika mintájára (`src/App.jsx` `labels[]`,
`utils/labelStyle.js`, `LabelLayer.jsx`):

```js
// src/data/decals/index.js (tervezett)
{ id: 'bolt-01', name: 'Villám', category: 'motocross',
  d: 'M … Z',                 // egyetlen, normalizált path 0..100 koordinátatérben
  aspect: 0.42,               // szélesség/magasság arány a helyes skálázáshoz
  colorable: true }           // egyszínű elem, a vevő színt választhat hozzá
// az App állapotában:  decals: [{ id, pieceId, x, y, scale, rotate, color, flipX }]
```

**Renderelés:** új `DecalLayer.jsx` a `LabelLayer` mellé, ugyanabba a darab-
`clipPath`-ba – így az elem sem lóghat le a darabról, és a szétnyitott/fotós
nézetben is együtt mozog vele. A húzás ugyanaz a pointer-event logika, ami a
feliratnál már működik.

**Gyártás felé:** a rendelési JSON `decals[]` tömbbel bővül (ugyanaz a szerver
oldali sanitizálás, mint a feliratoknál – lásd `server/wordpress/…php`), a
nyomtatási fájlban pedig a felirat-réteggel egy rétegre kerül, vektorosan.

**Üzleti megjegyzés:** az elemkészlet a PRINT szint része maradjon, felár nélkül
(mint a feliratok) – nem tesz EGYEDI kategóriába, mert nem vevői képfeltöltés.
Az EGYEDI szint továbbra is kizárólag a saját kép feltöltése.

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
