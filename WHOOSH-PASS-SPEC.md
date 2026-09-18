# WHOOSH PASS — Specifikáció Claude Code számára

Roller-központú digitális szervizkönyv + műhelyirányítás + hűségprogram.
WordPress-plugin az elektromos-roller.net WooCommerce oldalhoz (Forpsi tárhely).
Nyelv: magyar UI, magyar kód-kommentek nem kötelezők. Mobil-first minden nézet.

---

## 0. Alapelvek (ezek nem tárgyalhatók)

1. **A roller a kulcs, nem az ügyfél.** Minden szervizesemény egy rollerhez kötődik. Az ügyfél a rollerhez kapcsolódik, nem fordítva.
2. **Nincs rejtett réteg.** Minden bejegyzés kapcsolható munkalaphoz/számlához. A rendszer bizonyíték, nem titok.
3. **Minimális nyilvános felület.** A QR beolvasása bárkinek csak a 3. fejezet "Nyilvános" mezőit mutatja. Soha nevet, árat, telefonszámot.
4. **Szerepkör-alapú láthatóság.** Szerelő nem lát ügyféladatot és beszerzési árat. Kilépő munkatárs nem vihet ügyféllistát.
5. **Egy rendszer.** Ugyanaz a WordPress, mint a webshop. Hűségpont = WooCommerce-kupon. Nincs negyedik szoftver.
6. **Nem programozó üzemelteti.** Minden admin-felület kattintható, magyar, magyarázó szöveggel.

---

## 1. Technikai keret

- WordPress-plugin: `whoosh-pass/` — saját tábla-struktúra (ne post_meta-ra építs, teljesítmény miatt), `dbDelta` migrációval.
- WooCommerce függőség: ügyfél = WC customer (user). Kupon-generálás WC Coupon API-val.
- Frontend: sima PHP-template + minimális vanilla JS. **Nincs React, nincs build-lépés.** A tárhelyen nincs Node.
- QR-generálás szerveroldalon (pl. `chillerlan/php-qrcode` composer-csomag, vagy beépített SVG-generátor).
- Nyilvános útvonal: `elektromos-roller.net/r/{KOD}` — rewrite rule.
- Belső útvonalak: `/pult/`, `/allomas/{id}/`, `/roller/{KOD}/szerk/` — csak bejelentkezve, szerepkör szerint.
- Design: a meglévő Whoosh-paletta (háttér `#0B080D`, panel `#130D16`, zöld `#35D035`, szöveg `#EDE8F0`, muted `#9A8FA3`, piros `#FF3B2F` csak veszélyre, lila `#D07EC0`, sárga `#FFC24D`). Saira Condensed címek, Inter törzs, Space Mono adat.

---

## 2. Adatmodell

### 2.1 `wp_wpass_roller`
| mező | típus | megjegyzés |
|---|---|---|
| id | bigint PK | |
| kod | char(6) UNIQUE | véletlen, nagybetű+szám, összetéveszthető karakterek nélkül (0/O, 1/I/L kizárva). Pl. K7M2X9 |
| marka | varchar | Kukirin, Ninebot, Whoosh, … |
| tipus | varchar | G2 Master, G30, … |
| gyari_szam | varchar NULL | ha van |
| szin | varchar NULL | |
| motor_w | int NULL | |
| akku_feszultseg | int NULL | 36/48/52/60/72 |
| tulajdonos_user_id | bigint NULL FK wp_users | aktuális tulajdonos |
| statusz | enum | aktiv / lopott / selejt / atadas_folyamatban |
| whoosh_igazolt | bool | igaz, ha volt legalább 1 lezárt Whoosh-munkalap |
| letrehozva, modositva | datetime | |

