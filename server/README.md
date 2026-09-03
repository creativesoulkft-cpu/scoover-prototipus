# Scoover kosár-híd

Köztes Node/Express szerver a React konfigurátor (`src/`) és a WooCommerce
Store API között. Feladata:

1. fogadja a konfigurátor JSON-csomagját (`src/utils/cartConfig.js` építi fel),
2. `tier === 'custom'` esetén letölti és ellenőrzi a feltöltött kép valódi
   pixelméretét (sosem bízik a kliens állította értékekben),
3. újraszámolja és hitelesíti az árat a **közös** árazási modullal
   (`src/pricing.js` – ugyanaz a fájl, amit a kliens is importál élő
   előnézethez, nincs duplikált árazási logika),
4. a WooCommerce Store API-n keresztül létrehozza a kosártételt, a
   konfigurációt és a hitelesített egységárat egy `scoover` nevű egyedi
   mezőben átadva.

## Feltételezett WooCommerce-verzió és pluginok

- **WooCommerce 8.9+** – a Store API (`/wp-json/wc/store/v1/…`) natívan a
  mag része, nincs szükség a "WooCommerce Blocks" plugin külön
  telepítésére.
- Egy előre létrehozott, **"Egyedi roller-fólia"** nevű **variálható**
  WooCommerce termék (a variáció csak a raktár/riportolás miatt hasznos –
  a tényleges árat a híd mindig felülírja, lásd lent).
- **`server/wordpress/scoover-store-api-extension.php`** – saját, ehhez a
  projekthez írt mu-plugin (WordPress-oldali kód, amit majd a végleges WP
  telepítésre kell másolni a `wp-content/mu-plugins/` mappába). Nélküle a
  Store API a `scoover` egyedi mezőt figyelmen kívül hagyná, és az ár sem
  íródna felül. Lásd a fájl tetején lévő megjegyzést: a hookok döntő
  többsége hivatalos WooCommerce forrás/dokumentáció alapján ellenőrzött,
  egy pontja ("payment_complete" utáni státuszváltás pontos
  verziófüggése, illetve a checkout-oldali kosár-átadás) ELLENŐRIZENDŐ
  jelzéssel van ellátva, mert ehhez élő WooCommerce-telepítés kell.

## Környezeti változók

Másold `server/.env.example` → `server/.env`, és töltsd ki:

| Változó | Jelentés |
|---|---|
| `PORT` | A híd szerver portja (alapértelmezett 8787) |
| `CORS_ORIGIN` | A frontend origója, amit a híd CORS-on beenged |
| `WOO_MODE` | `mock` (nincs valódi WooCommerce, szimulált válasz) vagy `live` |
| `WOO_BASE_URL` | A WooCommerce site URL-je (csak `live` módban kötelező) |
| `WOO_CUSTOM_PRODUCT_ID` | Az "Egyedi roller-fólia" termék WooCommerce ID-ja |
| `WOO_TIER_VARIATION_IDS` | Opcionális JSON, pl. `{"solid":124,"print":125,"custom":126}` – ha a termék szint szerinti variációkkal rendelkezik |
| `WOO_CHECKOUT_URL` | Hova irányítsuk a vásárlót sikeres kosárba helyezés után |
| `MIN_CUSTOM_IMAGE_WIDTH` / `_HEIGHT` | CUSTOM feltöltés minimum elfogadott felbontása (alapértelmezett 2000×2000 px) |
| `UPLOAD_DIR` | Hova mentse helyben a feltöltött CUSTOM képeket (fejlesztéshez/mock módhoz) |
| `PUBLIC_BASE_URL` | Milyen URL-en érhetők el a mentett képek (`{PUBLIC_BASE_URL}/uploads/…`) |

A frontend oldalon (`.env` a repó gyökerében, Vite olvassa):

| Változó | Jelentés |
|---|---|
| `VITE_BRIDGE_URL` | A híd szerver URL-je (alapértelmezett `http://localhost:8787`) |

## Indítás

```bash
cd server
npm install
cp .env.example .env      # WOO_MODE=mock alapértelmezett – működik WordPress nélkül is
npm run dev                # http://localhost:8787
```

Másik terminálban a konfigurátor:

```bash
npm install
npm run dev                # http://localhost:5173
```

## Tesztelés helyi WooCommerce nélkül (mock mód)

`WOO_MODE=mock` (az `.env.example` alapértelmezése) esetén a híd **nem hív ki
semmilyen valódi WooCommerce-t** – a `/api/cart/add` végpont a saját, valós
logikáját futtatja végig (mezőellenőrzés, kép-felbontás ellenőrzés a ténylegesen
feltöltött fájlon, árszámítás), csak a WooCommerce Store API hívást
helyettesíti egy szimulált válasszal. Ez azt jelenti, hogy a teljes lánc –
beleértve a valódi fájlfeltöltést és a valódi felbontás-ellenőrzést – már ma,
WordPress-telepítés nélkül tesztelhető:

