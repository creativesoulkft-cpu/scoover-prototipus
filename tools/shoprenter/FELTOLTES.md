# Shoprenter termékfeltöltés – puska (elektromosroller / Whoosh bolt)

Frissítve: 2026-09-15. Forrás: a „Roller fólia” kategória 26 élő terméke (productExtend GET),
a bolt első 2 régi rollere, a hivatalos Shoprenter API-minták és a teljes kategóriafa.
Minden ár **nettó** a JSON-ban (27% ÁFA: bruttó = nettó × 1,27).

Fájlok:
- `tools/shoprenter/sr-api.mjs` – API-kliens (`create`, `update`, `product`, `get` …)
- `tools/shoprenter/sample-product.json` – kész próbatermék: **WHSHFL1G2MPRS** (Kukirin G2 Master egyszínű fóliaszett – Piros), `status: "0"` (inaktív)

---

## 1. Azonosítók (base64 „entitás-mező=érték”)

### Nyelv, adóosztály, termékosztály, gyártó, mértékegység

| Mi | innerId | API id | Megjegyzés |
|---|---|---|---|
| Nyelv – magyar | 1 | `bGFuZ3VhZ2UtbGFuZ3VhZ2VfaWQ9MQ==` | kötelező, ez jelenik meg |
| Nyelv – második | 4 | `bGFuZ3VhZ2UtbGFuZ3VhZ2VfaWQ9NA==` | minden terméknek van; ugyanazt a magyar tartalmat küldjük bele |
| Adóosztály 27% | 10 | `dGF4Q2xhc3MtdGF4X2NsYXNzX2lkPTEw` | 26/26 fólia + régi rollerek |
| Termékosztály „Fólia” | 16 | `cHJvZHVjdENsYXNzLXByb2R1Y3RfY2xhc3NfaWQ9MTY=` | ehhez tartozik a `szin` attribútum |
| Termékosztály „Kiegészítők” | 10 | `cHJvZHVjdENsYXNzLXByb2R1Y3RfY2xhc3NfaWQ9MTA=` | kijelzővédő / táska / ponyva |
| Gyártó Whoosh | 27 | `bWFudWZhY3R1cmVyLW1hbnVmYWN0dXJlcl9pZD0yNw==` | fóliák 18/26, új egyszínűek 9/10 |
| Gyártó Kukirin | 25 | `bWFudWZhY3R1cmVyLW1hbnVmYWN0dXJlcl9pZD0yNQ==` | régebbi fóliák |
| Súlyosztály (gramm) | 2 | `d2VpZ2h0Q2xhc3Mtd2VpZ2h0X2NsYXNzX2lkPTI=` | fóliánál weight `250.00` |
| Hosszosztály (cm) | 1 | `bGVuZ3RoQ2xhc3MtbGVuZ3RoX2NsYXNzX2lkPTE=` | 8 × 8 × 35 |

„Scoover” nevű gyártó **nincs** a boltban – `{"name":"Scoover"}` új gyártót hozna létre. Mindig `{"id": …}`-vel hivatkozz.

### Kategóriák (categories.txt)

| Termék | Kategória | innerId | API id |
|---|---|---|---|
| fólia | Roller fólia (gyökér) | 334 | `Y2F0ZWdvcnktY2F0ZWdvcnlfaWQ9MzM0` |
| fólia | Elektromos rollerek | 138 | `Y2F0ZWdvcnktY2F0ZWdvcnlfaWQ9MTM4` |
| fólia | └ Kukirin / Kugoo elektromos rollerek | 144 | `Y2F0ZWdvcnktY2F0ZWdvcnlfaWQ9MTQ0` |
| kiegészítő | Kiegészítők (szülő) | 139 | `Y2F0ZWdvcnktY2F0ZWdvcnlfaWQ9MTM5` |
| kiegészítő | └ AZ ÖSSZES KIEGÉSZÍTŐ | 224 | `Y2F0ZWdvcnktY2F0ZWdvcnlfaWQ9MjI0` |
| kijelzővédő | └ Kijelzővédő | 211 | `Y2F0ZWdvcnktY2F0ZWdvcnlfaWQ9MjEx` |
| táska | └ Táskák | 218 | `Y2F0ZWdvcnktY2F0ZWdvcnlfaWQ9MjE4` |
| egyéb | └ Egyéb kiegészítők | 232 | `Y2F0ZWdvcnktY2F0ZWdvcnlfaWQ9MjMy` |
| ponyva, tömítés | Vízállóság növelése (gyökér) | 319 | `Y2F0ZWdvcnktY2F0ZWdvcnlfaWQ9MzE5` |
| roller | └ WHOOSH elektromos rollerek | 148 | `Y2F0ZWdvcnktY2F0ZWdvcnlfaWQ9MTQ4` |