### 2.2 `wp_wpass_esemeny` (szervizkönyv-bejegyzés)
| mező | típus | megjegyzés |
|---|---|---|
| id | bigint PK | |
| roller_id | FK | |
| tipus | enum | szerviz / akku_epites / tuning / gumi / fek / index / folia / atvizsgalas / eladas / tulajdonosvaltas / megjegyzes |
| datum | date | |
| leiras_publikus | text | amit a tulajdonos lát (pl. "Első fék csere, hidraulikus XOD") |
| leiras_technikai | text | amit a szerelő lát (pl. "XOD 2 dug., 160mm tárcsa, légtelenítve, 4 bar") |
| alkatreszek | json | [{nev, db, ar_brutto}] — az árat a tulajdonos a **saját** rollerén és a Pult látja, a szerelő soha (3. fejezet) |
| munkadij_brutto | int NULL | |
| elszamolas | enum | fizetett / ingyenes / barter / garancialis / belso — alapértelmezés `fizetett` |
| ceg | enum | CS / SP — melyik cég számlázta |
| szamla_azonosito | varchar NULL | |
| munkalap_id | FK NULL | ha munkalapból jött |
| rogzitette_user_id | FK | |
| telephely_id | FK | Veszprém / Kapuvár / … |
| kovetkezo_esedekes | date NULL | pl. akku-kapacitásteszt 12 hónap múlva |
| fotok | json | media ID-k |
| csatolmanyok | json | pl. VESC-konfig XML, akku-adatlap PDF |

### 2.3 `wp_wpass_munkalap` (aktív munka a műhelyben)
| mező | típus | megjegyzés |
|---|---|---|
| id | bigint PK | |
| roller_id | FK | |
| ugyfel_user_id | FK | |
| felvette_user_id | FK | pult |
| felvetel_ido | datetime | |
| hiba_leiras | text | ügyfél elmondása |
| felvetel_fotok | json | állapotfotók felvételkor — vitavédelem |
| sav | enum | gyors / muhely |
| allomas_id | FK NULL | hova van kiosztva |
| szerelo_id | FK NULL → 2.8 | kinek. Csak aktív, fiókkal rendelkező személy választható |
| statusz | enum | felvett / kiosztva / folyamatban / alkatreszre_var / arajanlatra_var / kesz / atadva / lezart |
| prioritas | tinyint | 1-3 |
| eloleg_brutto | int | "ami nincs foglalózva, az nincs megrendelve" |
| becsult_munkadij | int NULL | |
| elszamolas | enum | fizetett / ingyenes / barter / garancialis / belso — átadáskor átöröklődik az eseményre |
| szerelo_jegyzet | text | menet közben |
| kesz_fotok | json | |
| kesz_ido, atadva_ido | datetime NULL | |
| tuning_nyilatkozat | bool | VESC/tuning esetén kötelező pipa + PDF csatolva |

### 2.4 `wp_wpass_allomas`
id, nev (A/B/C…), telephely_id, aktiv. Kiosztás **személyhez** kötött (szerelo_id → 2.8), az állomás csak a fizikai hely — a fiúk cserélhetik egymást.

### 2.5 `wp_wpass_telephely`
id, nev, cim, tipus (sajat / partner), kapcsolattarto_user_id.

### 2.6 `wp_wpass_pont` (hűségpont-napló)
id, user_id, roller_id NULL, esemeny_id NULL, pont (+/−), indok, datum, kupon_kod NULL.

### 2.7 `wp_wpass_naplo` (audit)
id, user_id, muvelet (megtekintes / szerkesztes / export / torles / kiosztas), cel_tipus, cel_id, ip, datetime. **Minden belső megtekintés naplózva.**

### 2.8 `wp_wpass_szemely` (szerelők, a kilépettek is)
| mező | típus | megjegyzés |
|---|---|---|
| id | bigint PK | |
| nev | varchar | megjelenítendő név, pl. Adrián |
| nev_kulcs | varchar UNIQUE | kisbetűs, ékezet nélküli kulcs a párosításhoz: `adrian` |
| aliasok | json | írásváltozatok az importhoz: `["adrián","adrian","Adrián"]` |
| user_id | FK NULL | WP-fiók, **ha van**. Kilépett munkatársnak nincs, a rekordja mégis megmarad |
| statusz | enum | aktiv / inaktiv |
| belepes, kilepes | date NULL | időszakos statisztikához |
| telephely_id | FK NULL | |

Ez a tábla választja szét a **személyt** a **belépési fióktól**. Kilépett munkatárs fiókja letiltható, a munkája mégis kereshető és összesíthető marad. Munkalap csak olyan személyhez osztható ki, akinek `statusz = aktiv` és van `user_id`-je.

### 2.9 `wp_wpass_esemeny_szerelo` (ki dolgozott rajta)
| mező | típus | megjegyzés |
|---|---|---|
| esemeny_id | FK | |
| szemely_id | FK → 2.8 | |
| szerep | enum | fo / segito / ellenorizte |
| munkaora | decimal NULL | ha ismert |

