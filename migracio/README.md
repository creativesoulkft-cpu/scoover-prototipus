# Whoosh webshop archívum — Shoprenter → WooCommerce, 2. fázis

Teljes mentés az **elektromos-roller.net** Shoprenter-boltról, a lekapcsolás
előtt. A pontos darabszámok gépi formában: [`adat/osszefoglalo.json`](adat/osszefoglalo.json).

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