Fólia konvenció: **334 + 138 + 144** (20/26, a 10 egyszínűnél kivétel nélkül). A Kiegészítők-ágat fóliára soha nem használták.
Kijelzővédőhöz/táskához 139-es ág (211 / 218) + 224, ponyvához 319 – a régi rollerek/kiegészítők mintája szerint érdemes utána nézni `product <SKU>` paranccsal.

### Készletstátuszok

| Név | innerId | API id | Használat |
|---|---|---|---|
| Raktáron | 9 | `c3RvY2tTdGF0dXMtc3RvY2tfc3RhdHVzX2lkPTk=` | `inStockStatus`, `onlyStock1Status` (26/26) |
| Szállítás alatt | 11 | `c3RvY2tTdGF0dXMtc3RvY2tfc3RhdHVzX2lkPTEx` | `noStockStatus` az egyszínűeknél (10/10) |
| 14-21 nap szállítási idő | 26 | `c3RvY2tTdGF0dXMtc3RvY2tfc3RhdHVzX2lkPTI2` | `noStockStatus` a prémium fóliáknál (16/16) |
| Előrendelhető | 5 | `c3RvY2tTdGF0dXMtc3RvY2tfc3RhdHVzX2lkPTU=` | |
| Elfogyott | 14 | `c3RvY2tTdGF0dXMtc3RvY2tfc3RhdHVzX2lkPTE0` | |
| 2–3 munkanap | 22 | `c3RvY2tTdGF0dXMtc3RvY2tfc3RhdHVzX2lkPTIy` | |

`onlyStock2Status`–`onlyStock4Status`: nem küldjük (élőben null).

---

## 2. Fóliatermék-konvenciók

**SKU** – csak A–Z és 0–9, `WHSH` bolt-prefix, kötőjel és ékezet nélkül:
- egyszínű: `WHSHFL1<MODELL><SZÍN>` → `WHSHFL1G2MZLD` (G2 Master zöld), `WHSHFL1G2FHR` (G2 fehér)
  - modell: `G2` | `G2M` (Master); színkód: `FHR` fehér, `CNKK` ciánkék, `MTLKK` metálkék, `LL` lila, `ZLD` zöld, **`PRS` piros (új)**, `FKT` fekete (javasolt)
- prémium/mintás: `WHSHFL<MODELL><DESIGN>` → `WHSHFLG2MSTRCTP` (G2 Master Carbon Tribal Pink)
- foglalt SKU-k (26): WHSHMTRC01–06, 08, WHSHMTRC06-másolata-2, WHSHFLG2MSTRCTP/MP/CTG/CTR, WHSHFLG2MSTRCTF-másolata-2, WHSHFLG2MSTRCTB-másolata-1, WHSHFLG2PRMX, WHSHFLG2PRMXRBF, WHSHFL1G2FHR/CN/MTLKK/LL/ZLD, WHSHFL1G2MFHR/MCNKK/MMTLKK/MLL/MZLD
- feltöltés előtt: `node tools/shoprenter/sr-api.mjs product <SKU>` → „Nincs ilyen SKU.” kell legyen

**Név** (`productDescriptions[].name`)
- egyszínű: `Kukirin G2 Master egyszínű fóliaszett - Piros` (szóköz-kötőjel-szóköz, szín nagy kezdőbetűvel – 10/10 így)
- prémium: `Kukirin G2 Master prémium fóliaszett – Carbon Tribal Pink` (szóközös nagykötőjel, design angolul)
- modellnevek: `Kukirin G2`, `Kukirin G2 Master`, `Kukirin G4`, `Kukirin G2 PRO / KUKIRIN G2 MAX`
- egyszeres szóköz, elgépelés nélkül; a slug (urlAlias) ebből generálódik és utólag NEM frissül → végleges névvel hozd létre

**Ár** (`price` = nettó, 4 tizedes, stringként; `productPrices` csak olvasható)

| Típus | nettó `price` | bruttó | akció (`productSpecials`) |
|---|---|---|---|
| egyszínű szett | `23543.3071` | 29 900 Ft | `19606.2992` = 24 900 Ft, `dateTo` 2026-09-30 (10/10) |
| prémium szett | `47165.3543` | 59 900 Ft | nincs (14/16) |