Egy munkán **több szerelő is dolgozhat**, az örökölt táblázatban ez bevett (`Adrián / Xavér`, `Béla / Péter / Xavér`), és külön szerepel az ellenőrző neve is. Ezért kapcsolótábla, nem egyetlen mező: csak így összesíthető szerelőnként és időszakonként.

### 2.10 Tulajdonosváltás
`wp_wpass_atadas`: roller_id, regi_user_id, uj_telefon, token, lejar (72 óra), statusz. Flow: régi tulaj indítja → SMS/email az újnak → új tulaj regisztrál/belép → megerősít → roller átkerül, régi tulaj csak "eladás" eseményt lát a saját listájában, a részletes történetet többé nem.

---

## 3. Szerepkörök és láthatóság

| adat | Nyilvános (QR) | Tulajdonos | Szerelő | Partner | Pult/Admin |
|---|---|---|---|---|---|
| márka, típus | ✓ | ✓ | ✓ | ✓ | ✓ |
| Whoosh-igazolt jelző | ✓ | ✓ | ✓ | ✓ | ✓ |
| utolsó szerviz **hónapja** | ✓ | | | | |
| utolsó szerviz pontos dátuma | | ✓ | ✓ | ✓ | ✓ |
| garancia él/nem | ✓ | ✓ | ✓ | ✓ | ✓ |
| lopott jelző | ✓ | ✓ | ✓ | ✓ | ✓ |
| leiras_publikus | | ✓ | ✓ | ✓ | ✓ |
| leiras_technikai | | | ✓ | ✓ | ✓ |
| alkatrész neve | | ✓ | ✓ | ✓ | ✓ |
| alkatrész ára | | ✓ | | | ✓ |
| munkadíj | | ✓ | | ✓ (csak saját) | ✓ |
| beszerzési ár, árrés | | | | | ✓ |
| tulajdonos neve, telefonja | | ✓ (saját) | | | ✓ |
| ügyféllista | | | | | ✓ |
| más állomás sora | | | | | ✓ |
| más telephely rollerei | | | | csak beolvasva | ✓ |
| pontok | | ✓ | | | ✓ |
| riportok | | | | | ✓ |

**Ár-szabály a szerelőre:** a szerelő **semmilyen pénzügyi adatot nem lát** — sem beszerzési árat, sem alkatrész-eladási árat, sem munkadíjat, a sajátját sem. A végpontok soha nem küldenek árat `wpass_szerelo` szerepkörnek, nem elég a felületen elrejteni.

Ez később átállítható legyen anélkül, hogy kódot kelljen írni: `wpass_szerelo_lat_munkadijat` admin-kapcsoló, alapértelmezés **kikapcsolva**. Bekapcsolva a szerelő a saját munkadíját látja, alkatrész- és beszerzési árat akkor sem. A kapcsoló állását egyetlen helyen kell kiértékelni (egy `wpass_lathato_mezok( $user, $kontextus )` szűrő), hogy ne kelljen minden végponton külön feltétel.

**Partner-szabály:** partner csak azt látja, amit ő vett fel — KIVÉVE, ha egy rollert fizikailag beolvas nála a pultnál: akkor annak a rollernek a technikai történetét látja (szerelő-szint), de ügyféladatot nem. Ez a hálózat lényege.

Szerepkörök WP-ben: `wpass_pult`, `wpass_szerelo`, `wpass_partner`, admin. Kétlépcsős belépés (TOTP) kötelező `wpass_pult` és admin szinten. Tabletek külön `wpass_szerelo` fiókkal, tabletenként egy, hogy egyenként kitiltható legyen.

---

## 4. Nézetek

### 4.1 Nyilvános — `/r/{KOD}`
Sötét Whoosh-design. Nagy "WHOOSH-IGAZOLT" pecsét (ha igaz). Márka/típus. "Utoljára a Whoosh-nál: 2026. augusztus". Garancia: "Él 2027.03-ig" / "Nincs aktív". Ha lopott: piros sáv, "EZ A ROLLER LOPOTT — hívd: +36 70 852 0208". Alul két gomb: **"Ez az én rollerem"** (→ tulajdonosi belépés) és **"Időpontot kérek"** (→ MiniCRM űrlap). Semmi más.

