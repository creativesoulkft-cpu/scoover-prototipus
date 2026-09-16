# Whoosh webshop archívum — Shoprenter → WooCommerce, 2. fázis

Teljes mentés az **elektromos-roller.net** Shoprenter-boltról, a lekapcsolás
előtt. A pontos darabszámok gépi formában: [`adat/osszefoglalo.json`](adat/osszefoglalo.json).

| | darab |
|---|---|
| termék | 716 |
| kategória | 91 |
| szöveges oldal | 59 |
| **termékkép (eredeti felbontás)** | **2447** fájl, 716 mappában |
| banner / ckeditor / kategória kép | 68 |
| beágyazott termékvideó | 21 |
| webcím a 301-térképben | 866 |
| képanyag mérete | ~2,1 GB |

Az archívumot a [`tools/shoprenter/`](../tools/shoprenter/) scriptjei készítették,
a folyamat bármikor újrafuttatható és frissíthető.

## Mi van benne

```
migracio/
├── adat/                         teljes adatmentés JSON-ban
│   ├── termekek.json             termék, leírás, meta, ár, készlet, kategória, attribútum
│   ├── kategoriak.json           kategóriák, alkategóriák, kategórialeírások
│   ├── oldalak.json              szöveges oldalak (szerviz, bérlés, hitel, blog…)
│   ├── kepek-index.json          egyedi kép-URL → mely termékekhez tartozik
│   ├── kepek-manifest.json       termékenként: melyik fájl melyik eredeti URL-ből lett
│   ├── tartalmi-kepek-manifest.json   banner / ckeditor / kategória képek
│   ├── ellenorzes.json           kinyerési ellenőrző számok
│   └── osszefoglalo.json         záró összesítő
├── kepek/
│   ├── <termek-slug>/            termékenkénti mappa, sorszámozott képek
│   │   ├── 01-….jpg              a 01- előtagú a főkép
│   │   └── 02-….jpg
│   └── _tartalmi/                nem termékhez kötött képek
└── atiranyitas/
    ├── 301-terkep.csv            régi cím → javasolt új cím (Excel-barát, ;-elválasztó)
    ├── 301-terkep.json           ugyanaz gépi feldolgozásra
    ├── redirection-plugin.csv    a WordPress „Redirection” bővítménybe importálható
    ├── redirects-nginx.conf      kész nginx szabályok
    └── redirects-htaccess.txt    kész Apache/.htaccess szabályok
```

## A képek eredeti felbontásban vannak

A Shoprenter CDN-en kétféle kép él:

- `/image/cache/<méret>/kép.jpg.webp` — méretezett, WebP-re konvertált változat,
  amit a bolt kirak a látogatónak
- `/image/data/kép.jpg` — a ténylegesen feltöltött **eredeti** fájl

Az archívum mindig az eredetit menti. Fontos: a cache-elt változat néha *nagyobb*
bájtban, mert felskálázza a képet — a méret tehát félrevezető. A mintaképnél az
eredeti 1100×1100, a cache-elt 1910×1000 felnagyítva.

## Készlet: mi került be és mi nem

A bolt publikus oldala **nem ír ki pontos darabszámot**, ezért a mentésben ez van:

- `keszlet.raktaron` — igaz/hamis, a schema.org `InStock` / `OutOfStock` alapján
- `keszlet.elerhetoseg_szoveg` — amit a vevő lát (pl. „14-21 nap szállítási idő”)
- `keszlet.stock_status_id` — a Shoprenter belső készletállapot-azonosítója

Ha a WooCommerce-ben darabszám szerinti készletkezelés kell, azt a Shoprenter
admin exportjából vagy működő API-kulccsal lehet pótolni.

## A webcím-térkép logikája

**A slug alapból változatlan marad.** Költözésnél ez a helyes döntés: nulla
ütközési kockázat, és a Google-nél felépített link-érték megmarad. A javasolt új
cím ezért `/termek/<ugyanaz-a-slug>/`.

A Shoprenter a duplikált terméknevekhez a termék azonosítóját ragasztja utótagként
(pl. `…-2771`). Ezek kozmetikailag zavaróak, ezért a térkép **külön, opcionális
oszlopban** javasol tisztított változatot — de csak ott, ahol az nem ütközik
meglévő slug-gal. Ahol ütközne, a megjegyzés jelzi, és marad az eredeti.

Két megvalósítási út közül lehet választani:

1. **Előtagos WooCommerce címek** (`/termek/…`, `/termek-kategoria/…`) — a
   megszokott, ajánlott beállítás. Ilyenkor kell a 301 átirányítás, a kész
   szabályok az `atiranyitas/` mappában vannak.
2. **Lapos terméklinkek** (a termék-permalink alapja üres) — ekkor a gyökérszintű
   régi címek nagy része **változatlanul megtartható**, átirányítás nélkül. A
   `lapos_linkkel_valtozatlan` oszlop mutatja, melyiknél működik ez. Cserébe
   nagyobb az esélye, hogy egy termék slug-ja ütközzön egy WordPress-oldaléval.

## A képszámról: 2447 vagy 4833?

Az archívum **2447 termékképet** tartalmaz, nem 4833-at. Ez nem hiányos mentés,
hanem ennyi kép érhető el a publikus boltból — három, egymástól független forrás
mondja ugyanezt:

1. a termékoldalak galériái összesen 2447 képet listáznak,
2. a bolt saját „Kép N/M” számlálóinak összege ugyanennyi (a 4 eltérés mind
   galériába tett videó, nem hiányzó kép),
3. a bolt **saját `image-sitemap.xml`-je 2228 egyedi képet** ismer – az
   archívum 2308-at tartalmaz, vagyis **egyetlen kép sem hiányzik belőle**,
   sőt bővebb nála.

A 4833-as szám tehát jó eséllyel a Shoprenter admin **médiatárának** mérete,
ami a már nem publikált és törölt termékek képeit, valamint a sehol nem
hivatkozott fájlokat is számolja. Ezekhez a publikus bolt felől nincs út –
**csak működő API-kulccsal vagy admin-exporttal menthetők**. Ha ezek is
kellenek, az API-kulcsot kell rendbe tenni (lásd lejjebb), mert a lekapcsolás
után ezek vesznek el végleg.

## Ismert hiányok

Ezeket a lekapcsolás előtt érdemes még pótolni:

1. **Az API-kulcs nem működik.** A `SHOPRENTER_API_USER=claude-termek` kulcsra az
   `elektromosroller.api.shoprenter.hu` minden végpontra `401`-et ad — ugyanúgy,
   mint hitelesítés nélkül. Az archívum ezért a publikus boltból készült.
2. **Nem publikált termékek nincsenek benne.** Ami nem szerepel a `sitemap.xml`-ben
   (inaktív, rejtett, kifutott termék), azt a publikus bolt nem mutatja meg.
3. **Médiatár-fájlok**, amelyekre egyetlen publikus oldal sem hivatkozik.
4. **Pontos készletszám, beszerzési ár, súly/méret** — ezek nem publikusak.
5. **Vevő-, rendelés-, számla- és kuponadat** — ezt a Shoprenter admin
   felületéről kell exportálni, API nélkül nem érhető el.

Az 1. pont megoldása a 2–4. pontot is megoldaná: működő API-kulccsal a
`tools/shoprenter/` scriptjei API-ból is újrafuttathatók.