```bash
curl -F "image=@/path/to/kep.jpg" http://localhost:8787/api/upload
# -> { "ok": true, "url": "http://localhost:8787/uploads/....jpg", "width": ..., "height": ... }

curl -X POST http://localhost:8787/api/cart/add \
  -H "Content-Type: application/json" \
  -d '{
    "model": "kukirin-g2",
    "tier": "custom",
    "uploadedImageUrl": "http://localhost:8787/uploads/....jpg",
    "imageTransform": { "scale": 1, "rotate": 0, "dx": 0, "dy": 0 },
    "labels": [],
    "includeFootboard": true,
    "calculatedPrice": 47800
  }'
```

Vagy egyszerűbben: indítsd el mindkét szervert (`npm run dev` mindkét
mappában), nyisd meg a konfigurátort, válaszd a CUSTOM mintát (tölts fel egy
≥2000×2000 px képet), pipáld be a taposófelület extrát, és kattints a
"Kosárba teszem" gombra – a hibaüzenetek (alacsony felbontás, hiányzó mező,
elérhetetlen híd szerver) élesben, magyarul jelennek meg.

## Kosár-átadás a pénztárnak (fontos, nyitott pont)

A Store API "vendégkosár" munkamenetét egy `Cart-Token` fejléc azonosítja
(JWT-szerű token, amit egy `GET /wp-json/wc/store/v1/cart` hívás válaszfejléce
ad vissza, és minden további hívásnál ugyanazt kell visszaküldeni – ezt a
mechanizmust a híd szerver `server/lib/wooClient.js`-ben már használja). Ez a
token viszont **nem azonos** azzal a cookie-alapú munkamenettel, amit a
WooCommerce klasszikus, PHP-renderelt checkout oldala használ – tehát ha a
híd szerver-oldalon (nem a vásárló böngészőjéből) hívja a Store API-t, a
vásárló böngészője alapból **nem fogja ugyanazt a kosarat látni**, amikor a
checkout oldalra érkezik.

Ez a projekt jelen köre ezt tudatosan nyitva hagyja (a feladatkiírás szerint
sem kellett a fizetési átjárót bekötni), de **ez a következő lépés
gyakorlati vázlata**, amikor eldől a végleges WooCommerce-hosting:

- **Legegyszerűbb (ajánlott első lépésnek):** a híd ne a szerver oldalról
  hívja a Store API `add-item`-et, hanem csak validáljon és árazzon
  (`/api/cart/add` maradjon, de opcionális `dryRun` móddal), a tényleges
  `add-item` hívást pedig a **böngésző** (a React app) intézze közvetlenül a
  WooCommerce felé, a hídtól kapott hitelesített konfigurációval és árral.
  Így a böngésző saját cookie-session-je végig érvényes marad, a checkout
  oldal automatikusan látja a kosarat, session-áthidalás nem kell.
- **Ha ragaszkodunk a jelenlegi, kizárólag szerver-oldali `add-item`
  híváshoz** (ahogy a feladat kiírása kérte): egy kis WordPress-oldali
  végpont vagy `template_redirect` hook szükséges, ami a checkout oldal
  betöltésekor a URL-ben kapott tokent feloldja, és a vásárló saját, éppen
  aktív cookie-session-jébe helyezi át a tételt (`WC()->cart->add_to_cart()`
  hívással). Ennek egy induló, kikommentezett váza a
  `server/wordpress/scoover-store-api-extension.php` fájl 6. szakaszában van
  – éles WooCommerce-en tesztelendő és kidolgozandó, mielőtt bevetésre kerül.

## Következő lépés, ha eldől a végleges WooCommerce-hosting

1. Telepítsd a `server/wordpress/scoover-store-api-extension.php`
   mu-plugint, hozd létre az "Egyedi roller-fólia" variálható terméket, és
   töltsd ki a `WOO_*` környezeti változókat (`WOO_MODE=live`).
2. Dolgozd ki és teszteld a fenti "Kosár-átadás a pénztárnak" pontot a
   választott megoldással.
3. Töltsd fel a tényleges Ft-árakat `src/pricing.js`-ben (jelenleg
   placeholder-értékek – lásd a fájl tetején lévő figyelmeztetést).
4. Cseréld a `/api/upload` helyi fájltárolását (`UPLOAD_DIR`) valódi,
   tartósan elérhető tárhelyre (objektumtároló vagy a WP média-könyvtár),
   mert egy konténer-újraindítás a helyi lemezt törölheti.
5. Állítsd be a híd szerver éles URL-jét a frontend `VITE_BRIDGE_URL`
   változójában, és gondoskodj róla, hogy a híd szerver és a WooCommerce
   között a hálózat/HTTPS/CORS megfelelően legyen konfigurálva.