### 4.2 Tulajdonos — `/sajat/`
Belépés: kód + rekordhoz kötött telefonszám → SMS-kód (vagy WC-fiók). Lista a rollereiről. Rollerenként idővonal (esemeny-ek publikus leírással, alkatrész + ár, fotók, csatolmányok letöltése). Pontegyenleg + "Beváltom kuponra" gomb. "Következő esedékes" figyelmeztetés. "Átadom a rollert" gomb. "Adataim exportja" / "Törlést kérek" (GDPR).

### 4.3 Pult — `/pult/`
- **Beolvasás:** kamerás QR-olvasó a böngészőben (BarcodeDetector API, fallback jsQR) VAGY kód beírása. Ismeretlen kód → "Új roller felvétele" (2 perc: márka, típus, tulaj telefon → keres WC-ben / új).
- **Roller-kártya:** teljes történet, tulaj, pontok, aktív munkalap.
- **Új munkalap:** hiba, fotó (kamera), sáv, prioritás, előleg, szerelő/állomás kiosztás, becsült munkadíj. Tuning esetén nyilatkozat-pipa kötelező.
- **Műhely-tábla:** oszlopok = szerelők/állomások, kártyák = munkalapok, drag-and-drop átkiosztás. Színkód státusz szerint. Számláló: hány roller vár, átlag várakozás.
- **Riportok:** napi lezárt munkák, sávonkénti átfutás, pontkiadás, Whoosh-igazolt rollerek száma.
- **Szerelői kimutatás:** szabadon szűrhető **személyre** (a kilépettekre is) és **időszakra** (naptól napig, vagy gyorsválasztó: idei év, elmúlt 12 hónap, egy adott év). Bontható telephelyre, munkatípusra és elszámolásra. Oszlopai: munkák száma, összes munkaóra, átlagos átfutási idő, visszahozott munkák aránya (ugyanazzal a hibával), ellenőrzésen elsőre megfelelt aránya. CSV-export, naplózva. Ez a nézet a kilépett munkatársak évekre visszamenő munkáját is kiadja, mert a személy rekordja megmarad (2.8).
- **Ügyfelek:** keresés, lista, export CSV (naplózva).

### 4.4 Állomás — `/allomas/` (tablet, fali)
Nagy betűk, érintésre. Csak a bejelentkezett szerelő sora: **Következő / Folyamatban / Alkatrészre vár**. Kártyára koppint → technikai történet + aktuális feladat. Gombok: **Elkezdtem / Alkatrész kell / Árajánlat kell / Kész**. "Kész"-nél: mit csinált (rövid), fotó, alkatrész-pipa a listából. Nem lát árat, ügyfélnevet, más sorát. 15 perc inaktivitás után képernyőzár, PIN-nel vissza.

### 4.5 Partner — `/pult/` szűkített
Ugyanaz, mint a Pult, de csak a saját telephelyre és a 3. fejezet Partner-oszlopa szerint.

---

## 5. Munkafolyamat

1. Pult beolvas / felvesz → munkalap `felvett`
2. Kioszt → `kiosztva` → megjelenik a szerelő tabletjén
3. Szerelő "Elkezdtem" → `folyamatban`
4. Elakadás → `alkatreszre_var` / `arajanlatra_var` → Pultnál értesítés (böngésző-push + a tábla színe)
5. "Kész" → `kesz` → Pultnál értesítés → ügyfél SMS/email: "Kész a rollered, jöhetsz"
6. Átadás → `atadva` → **automatikusan esemény jön létre a szervizkönyvben** (leiras_publikus a szerelő rövid szövegéből, leiras_technikai a jegyzetből, alkatrészek átmásolva) + pontjóváírás
7. Számla rögzítése → `lezart`

Sáv-logika: `gyors` munkalap alapból 1-es prioritás, max 4 óra célátfutás; `muhely` alapból 2-es, árajánlat után indul.

---

## 6. Hűségprogram

