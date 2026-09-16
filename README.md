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
  textúra fölött, saját rétegben, a darab alakjára vágva, kategóriánként más
  betűtípussal (Orbitron / Anton / Rajdhani), automatikus fehér/fekete színnel a
  háttér világossága alapján; ki/be kapcsolható, szöveg és céldarab szerkeszthető
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
      index.js        #   regiszter
      categories.js   #   termékvonalak, stíluskategóriák (+ betűtípus, csempe-lépték), színek, sűrűség
      print-textures.js #  a 9 nyomtatott textúra bejegyzései (kép: public/patterns/)
      _helpers.js     #   procedurális csempe-segédek
      solid-*.js / gradient-*.js / carbon-3d.js / hex-tech.js
  components/
    ScooterCanvas.jsx   # roller-vázlat: darabok + közös minta-fill + szétnyitás
    PatternDefs.jsx     # minta → SVG <defs> (pattern / gradient / image-tile / image), fill-érték
    LabelLayer.jsx      # vektoros felirat a textúra fölött (getBBox-alapú méretezés, clipPath)
    LabelControls.jsx   # felirat ki/be, szöveg, céldarab
    PatternGallery.jsx  # mintaválasztó galéria
    PatternThumb.jsx    # bélyegkép (ugyanazzal a renderelővel, mint a vászon)
    UploadPanel.jsx     # saját kép feltöltése (drag&drop + fájlválasztó)
    ModelSelector.jsx   # modellválasztó legördülő
    PatternControls.jsx # méret/forgatás/eltolás + nézeti kapcsolók
    PieceList.jsx       # darablista, hover-kiemelés, ki/bekapcsolás
  hooks/useScooterModel.js  # lazy modellbetöltés + cache
  utils/image.js            # feltöltés-validálás, kicsinyítés, világosság-mérés
  utils/color.js            # világosság → felirat-szín
  utils/assets.js           # statikus képek URL-je (normál / egyfájlos build)