A 9-es vevőcsoport 70%-os ára automatikus, `customerGroupProductPrices` marad `[]`.
Képlet: nettó = bruttó / 1,27 (pl. 9 990 Ft → `7866.1417`).

**Kategóriák**: `334 + 138 + 144` (lásd 1. pont).

**Egyéb fix mezők** (26/26): `status 1`, `orderable 1`, `shipped 1`, `subtractStock 1`, `minimalOrderNumber 1`, `maximalOrderNumber 0`, `freeShipping 0`, `sortOrder 1`, `stock1 0`,
`weight 250.00` + súlyosztály 2, `width 8.00`, `height 8.00`, `length 35.00`, termékosztály 16, adóosztály 10, gyártó Whoosh.

**Leírás / SEO** (mindkét nyelvhez ugyanaz)
- `metaTitle`: egyszínűnél `Kukirin G2 Master egyszínű fóliaszett piros` (≤ 60 kar., ékezettel); prémiumnál = név
- `metaDescription`: `Prémium fólia <Modell> rollerhez. <Szín> egyszínű design, pontos illeszkedés, látványos megjelenés és tartós kivitel.` (prémium: `<Design> design, …`), 110–140 kar.
- `metaKeywords`, `parameters`, `customContent`, `videoCode`, `packagingUnit`: üres / nem küldjük; `measurementUnit`: `db`
- `shortDescription`: hármas span-wrapper (`font-size:18px` → `arial` → `#000000`), egyszínű szöveg: „Teljes egyszínű fóliaszett <Modell>hez, N színben. Saját sablonról vágva … 3–5 munkanap, Veszprémben” (~280 kar.)
- `description` egyszínű (B-sablon, a `sample-product.json`-ban 1:1): `<p dir="ltr">` + `<strong>` alcímek + `ul/ol` + `<em>` GYIK; szakaszok: hook „Új színt a <Modell>nek — egy hét alatt, fényezés nélkül.” → „Ez nem matrica…” → Mit fed le a szett (5 li) → Színek → Kompatibilitás → Miért fólia (4 li) → Hogyan megy (3 li) → Ár → Ápolás → GYIK. **Nincs** `data-start/data-end/data-section-id` attribútum, nbsp, üres záró `<p>`.
- `description` prémium (A-sablon): `<h3>Új megjelenés a <Modell> rollerednek</h3>` → 2 mondat → 5 ✔ sor → `<hr>` → `<h3>Szakszerű felhelyezés</h3>` → 2 bekezdés; hármas span-wrapper `font-size:16px`.
- A modellnevet MINDEN helyen cseréld (hook, bevezető, short, meta, alt, fájlnév) – a meglévőkben többször ottmaradt a forrás-termék modellje.
- A leírásban szereplő ár (`Ár: <strong>… Ft</strong>`) egyezzen a bruttó listaárral – a 10 élő egyszínűben 39.900 Ft áll, a listaár 29.900.

**Kép**
- `mainPicture` = Filemanager-relatív útvonal, előre feltöltött fájlra. Egyszínű konvenció: `Foliak/egyszinu-foliak/g2-master/kukirin-g2-master-egyszinu-folia-<szin>.png` (G2: `Foliak/egyszinu-foliak/whoosh-elektromos-roller-folia-kukirin-g2-<szin>.png`); régebbi: `product/Folia/…jpg`.
- fájlnév: csak `a-z 0-9 ( ) _ -`, ékezet nélkül, **kisbetűs** kiterjesztés; NEM spanyol beszállítói név.
- `imageAlt` = `<Modell> egyszínű fóliaszett <szín>` (kötőjel nélkül). Egy kép a konvenció; további kép: `POST productImages`.

**Szín attribútum** (`szin`, LIST, id `bGlzdEF0dHJpYnV0ZS1hdHRyaWJ1dGVfaWQ9Mg==`) – a productExtend POST nem viszi át; létrehozás után külön:
értékek élőben: Piros (value_id 4), Kék (5), Zöld (7), Fekete (8), Fehér (9), Pink (11/15), Fekete/piros (17), Világoskék (33); „Lila” nincs.
`get listAttributeValues?attributeId=bGlzdEF0dHJpYnV0ZS1hdHRyaWJ1dGVfaWQ9Mg==` → érték id → `POST productListAttributeValueRelations` (product.product:write megvan) – vagy adminban kattintva. Nem tesztelt.

---

