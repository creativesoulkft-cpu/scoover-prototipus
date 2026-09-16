# Shoprenter archiváló eszközök

A Whoosh webshop (elektromos-roller.net) Shoprenter → WooCommerce költözésének
2. fázisa: teljes archiválás a Shoprenter lekapcsolása előtt.

## Miért a publikus boltból dolgozik

A környezetben megkapott Shoprenter REST API kulcs (`SHOPRENTER_API_USER` =
`claude-termek`) **nem működik**: az `elektromosroller.api.shoprenter.hu`
minden végpontra `401 {"error":401,"message":"The request requires user
authentication"}` választ ad, pontosan ugyanúgy, mint hitelesítés nélkül vagy
szándékosan rossz jelszóval. A hiba tehát nem a kérésben van, hanem a kulcs
érvénytelen vagy nincs engedélyezve.

Ezért az archívum a **publikus bolt** `sitemap.xml`-jéből és a termékoldalak
HTML-jéből készül. Ez a teljes élő katalógust lefedi, de nem látja a nem
publikált termékeket és a nem hivatkozott médiatár-fájlokat (lásd
`migracio/README.md`, „Ismert hiányok”).

Ha a kulcs megjavul, az API-s út lényegesen jobb adatot ad (pontos készletszám,
variánsok, inaktív termékek) – akkor érdemes újrafuttatni.

## Futtatás

```bash
# a gyorsítótár helye tetszőleges, de maradjon a repón kívül
export SR_CACHE=/tmp/sr-cache

node tools/shoprenter/01-oldalak.mjs        # sitemap + minden oldal HTML-je a gyorsítótárba
node tools/shoprenter/02-kinyer.mjs         # HTML -> migracio/adat/*.json
node tools/shoprenter/03-kepek.mjs          # termékképek eredeti felbontásban
node tools/shoprenter/05-tartalmi-kepek.mjs # banner/ckeditor/kategória képek
node tools/shoprenter/04-atiranyitas.mjs    # 301 webcím-térkép
node tools/shoprenter/06-osszefoglalo.mjs   # záró összesítő
```

Minden lépés **újraindítható**: a már letöltött fájlokat kihagyja, a hálózati
hibákat exponenciálisan növekvő várakozással újrapróbálja. A scriptek csak
összesítést írnak a konzolra, termékadatot nem.

## Fájlok

| fájl | szerep |
|---|---|
| `lib.mjs` | közös segédek: curl-alapú párhuzamos letöltés, HTML-elemzés, slug |
| `01-oldalak.mjs` | sitemap beolvasása, minden oldal HTML-jének letöltése |
| `02-kinyer.mjs` | termék / kategória / oldal adatok kinyerése JSON-ba |
| `03-kepek.mjs` | termékképek eredeti felbontásban, termékenkénti mappába |
| `04-atiranyitas.mjs` | 301 webcím-térkép (CSV, JSON, nginx, .htaccess, WP-bővítmény) |
| `05-tartalmi-kepek.mjs` | nem termékhez kötött képek (banner, ckeditor, kategória) |
| `06-osszefoglalo.mjs` | záró összesítő és ellenőrző számok |

## Két dolog, amin könnyű elcsúszni

**Eredeti felbontás.** A CDN-en az `/image/cache/<méret>/kép.jpg.webp` a
méretezett-konvertált változat, az `/image/data/kép.jpg` a ténylegesen
feltöltött eredeti. A cache-elt fájl néha *nagyobb* bájtban (felnagyítja és
újratömöríti), ezért a méret nem jó iránytű – a példaképnél az eredeti
1100×1100, a cache-elt 1910×1000 felskálázva. Az archívum mindig az
`/image/data/` fájlt menti.

**Fájlnév-ütközés.** A CDN-útvonalak első ~70 karaktere azonos, ezért a
beszédes fájlnévből csonkolt gyorsítótár-név tömegesen ütközik (a 2240 kép-URL
786 névre esett össze, vagyis más termék képe került volna a mappába). A
gyorsítótár ezért az URL SHA-1 lenyomatát használja névként.

## Galériaszámláló és videók

A termékoldal főképe alatti „Kép 1/N” számláló a galériába tett videót is
beleszámolja, a bélyegképek számlálója nem. Ezért a tényleges képszám a két
érték közül a kisebb – a `02-kinyer.mjs` így ellenőrzi magát. A beágyazott
termékvideók (iframe) külön mezőbe kerülnek; a lábléc YouTube-linkje nem
számít termékvideónak.
