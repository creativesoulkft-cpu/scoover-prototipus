# Shoprenter → WooCommerce költözés – forgatókönyv

Készült: 2026-09-16. Fogalmak: `docs/SZOTAR.md`.

## Kiinduló helyzet

A bolt: `elektromosroller.myshoprenter.hu`, webcím `elektromos-roller.net`.

| Mi | Mennyi |
|---|---|
| Termék összesen | 1128 |
| Ebből aktív | 728 |
| Termékkép a Shoprenter CDN-jén | 4833 |
| Webcím (URL-alias) | 1128 |
| Kategória | 108, ebből 21 üres |

Adatminőség az aktív termékeknél: 595 leírása 200 karakternél rövidebb, 68 teljesen üres,
183 meta leírás hiányzik, 235 meta azonos a terméknévvel, 723 GTIN nélkül, 250 súly nélkül,
251 gyártó nélkül, 355 lejárt akció, 103 negatív készlet, 145 webcím végén azonosító.

## Alapszabályok minden fázisra

1. **Fázisonként új chat.** Egy chat egy fázis. A végén lezárni.
2. **Az adat ne menjen a kontextusba.** A termék-JSON-t script dolgozza fel, az ügynök csak
   a scriptet írja és néhány sornyi mintát néz meg. Egyszeri teljes beolvasás több millió token.
3. **Ultracode kikapcsolva**, kivéve az 1. fázist.
4. **Minden eredmény a repóba megy**, hogy a következő fázis lássa.
5. A Shoprenter API rate limitje 3 kérés másodpercenként, a segédscript ezt tartja.

## Fázisok

### 1. Terv és mezőleképezés
**Modell: Fable 5.1 · effort: xhigh · ultracode: BE**

Feladat: a Shoprenter mezők és a WooCommerce mezők pontos megfeleltetése, a kategóriafa
átvitele, a döntés arról, mit viszünk át és mit hagyunk el. Itt egy hiba 1128 terméken fut végig,
ezért éri meg a legdrágább beállítás.

Kimenet: `docs/migracio-terkep.md` a mezőleképezéssel és az elhagyandó elemek listájával.

### 2. Archiválás – ez a sürgős
**Modell: Opus 5 · effort: high · ultracode: KI**

Ez a visszafordíthatatlan rész: a Shoprenter lekapcsolása után a 4833 kép linkje meghal.

Feladat:
- mind a 4833 kép letöltése eredeti felbontásban, termékenkénti mappába
- teljes adatmentés JSON-ban: termék, leírás, meta, ár, készlet, kategória, attribútum
- webcím-térkép: régi cím és javasolt új slug, a 301 átirányításokhoz
- a vevők és rendelések exportja az adminból, ha az API nem adja

Kimenet: `migracio/kepek/`, `migracio/termekek.json`, `migracio/url-terkep.csv`.

### 3. WooCommerce import-fájl
**Modell: Opus 5 · effort: high · ultracode: KI**

Feladat: a 2. fázis adataiból WooCommerce CSV készítése az 1. fázis leképezése szerint,
majd ellenőrző script, ami minden mezőt visszamér a forrásra.

Kimenet: `migracio/woocommerce-import.csv` és egy eltéréslista.

### 4. Tömeges szöveg – nem a Claude Code keretéből
**Modell: Sonnet 5 vagy Opus 5 · Batch API · API-kulcsról**

Feladat: a 595 rövid és 68 üres leírás pótlása, meta címek és leírások generálása,
kategóriánkénti sablon alapján. Ez script-ből fut, csomagban, fele áron.
Nagyságrend: Sonnet 5-tel kb. 3 dollár, Opus 5-tel kb. 7,5 dollár az egész.

Kimenet: `migracio/szovegek.json`, ami a 3. fázis CSV-jébe épül.

### 5. Élesítés
**Modell: Opus 5 · effort: xhigh · ultracode: KI**

Feladat: import a WooCommerce-be, a 301 átirányítások beállítása a webcím-térképből,
tesztelés mintavétellel, Google Search Console ellenőrzés.

## Az 1. fázis indító üzenete

Új chat, modell Fable 5.1, effort xhigh. Másold be:

> ultracode
>
> A Whoosh elektromos roller webshopot költöztetjük Shoprenterről WooCommerce-re.
> Olvasd el a repóban a `docs/KOLTOZES.md` és `tools/shoprenter/FELTOLTES.md` fájlt,
> azokban van a bolt teljes leírása és az eddigi munka.
>
> A feladatod az 1. fázis: a Shoprenter és a WooCommerce mezőinek pontos megfeleltetése.
> Készíts `docs/migracio-terkep.md` néven egy leképezési táblázatot, ami megmondja, melyik
> Shoprenter mező hova kerül a WooCommerce-ben, mi lesz a kategóriákkal és attribútumokkal,
> mit viszünk át és mit hagyunk el. Nézd meg a hivatalos WooCommerce import dokumentációt is.
>
> Az adatot ne olvasd be a kontextusba, scripttel dolgozz. A végén commitold a repóba.

## A 2. fázis indító üzenete

Új chat, modell Opus 5, effort high, ultracode nélkül:

> A Whoosh webshop költöztetése Shoprenterről WooCommerce-re, 2. fázis: archiválás.
> Olvasd el a `docs/KOLTOZES.md` fájlt a repóban.
>
> Ez a sürgős rész: a Shoprenter lekapcsolása után a képek elérhetetlenné válnak.
> Töltsd le mind a 4833 termékképet, készíts teljes adatmentést JSON-ban, és állíts össze
> egy webcím-térképet a 301 átirányításokhoz.
>
> A Shoprenter API-hoz a `tools/shoprenter/sr-api.mjs` segédscript és a környezeti változók
> adottak. Scripttel dolgozz, az adatot ne olvasd a kontextusba. Fájlokat a `migracio/`
> mappába ments, és commitold a repóba.