- 1 pont / 100 Ft bruttó költés (szerviz + webshop egyaránt, WC order hook).
- 100 pont → 1.000 Ft WC-kupon, egyszer használatos, 6 hónap lejárat, min. 5.000 Ft kosárérték.
- Pont csak `fizetett` elszámolású tétel után jár (13.4).
- Matrica felragasztása régi ügyfélnek: +2.000 pont egyszeri (esemeny tipus=megjegyzes, indok="Pass aktiválás").
- Ajánlói kód: `/r/{KOD}?aj={ajanlo_kod}` → sikeres első munkalap után mindkettő +1.000 pont.
- Évfordulós szabályok táblázatban admin által szerkeszthetők: {év, jutalom_tipus, érték, szöveg}. Alapból: 1 év → ingyen átvizsgálás kupon; 3 év → fóliázás 50%; 5 év → akkuvizsgálat + "Whoosh Veterán" jelvény a nyilvános oldalon.
- Emlékeztető-automatika (WP-Cron, naponta): `kovetkezo_esedekes` 14 nappal előtte → email/SMS a tulajnak "Ideje az akku-kapacitástesztnek" + időpontfoglaló link.

---

## 7. QR és matrica

- Kód: 6 karakter, ábécé: `ABCDEFGHJKMNPQRSTUVWXYZ23456789`. Ütközés-ellenőrzés generáláskor.
- QR tartalma: kizárólag `https://elektromos-roller.net/r/{KOD}`. Semmi más adat.
- Matrica-export: Pultról "Címke nyomtatása" → 24 mm-es Brother TZe szalagra méretezett PNG (QR + Whoosh-logó + kód olvashatóan + "elektromos-roller.net"). Több méret: 24×60 mm (kormányoszlop), 18×45 mm (dekni alá).
- Kötegelt generálás régi ügyfeleknek: CSV import (MiniCRM-export: név, telefon, email, roller) → rollerek + WC-userek létrehozása → kódok → email-kampány export Brevo-nak (kód, link, wallet-pass link).
- Wallet-pass (Google/Apple) — **2. fázis**, nem MVP.

---

## 8. Biztonság

- Kódok kitalálhatatlanok (30^6 ≈ 729 M kombináció), nincs sorszám.
- `/r/` végpont rate-limit: 30 kérés/perc/IP, utána captcha.
- Belső végpontok: nonce + capability check minden kérésnél, semmi nem elérhető bejelentkezés nélkül.
- TOTP kétlépcsős a Pult/admin fiókokra (WP-plugin: Two Factor).
- Tablet-fiókok: `wpass_szerelo`, tabletenként egyedi, admin egy kattintással letiltja.
- Audit-napló minden belső megtekintésre és exportra; admin-riport "ki hány rekordot nézett meg ma".
- Napi DB-mentés a Forpsi tárhelyen kívülre (pl. Google Drive-ra WP-plugin vagy cron + rclone) — **kötelező, nem opció**.
- GDPR: tulajdonosi export (JSON+PDF), törlés-kérés (roller anonimizálva marad, tulaj leválasztva), adatkezelési tájékoztató link a nyilvános oldalon.
- Ügyféladat soha nem kerül a QR-be, a nyilvános oldalra, a tablet-nézetbe, vagy exportba szerelő-szinten.

---

## 9. Integrációk

- **WooCommerce:** ügyfél = WC user; pontjóváírás WC order completed hookra; kupon-generálás WC API-val.
- **MiniCRM:** a nyilvános oldal "Időpontot kérek" gombja a meglévő MiniCRM-űrlapra mutat, előtöltve a roller kódjával (URL-paraméter). Nincs kétirányú szinkron az MVP-ben.
- **Brevo:** email-kampány a régi ügyfeleknek CSV-exportból. Tranzakciós email (kész a roller, emlékeztető) WP-mailből SMTP-n keresztül.
- **SMS:** választható szolgáltató (pl. seeme.hu API), admin-beállítás; ha nincs beállítva, csak email.

---

## 10. Fázisok

**MVP (1. hét):** 2.1–2.3, 2.7–2.9 táblák · nyilvános oldal · Pult beolvasás + roller-kártya + munkalap + műhely-tábla · Állomás-nézet tablet · esemény-automatika átadáskor · címke-PNG · szerepkörök + TOTP · napi mentés.

**2. fázis:** tulajdonosi nézet + SMS-belépés · pontok + kuponok · emlékeztetők · tulajdonosváltás · CSV-import régi ügyfelekhez · Brevo-export.

**3. fázis:** partner-telephelyek · Wallet-pass · riportok bővítése · "Whoosh-igazolt használt" hirdető-lista a nyilvános oldalon.

---

## 11. Induló adatok (a nyitó kérdések megválaszolva)