## 3. A POST `productExtend` payload

**Kötelező mag** (hivatalos minta): `sku`, `price`, `stock1`, `manufacturer{id}`, `productDescriptions[{name, shortDescription, description, language{id}}]`, `productCategoryRelations[{category{id}}]`.

**Ajánlott** (a bolt konvenciója, mind benne van a `sample-product.json`-ban):
`status` (**"0"** próbához – elhagyva "1" = azonnal látható!), `orderable`, `subtractStock`, `shipped`, `minimalOrderNumber`, `maximalOrderNumber`, `freeShipping`, `sortOrder`,
`weight` + `weightUnit{id}`, `width/height/length` + `volumeUnit{id}`, `mainPicture`, `imageAlt`,
`taxClass{id}`, `productClass{id}`, `inStockStatus{id}`, `onlyStock1Status{id}`, `noStockStatus{id}`,
`productDescriptions[].metaTitle / metaDescription / measurementUnit`, második nyelv (id 4) azonos tartalommal,
`productSpecials[{price, dateTo}]` (csak ha akció kell – a próbatermékben benne van, törölhető).

Kapcsolt entitás mindig `{"id": "<base64>"}` alakban – a GET-ben látott `{"href": …}` alakot nem szabad visszaküldeni.

**Tilos / felesleges küldeni** (csak olvasható vagy számított): `href`, `id`, `innerId`, `dateCreated`, `dateUpdated`, `parentProduct`, `allImages`, `productPrices`, `productAttributeExtend`,
`productListAttributeValueRelations`, `numberAttributeValues`, `textAttributeValues`, `relatedProducts`, `collateralProducts`, `productAddons`, `urlAliases`, `quantity`, `multiplier`, `multiplierLock`, `availableDate`.
Üres relációk elhagyhatók: `productTags`, `productProductBadgeRelations`, `productRelatedProductRelations`, `productCollateralProductRelations`, `productAddonProductRelations`, `customerGroupProductPrices`.

**urlAlias**: a POST productExtend-ben nem küldhető; a rendszer a névből generálja (`kukirin-g2-master-egyszinu-foliaszett-piros`), ütközésnél `-<innerId>` utótagot ad. Egyedi alias csak a `urlAliases` végponton (scope `store.urlAlias:write` – **nincs**) vagy adminban.

**HTML-kódolás (nem igazolt)**: a GET entitás-kódolva adja vissza a leírást (`&lt;p&gt;`), a payloadban nyers HTML megy. Az első feltöltés után `product <SKU> --json`-nal nézd meg: ha a description `&amp;lt;p`-vel kezdődik (dupla kódolás), akkor adminban kell javítani és a payloadban kódolt HTML-t küldeni.

**Próbatermék eltérései a sablontól** (szándékos): 6. szín → a short „6 színben”, a Színek sor „Cián · Fehér · Kék · Lila · Piros · Zöld”, Ár sor 29.900 Ft. Ha a piros élesbe megy, a másik 10 egyszínű leírását is érdemes ugyanígy frissíteni (PUT).

---

## 4. Hiányzó scope-ok és következményük

Az API-kliensen csak `product.*` scope-ok vannak (product.product / category / manufacturer / stockStatus / attribute / badge / addon / priceMultiplier). A dokumentáció végpont→scope táblája szerint:

| Végpont | Kell | Van? | Következmény |
|---|---|---|---|
| `productExtend`, `products`, `productDescriptions`, `productSpecials`, `productCategoryRelations`, `productImages`, `productListAttributeValueRelations` | product.product:read/write | igen | termék létrehozás/módosítás, kép-hivatkozás, attribútum-kapcsolás mehet |
| `categoryExtend`, `manufacturers`, `stockStatuses`, `stockStatusDescriptions`, `productClasses`, `listAttributes`, `listAttributeValues` | product.category / manufacturer / stockStatus / attribute :read | igen | id-k lekérhetők |
| `files` (kép feltöltés) | store.file:write | **nincs** | **képet API-n nem lehet feltölteni** → a fájlt előbb az admin Filemanagerbe töltsd fel, a `mainPicture` csak létező útvonalra mutathat |
| `languages` | localization.language:read | nincs | 401 → nyelv-id beégetve (1 és 4) |
| `taxClasses` | taxClass.taxClass:read | nincs | 401 → adóosztály-id beégetve (10) |
| `weightClasses`, `lengthClasses` | localization.weightUnit/lengthUnit:read | nincs | osztálynév nem ellenőrizhető, id beégetve (2, 1) |
| `urlAliases` | store.urlAlias:read/write | nincs | alias csak automatikus / admin |