public/patterns/            # nyomtatott textúrák (1024 px WebP + 256 px bélyegkép)
tools/generate-schematic.js # sematikus vázlat-generátor (fejlesztői segéd, nem fut az appban)
```

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
6. **Webshop-összekötés.** A konfigurátor kimenete egy rendelési JSON:
   `{ modelId, patternId | uploadId, transform, pieces: [id, enabled], preview: png }`.
   Ezt egy "Kosárba" gomb küldi a webshopnak (WooCommerce/Shopify egyedi termék-meta),
   árazás darabszám és felület (mm²) alapján, a preview PNG-t a `<svg>`-ből
   kliens oldalon rendereljük (canvas → dataURL).
7. **Minőség.** Egységtesztek az adatfájlok sémájára (minden darabnak van `d`,
   egyedi `id`), vizuális regressziós teszt (Playwright screenshot) modellenként,
   hogy egy vágófájl-frissítés ne törje el csendben az előnézetet.

## Shoprenter API (termékfeltöltés)

`tools/shoprenter/sr-api.mjs` – a bolt (`elektromosroller.api.myshoprenter.hu`) kategóriáit és
termékeit kérdezi le, illetve termékeket tölt fel a `productExtend` erőforráson keresztül.
Hitelesítő adatok környezeti változóból (a script nem írja ki őket):

- régi API: `SHOPRENTER_API_USER` + `SHOPRENTER_API_PASSWORD` (Basic auth)
- új API-kliens: `SHOPRENTER_CLIENT_ID` + `SHOPRENTER_CLIENT_SECRET` (OAuth, `api2` végpont) – ha meg van adva, ezt használja
- `SHOPRENTER_SHOP` – bolt neve, alapértelmezés `elektromosroller`

```bash
node tools/shoprenter/sr-api.mjs check                 # hitelesítés próbája
node tools/shoprenter/sr-api.mjs categories            # teljes kategóriafa (név, innerId, API id)
node tools/shoprenter/sr-api.mjs products 2            # első 2 termék
node tools/shoprenter/sr-api.mjs product SKU-123       # egy termék SKU alapján
node tools/shoprenter/sr-api.mjs languages             # nyelv-id a leírásokhoz
node tools/shoprenter/sr-api.mjs get taxClasses?full=1 # adóosztály-id
node tools/shoprenter/sr-api.mjs create termek.json --dry-run
node tools/shoprenter/sr-api.mjs create termek.json    # POST productExtend
```

Az API-kliensnél (admin > Beállítások > API beállítások > Egyedi API felhasználó) bepipálandó
engedélyek a termékfeltöltéshez: `product.product:read` + `:write`, `product.category:read`
(+ `:write`, ha kategóriát is hozunk létre), `product.manufacturer:read` + `:write`,
`taxClass.taxClass:read`, `localization.language:read`, `product.stockStatus:read`,
`store.file:read` + `:write` (termékképek feltöltéséhez).

Minta-payload: `tools/shoprenter/sample-product.json` (a `language`, `taxClass`, `category`
id-ket a fenti parancsokból kell kitölteni). Rate limit: 3 kérés/mp, a script tartja.

### Teljes bolt-mentés (WooCommerce migrációhoz)

`tools/shoprenter/sr-export.mjs` – minden lekérhető adatot (termékek, kategóriák, gyártók,
tulajdonságok, URL-aliasok, vevők, rendelések, infó-oldalak) `export/shoprenter/*.json`-ba ment,
a termékképeket `export/shoprenter/images/` alá tölti. Újraindítható, a kész fájlokat kihagyja.

```bash
node tools/shoprenter/sr-export.mjs               # minden
node tools/shoprenter/sr-export.mjs --no-orders   # rendelések nélkül
node tools/shoprenter/sr-export.mjs --images-only # csak képek a kész products.json alapján
```

Az `export/` mappa a `.gitignore`-ban van (személyes adatok), a mentést külön kell megőrizni.

## WooCommerce migráció

`tools/woocommerce/wc-import.mjs` – a Shoprenter-mentésből feltölti a kategóriákat, gyártókat és
termékeket a WooCommerce boltba, és elkészíti a 301-átirányítási listát a régi URL-ekről.
Környezeti változók: `WC_URL`, `WC_KEY`, `WC_SECRET` (WooCommerce > Beállítások > Haladó > REST API,
Olvasás/Írás joggal).

```bash
node tools/woocommerce/wc-import.mjs fields           # a mentett Shoprenter-mezők ellenőrzése
node tools/woocommerce/wc-import.mjs check            # kapcsolat, WooCommerce-verzió, ÁFA-beállítás
node tools/woocommerce/wc-import.mjs categories       # kategóriafa (szülő előbb)
node tools/woocommerce/wc-import.mjs brands           # gyártók
node tools/woocommerce/wc-import.mjs products 5 --dry-run   # 5 termék próbája küldés nélkül
node tools/woocommerce/wc-import.mjs products         # az összes termék, 50-es kötegekben
node tools/woocommerce/wc-import.mjs redirects        # export/woocommerce/redirects.csv
```

Az árat a Shoprenter nettóban tárolja; az importáló alapból bruttóra váltja az adóosztály
kulcsával (`--price=net` a nettó átvitelhez, `--vat=27` az alapértelmezett kulcs).
A képeket a WooCommerce a régi boltból tölti le, ezért a migrációt a régi bolt lekapcsolása
előtt kell lefuttatni, vagy `--image-base` kapcsolóval más forrást kell megadni.
Az állapot `export/woocommerce/state.json`-ban van, a futás bármikor újraindítható.

### WordPress beállítása (Forpsi tárhely, SSH)

`tools/woocommerce/wp-setup.sh` – egy menetben felkonfigurálja az új boltot: WP-CLI, magyar nyelv,
időzóna, HUF pénznem, 27% ÁFA bruttó árakkal, `/termek/` és `/termekkategoria/` útvonalak
(ugyanaz, amit a `redirects` parancs vár), magyar pluginok, Astra sablon, végül létrehoz egy
WooCommerce REST API kulcsot és kiírja.

```bash
SITE_URL=https://uj.elektromos-roller.net bash wp-setup.sh
```

Telepített pluginok: HuCommerce, Számlázz.hu integráció, Barion, Csomagpontok és Címkék
(GLS, Foxpost, Packeta, MPL egyben), Redirection, Rank Math SEO, WP Super Cache, Loco Translate.
A SimplePay plugin nincs a WordPress könyvtárában, azt az OTP oldaláról kell letölteni.

### Élesítés

Az új boltot ideiglenes aldomainen érdemes építeni, hogy a régi bolt addig is menjen.
Amikor kész, a Forpsi DNS-ben átáll a fő domain, és a WordPress címét át kell írni:

```bash
php wp-cli.phar search-replace 'uj.elektromos-roller.net' 'www.elektromos-roller.net' --all-tables
php wp-cli.phar option update home 'https://www.elektromos-roller.net'
php wp-cli.phar option update siteurl 'https://www.elektromos-roller.net'
php wp-cli.phar rewrite flush --hard
php wp-cli.phar cache flush
```