1. **Tárhely.** Forpsi Advanced, PHP 8.5 / 8.4 / 8.3, `memory_limit` 1024 MB, `max_execution_time` 900 s, MySQL 8.0 InnoDB, SSH és Softaculous. Composert a Forpsi nem hirdet, SSH-n a `composer.phar` futtatható, de a QR-könyvtár **vendorolva** legyen, hogy ne függjön tárhely-oldali csomagkezeléstől.
2. **SMS.** A meglévő MiniCRM tud SMS-t küldeni, MVP-ben ez a kiindulás. Az SMS-küldés legyen egy cserélhető illesztő (`WPass_Sms_Interface`), hogy olcsóbb szolgáltatóra váltás egyetlen osztály cseréje legyen, ne kódátírás.
3. **Felhasználók induláskor.**
   - Pult: Szilárd (`wpass_pult`).
   - Szerelők: Adrián, Milán, Ádám, Erik (`wpass_szerelo`, tabletenként külön fiók).
   - Telephely: Veszprém (saját), Kapuvár (saját). Partnerek később.
   - Korábbi munkatársak: Alex, Xavér, Péter, Tamás, Gábor, Béla, Márk, Robi, Kristóf, Soma. Mindegyikük **kap egy személy-rekordot** (2.8) `statusz = inaktiv` értékkel, de **belépési fiókot nem**. Így a munkájuk névre és időszakra szűrhető marad, belépni viszont nem tudnak.
   - Alex esetleg visszatér: az ő rekordja egyetlen kapcsolóval aktiválható, és akkor kap fiókot. A többieknél ez nem várható, de a mechanizmus ugyanaz.
4. **Örökölt szerviztörténet.** Importáljuk, a forrás és a szabályok a 13. fejezetben.

---

## 12. Elfogadási kritériumok (MVP)

- Egy ismeretlen QR beolvasása bárkinek csak a 4.1 mezőket mutatja, névtelen HTTP-kliensből is.
- Szerelő-fiókkal bejelentkezve egyetlen végponton sem kérhető le ügyfélnév, telefonszám, beszerzési ár — automatizált teszt.
- Pult → kiosztás → tablet frissül 5 mp-en belül (polling elég, nem kell websocket).
- "Kész" → átadás → szervizkönyv-esemény létrejön a munkalap adataival, kézi másolás nélkül.
- Címke-PNG Brother P-touch Editorba importálva olvasható QR-t ad 24 mm-es szalagon.
- Napi mentés lefut és külső helyre kerül; visszaállítás dokumentálva.

---

## 13. Örökölt adat: a szerviz-Google-Sheet importja

Forrás: a meglévő Google-táblázat, 19 munkalap. Kettő érdekes, a többit nem importáljuk.

### 13.1 Amit a két lap tartalmaz

| lap | sorok | mit ad |
|---|---|---|
| Aktuális javítások | 586 érdemi | a futó és friss munkák, ügyfélnévvel és telefonnal, 2024-2025 |
| Összes munkák | 3732 munkasor | a teljes archívum, JAV100-tól JAV4585-ig, 2020-2025 |

Közös kulcs a **JAV-azonosító**. Egyedi azonosító 3643 darab van, tehát mintegy 90 duplikált sorral számolni kell.

### 13.2 Amire fel kell készülni (a tábla valós állapota)

