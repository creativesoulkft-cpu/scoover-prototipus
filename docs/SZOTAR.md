# Szótár – amit a Claude-dal való munkához érdemes érteni

Röviden, hétköznapi nyelven. Nem kell megtanulni, elég visszalapozni.

## Fájlok és adatok

**Script** – recept a gépnek. Leírom lépésről lépésre, mit csináljon, a gép végrehajtja,
akárhányszor. Példa: „nézd meg mind az 1128 terméknél a súlyt, és ahol nulla, írd ki egy listába".
Én egyszer megírom, a gép egy másodperc alatt lefuttatja. Ezért olcsó: a végrehajtás ingyen van.

**JSON** – fájlformátum, amiben az adat rendezetten áll. Olyan, mint egy Excel-tábla, csak
szöveges formában, és a gép könnyen olvassa. A Shoprenter ebben adja át a termékadatokat.

**CSV** – ugyanez, még egyszerűbben, sorokban és oszlopokban. Excelben megnyitható.
A WooCommerce ebből tud termékeket importálni.

**Repo** (repository, tároló) – mappa a GitHubon, ahol a fájlok vannak, és minden változás
nyoma megmarad. A miénk: `creativesoulkft-cpu/scoover-prototipus`. Ez a közös memóriánk:
minden új chat látja, ami ide bekerült.

**Branch** (ág) – a repo egy külön munkapéldánya. Amíg egy ágon dolgozom, a fő változat
érintetlen marad. A mostani munka ága: `claude/hopeful-lovelace-7kxk1g`.

**Commit / push** – mentés a repóba, illetve a mentés felküldése a GitHubra.

## Bolt és API

**API** – a bolt hátsó ajtaja, amin a gép be tud menni. Ahol te kattintanál az adminban,
ott én parancsot küldök. Ezért megy a képfeltöltés fél perc alatt.

**Scope** (jogosultság) – mit szabad az API-felhasználónak. `product.product:write` = terméket
írhat, `store.file:write` = képet tölthet fel. Ha hiányzik, a bolt 401-es hibát ad.

**Batch API** – tömeges feldolgozás. 600 termékleírás nem egyesével készül, hanem egy csomagban,
fele áron. Ez API-kulcsról megy, nem az előfizetési keretből.

**SKU / cikkszám** – a termék azonosítója a boltban. Nálunk `WHSH…` kezdetű.

**URL-alias / slug** – a termék webcíme, például
`hasznalt-aprilia-esr1-elektromos-roller-…`. A Google ezt indexeli.

**301 átirányítás** – ha a termék webcíme megváltozik, ez mondja meg a Google-nek és a
látogatónak, hogy hova került. Enélkül a régi cím hibaoldalra fut, és elvész a keresőpozíció.

**GTIN / EAN** – a termék vonalkódszáma. A Google Shopping és az Árukereső ezt kéri.

## Ahogy a Claude dolgozik

**Token** – így méri a gép a szöveget, nagyjából egy szó vagy szórészlet. Minden, amit olvasok
és írok, tokenben számolódik, és ez fogyasztja a kereted.

**Kontextus** – amit éppen fejben tartok a beszélgetésből. Minden üzenetnél az egészet
újraolvasom. Ezért drágul egy hosszú chat: fél millió tokennél minden válasz fél milliót olvas újra.

**Session / chat** – egy beszélgetés. Új chat = tiszta lap, nem emlékszik az előzőre.
A közös pont mindig a repo, nem a chat.

**Effort** – mennyire alaposan gondolkodjak. `low` gyors és felszínes, `xhigh` lassú és alapos.
Mechanikus munkára `high` bőven elég.

**Ultracode** – szétosztom a munkát több párhuzamos ügynök között, akik utána egymást
ellenőrzik. Drága. Akkor éri meg, ha a hiba drága és nehezen derül ki, például egy migrációs
tervnél. Képfeltöltésre, adatmásolásra felesleges. Bekapcsolás: írd bele az üzenetbe, hogy
`ultracode`.

**Ügynök (agent)** – egy önálló Claude-példány, ami kap egy részfeladatot, megcsinálja,
és visszaadja az eredményt. Ultracode módban több fut párhuzamosan.

**Workflow** – a forgatókönyv, ami az ügynököket vezényli: ki mit csinál, milyen sorrendben,
ki ellenőriz kit.

## Modellek és áraik

Millió tokenre vetítve, 2026 szeptemberi árak:

| Modell | Bemenet | Kimenet | Mire jó |
|---|---|---|---|
| Fable 5.1 | 10 $ | 50 $ | a legnehezebb döntések, tervezés |
| Opus 5 | 5 $ | 25 $ | általános munka, scriptek, feltöltés |
| Sonnet 5 | 2 $ | 10 $ | tömeges, sablonos szöveg |
| Haiku 4.5 | 1 $ | 5 $ | egyszerű, gépies feladatok |

Ökölszabály: a nehézség nem a modellben dől el, hanem abban, hogy scripttel dolgozunk-e
és visszaellenőrizzük-e. Alapból Opus 5, Fable 5.1 csak a tervezéshez.