A script 401-es üzenete („rossz felhasználó/jelszó”) OAuth-módban hiányzó scope-ot is jelenthet. Bővítés: admin → Beállítások → API beállítások → kliens scope-jai.

---

## 5. A 26 meglévő fóliatermék anomáliái – javaslat

| # | Anomália | Érintett | Javaslat |
|---|---|---|---|
| 1 | SKU admin-másolás utótaggal, ékezettel | 2763 `WHSHMTRC06-másolata-2`, 2774 `WHSHFLG2MSTRCTF-másolata-2`, 2776 `WHSHFLG2MSTRCTB-másolata-1`; WHSHMTRC07 hiányzik; 2770 `WHSHFLG2PRMX` színkód nélkül | átnevezni: 2763→`WHSHMTRC07` (vagy `WHSHFLG4TRF`), 2774→`WHSHFLG2MSTRCTF`, 2776→`WHSHFLG2MSTRCTB`, 2770→`WHSHFLG2PRMXMQR` (PUT `{"sku":…}`) |
| 2 | Hiányzó 138/144 kategória | csak 334: 2758, 2763, 2769, 2770, 2777; csak 144+334: 2753 | PUT `productCategoryRelations` a teljes hármassal, vagy `POST productCategoryRelations` a hiányzókra |
| 3 | Negatív készlet (subtractStock=1, 0-ról rendeltek) | 2734 −1, 2755 −3, 2760 −2, 2763 −1, 2767 −1, 2771 −2, 2774 −3, 2776 −1 | `stock1` nullázása PUT-tal, vagy `subtractStock: "0"` a rendelésre készülő fóliáknál |
| 4 | Spanyol beszállítói képfájlnév + ULID a gyökér `Foliak/` mappában; `.JPG` nagybetűs kiterjesztés; rossz fájl | 2766, 2771, 2776, 2777 (vinilos-…); 2767, 2769, 2770, 2774 (.JPG); 2769 CT Green képe `…marmol-green.JPG` | Filemanagerben átnevezni `Foliak/premium-foliak/<modell>/kukirin-<modell>-premium-folia-<design>.jpg` mintára, majd PUT `mainPicture` |
| 5 | Második nyelv (id 4) mind a 26-nál ugyanaz a hibás másolat („Kukirin G2 prémium matricaszett – Carbon Tribal Pink”, „MyUrbanScoot matrica”) | 26/26 | PUT `productDescriptions` mindkét nyelvvel, azonos magyar tartalommal |
| 6 | Meta ≠ név (másolásból): más design vagy „Piros” a metában | 2747, 2770, 2777 (metaTitle „Piros”); 2771, 2774, 2776 (meta „Carbon Tribal Pink”); 2797 metaTitle „zold” | metaTitle = név, metaDescription a név design/színével |
| 7 | Rossz modell a leírásban | 2766, 2767, 2771, 2774, 2776 (G2 Master, de h3 „Kukirin G4”); 2770, 2777 (Pro/Max, de „Kukirin G2”) | h3 + bevezető modellnév csere |
| 8 | Ár a szövegben ≠ listaár | 10 egyszínű: „Ár: 39.900 Ft”, listaár 29.900 (akciós 24.900) | 29.900-ra javítani vagy az Ár sort törölni |
| 9 | Elgépelés, dupla/hiányzó szóköz, nbsp, ChatGPT `data-*` attribútumok | „Holograpich” 2753, „Flour” 2763, „Raceing” 2771, „Carbon Tribal  Pink/Green/Fluor/Blue” 2766/2769/2774/2776, „ -Ciánkék” 2781, „ -Metálkék” 2782, „fóliaaszetteket” 2758, „MAx” 2770/2777 | név/meta/alt egységesítése; a leírás HTML-jét a `data-*` és nbsp nélküli sablonnal cserélni |
| 10 | imageAlt hibás vagy másik termékről maradt | 2779 (fehér, alt „prémium matrica Racing”), 2774 (Fluor, alt „Pink”), 2771 („Raceing ”) | alt = név |
| 11 | URL-alias `-innerId` utótaggal vagy rossz designnal | 2771 (…-fluor-2771), 2774, 2776, 2777 (…-mcqueen-red-2777), 2747 (…-piros) | csak adminban / `store.urlAlias:write` scope-pal javítható – vagy hagyni (301 nincs) |
| 12 | Lejárt akció a terméken | 2770, 2777 `dateTo` 2026-07-23 | `productSpecials` törlése (DELETE `productSpecials/<id>`) |
| 13 | Gyártó vegyes ugyanabban a sorozatban | Kukirin: 2734, 2747, 2750, 2758, 2760, 2770, 2777, 2779; a többi Whoosh | egységesen Whoosh (27) |
| 14 | `szin` attribútum üres | 2783, 2795 (Lila – nincs ilyen érték), 2784 (Zöld) | „Lila” érték felvétele (`POST listAttributeValues`), majd kapcsolás |
| 15 | `noStockStatus` kétféle: prémium „14-21 nap szállítási idő” (26), egyszínű „Szállítás alatt” (11) | prémium 16/16 = 26, egyszínű 10/10 = 11 | a valós átfutás szerint egységesíteni (egyszínű: helyben 3–5 munkanap → pl. `2-3 munkanap` (22) vagy saját státusz) |
| 16 | `cost` 0, `gtin` üres | 26/26 | beszerzési ár felvitele, ha kell árrés-riport |

