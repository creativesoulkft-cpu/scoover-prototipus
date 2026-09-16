# Shoprenter archiváló eszközök

A Whoosh webshop (elektromos-roller.net) Shoprenter → WooCommerce költözésének
2. fázisa: teljes archiválás a Shoprenter lekapcsolása előtt.

## Beállítás

```bash
export SHOPRENTER_API_USER='...'      # az admin „API beállítások" oldaláról
export SHOPRENTER_API_PASSWORD='...'  # ugyanonnan
export SR_CACHE=/tmp/sr-cache         # gyorsítótár, maradjon a repón kívül
```

A kulcs **kizárólag környezeti változóból** jön, a kódba soha nem íródik.

**Figyelem a címre:** az API a `myshoprenter.hu` alatt él
(`https://elektromosroller.api.myshoprenter.hu`), **nem** a `shoprenter.hu` alatt.

**Két különböző API van az adminban.** Az „API beállítások" oldal a klasszikus,
HTTP Basic auth-os REST API — ezt használják a scriptek. Az „Egyedi API
felhasználó" (Client ID + Secret, `api2` aldomain) egy újabb, másik rendszer, más
hitelesítéssel; Basic auth-tal 401-et ad. Ne keverd össze a kettőt.

## Futtatás

```bash
# API-s út – ez a teljes katalógust hozza, a nem publikált termékekkel együtt
node tools/shoprenter/07-api-mentes.mjs      # minden gyűjtemény JSON-ba
node tools/shoprenter/08-api-kepek.mjs       # minden termékkép eredeti felbontásban
node tools/shoprenter/09-osszefesules.mjs    # a publikus képkészlet hozzáfésülése
node tools/shoprenter/10-osszesites.mjs      # konszolidált termékadat + 301 térkép
node tools/shoprenter/06-osszefoglalo.mjs    # záró összesítő

# Publikus boltoldalas út – API nélkül is működik, de csak a látható katalógust látja
node tools/shoprenter/01-oldalak.mjs         # sitemap + minden oldal HTML-je
node tools/shoprenter/02-kinyer.mjs          # HTML -> JSON
node tools/shoprenter/03-kepek.mjs           # a látható termékek képei
node tools/shoprenter/05-tartalmi-kepek.mjs  # banner / ckeditor / kategória képek
node tools/shoprenter/04-atiranyitas.mjs     # 301 térkép a publikus címekre
```

Minden lépés **újraindítható**: a meglévő fájlokat kihagyja, a hálózati hibákat
exponenciálisan növekvő várakozással újrapróbálja. A scriptek csak összesítést
írnak a konzolra, termékadatot nem.

## Fájlok

| fájl | szerep |
|---|---|
| `sr-api.mjs` | REST kliens: Basic auth, lapozás, helykitöltő-kulcs felismerése |
| `lib.mjs` | curl-alapú párhuzamos letöltés, HTML-elemzés, slug |
| `01-oldalak.mjs` | sitemap + képsitemap, minden oldal HTML-je |
| `02-kinyer.mjs` | termék / kategória / oldal adatok a HTML-ből |
| `03-kepek.mjs` | a publikusan látható termékek képei |
| `04-atiranyitas.mjs` | 301 térkép a publikus címekre |
| `05-tartalmi-kepek.mjs` | nem termékhez kötött képek |
| `06-osszefoglalo.mjs` | záró összesítő és ellenőrző számok |
| `07-api-mentes.mjs` | minden API-gyűjtemény mentése |
| `08-api-kepek.mjs` | a TELJES képállomány, a rejtett termékekével együtt |
| `09-osszefesules.mjs` | a két képforrás uniója |
| `10-osszesites.mjs` | konszolidált termékadat + teljes 301 térkép |

## Amin könnyű elcsúszni

**Az API nem felülhalmaza a publikus boltnak.** Kézenfekvő lenne az API-t teljes
forrásnak venni, de 3 kép, amit a termékoldal kirak, sem a `productImages`, sem a
`mainPicture` mezőben nincs benne. A 9. fázis ezért fésüli össze a kettőt.

**Dekódolt útvonalon hasonlíts, ne nyers URL-en.** Ugyanaz a fájl más
URL-kódolással is hivatkozható (pl. a `&` mint `%26`), és nyers URL-t hasonlítva
hamis eltérést kapsz. Ez már okozott egy téves törlést.

**Eredeti felbontás.** A CDN-en az `/image/cache/<méret>/kép.jpg.webp` a
méretezett-konvertált változat, az `/image/data/kép.jpg` a feltöltött eredeti. A
cache-elt néha *nagyobb* bájtban, mert felskáláz, ezért a méret nem jó iránytű:
a mintaképnél az eredeti 1100×1100, a cache-elt 1910×1000 felnagyítva.

**Fájlnév-ütközés.** A CDN-útvonalak első ~70 karaktere azonos, ezért a beszédes
fájlnévből csonkolt gyorsítótár-név tömegesen ütközik: a 2240 kép-URL 786 névre
esett össze, vagyis más termék képe került volna a mappába. A gyorsítótár ezért
az URL SHA-1 lenyomatát használja névként.

**`limit=500` fölött az API hibás választ ad** (25 elemet küld és elrontja a
lapszámot), ezért a lapozás felső határa 200.

**Az API árai nettók.** Bruttó = `netto * 1.27`.

**A galériaszámláló.** A termékoldal „Kép 1/N" számlálója a galériába tett videót
is beleszámolja, a bélyegképeké nem — a tényleges képszám a kettő közül a kisebb.