- **Az oszlopkiosztás korszakonként változik.** Az "Összes munkák" lapon a JAV-azonosító hol az 1., hol a 3., 4., 5. vagy 6. oszlopban áll, összesen tizenhárom váltással. Ezért az importáló **soronként keresse meg** a `JAV\d+` mintát, és onnan olvasson relatív pozícióval; fix oszlopindexre épített import biztosan hibás adatot ad.
- **Nincs gyári szám sehol.** A roller azonosítása ügyfélnév és eszközmegnevezés együttese alapján megy, ami nem egyértelmű. Ütközés esetén az importáló ne vonjon össze két rollert, hanem hozzon létre külön rekordot, és jelölje `import_bizonytalan` jelzővel kézi átnézésre.
- **Az eszköznév szabad szöveg** ("Xiaomi Pro 2", "Xiaomi pro 2", "Kugoo G2 Pro", "Whoosh-Gecko 32Ah"). Márka és típus szétválasztása szótárral, a maradék a `tipus` mezőbe kerül nyersen.
- **Dátumok Excel-sorszámként** jönnek (44509 = 2021-11-08), néhol szöveges dátum keveredik közéjük.
- **Pénzügyi adat gyakorlatilag nincs**: a teljes munkafüzetben hét darab "Ft" alakú cella van. Az importált események `munkadij_brutto` mezője ezért üresen marad, az `elszamolas` pedig `belso` lesz, nem `fizetett` — így az örökölt tételek nem torzítják a riportokat és nem osztanak hűségpontot.
- **A szerelőnevek írásmódja ingadozik**, ezért az importnak alias-szótárral kell dolgoznia, nem szó szerinti egyezéssel. A két lapon ténylegesen előforduló változatok:

  | személy | változatok a táblázatban |
  |---|---|
  | Adrián | `Adrian`, `Adrián` |
  | Xavér | `Xavér`, `xavér`, `XAVÉR`, `xaVÉR`, `Xaver`, `xaver` |
  | Szilárd | `Szilárd`, `SZilárd`, `sZILÁRD` |
  | Soma | `Soma`, `soma`, `SOma` |
  | Kristóf | `Kristóf`, `kristóf`, `KRistóf` |
  | Milán | `Milán`, `milán` |
  | Péter | `Péter`, `péter` |
  | Gábor | `Gábor`, `gábor` |
  | további, egy alakban | Ádám, Alex, Márk, Béla, Dávid, Erik, Robi, Tamás, Zsolt |

  A párosítás kisbetűs, ékezet nélküli kulcson (`nev_kulcs`) történjen. **Vigyázat:** ugyanezek a keresztnevek ügyfélnévként is előfordulnak (például `Mazur Gábor`), ezért csak az adott korszak szerelő-oszlopából szabad nevet olvasni, nem a sor bármelyik cellájából.
- **Telefonszám 82%-ban van meg**, formátuma vegyes. Normalizálás `+36XXXXXXXXX` alakra, ami nem értelmezhető, az marad üresen.

### 13.3 Az import menete

1. Feltöltés: a Pult admin-felületén xlsx vagy CSV feltöltés, nem parancssor.
2. **Száraz futás kötelező elsőre**: az importáló kiír egy előnézeti táblát (hány roller, hány esemény, hány bizonytalan, hány duplikátum), és semmit nem ír az adatbázisba.
3. Soronkénti áttekintő lista, ahol minden sor **kihagyható** és az `elszamolas` értéke soronként állítható.
4. Éles futás után minden importált rekord `import_forras` mezőt kap a JAV-azonosítóval, hogy a művelet visszafordítható legyen.
5. Az import nem hoz létre WooCommerce-felhasználót automatikusan. Ügyfél csak akkor jön létre, amikor a roller először kap QR-matricát a pultnál.
6. **Szerelők betöltése.** Az importáló minden felismert nevet a személy-táblába (2.8) tesz, `inaktiv` státusszal, a talált írásváltozatokkal az `aliasok` mezőben, és a munkákat a kapcsolótáblán (2.9) köti hozzájuk. A száraz futás előnézete listázza a felismert neveket és találatszámukat, hogy összevonhatók vagy elvethetők legyenek, mielőtt bármi az adatbázisba kerül. Így a kilépett munkatársak munkája évekre visszamenőleg szűrhető és összesíthető marad.

### 13.4 Ingyenes, baráti és barter munkák

Ezek valódi szervizmunkák, a roller szervizkönyvébe valók, de nem bevétel. Kezelésük az `elszamolas` mezővel történik:

| érték | mikor | riportban | hűségpont |
|---|---|---|---|
| fizetett | normál munka | benne | jár |
| ingyenes | baráti, családi szívesség | külön soron | nem jár |
| barter | csereszolgáltatás, például akku grafikáért | külön soron | nem jár |
| garancialis | garanciában végzett javítás | külön soron | nem jár |
| belso | saját roller, bemutató, importált előzmény | nincs benne | nem jár |

A Pult riportjai alapból csak a `fizetett` tételeket összesítik, a többi külön sorban jelenik meg, hogy látszódjon mennyi munka megy el rájuk.

**Törlés.** A `wpass_pult` és admin szerepkör törölhet eseményt és teljes rollert, két lépésben megerősítve. A törlés naplózódik (`wp_wpass_naplo`, művelet `torles`), és a napló maga nem törölhető a felületről. Ez összefér a 0.2 alapelvvel: a rendszer bizonyíték marad, de a valóban nem odavaló tétel eltávolítható.