---

## 6. Parancsok

Hitelesítés: `SHOPRENTER_CLIENT_ID` + `SHOPRENTER_CLIENT_SECRET` (OAuth, api2) vagy `SHOPRENTER_API_USER` + `SHOPRENTER_API_PASSWORD` (régi Basic). Bolt: `SHOPRENTER_SHOP` (alap: `elektromosroller`). A script a titkokat soha nem írja ki. Rate limit 3 kérés/mp (a script 350 ms-ot vár).

```bash
cd /home/user/scoover-prototipus

# 0. hitelesítés próbája
node tools/shoprenter/sr-api.mjs check

# 1. dry-run – csak kiírja a payloadot, NEM hív API-t, hitelesítő adat nélkül is fut
node tools/shoprenter/sr-api.mjs create tools/shoprenter/sample-product.json --dry-run

# 2. SKU-ütközés ellenőrzése ("Nincs ilyen SKU." az elvárt)
node tools/shoprenter/sr-api.mjs product WHSHFL1G2MPRS

# 3. kép feltöltése ELŐBB az admin Filemanagerbe:
#    Foliak/egyszinu-foliak/g2-master/kukirin-g2-master-egyszinu-folia-piros.png

# 4. létrehozás (status "0" → nem látszik a boltban)
node tools/shoprenter/sr-api.mjs create tools/shoprenter/sample-product.json
node tools/shoprenter/sr-api.mjs create tools/shoprenter/sample-product.json --json   # teljes válasz

# 5. visszaellenőrzés: leírás egyszeres kódolás (&lt;p, nem &amp;lt;p), 3 kategória, urlAlias utótag nélkül, kép feloldódik
node tools/shoprenter/sr-api.mjs product WHSHFL1G2MPRS --json

# 6. módosítás (PUT productExtend/<id>) – csak a változó mezőket tartalmazó JSON-nal
#    az <id> a create válaszból: id=cHJvZHVjdC1wcm9kdWN0X2lkPTxxxx=
echo '{"status":"1"}' > /tmp/aktival.json
node tools/shoprenter/sr-api.mjs update cHJvZHVjdC1wcm9kdWN0X2lkPTxxxx= /tmp/aktival.json

# egyéb GET-ek (id-k, ellenőrzés)
node tools/shoprenter/sr-api.mjs categories
node tools/shoprenter/sr-api.mjs get 'manufacturers?full=1&limit=200'
node tools/shoprenter/sr-api.mjs get 'stockStatusDescriptions?full=1&limit=200'
node tools/shoprenter/sr-api.mjs get 'listAttributeValues?full=1&attributeId=bGlzdEF0dHJpYnV0ZS1hdHRyaWJ1dGVfaWQ9Mg=='
```

Új fólia másik színben: másold a `sample-product.json`-t, és cseréld: `sku` (színkód), `mainPicture` (fájlnév), `imageAlt`, mindkét nyelvben `name`, `metaTitle`, `metaDescription`, és a Színek sort a leírásban. Prémium szetthez: `price` `47165.3543`, `noStockStatus` 26, `productSpecials` `[]`, A-sablon leírás.

Ismert script-korlátok: a `képek=` sor mindig 0 (a válaszban `allImages` van, nem `productImages`); nincs automatikus SKU-előellenőrzés és POST utáni GET – ezeket a fenti 2. és 5. lépés pótolja.
