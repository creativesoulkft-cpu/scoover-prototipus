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
| alkatreszek | json | [{nev, db, ar_brutto}] — ár csak Pult-szerepkörnek |
| munkadij_brutto | int NULL | |
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
| szerelo_user_id | FK NULL | kinek |
| statusz | enum | felvett / kiosztva / folyamatban / alkatreszre_var / arajanlatra_var / kesz / atadva / lezart |
| prioritas | tinyint | 1-3 |
| eloleg_brutto | int | "ami nincs foglalózva, az nincs megrendelve" |
| becsult_munkadij | int NULL | |
| szerelo_jegyzet | text | menet közben |
| kesz_fotok | json | |
| kesz_ido, atadva_ido | datetime NULL | |
| tuning_nyilatkozat | bool | VESC/tuning esetén kötelező pipa + PDF csatolva |

### 2.4 `wp_wpass_allomas`
id, nev (A/B/C…), telephely_id, aktiv. Kiosztás **személyhez** kötött (szerelo_user_id), az állomás csak a fizikai hely — a fiúk cserélhetik egymást.

### 2.5 `wp_wpass_telephely`
id, nev, cim, tipus (sajat / partner), kapcsolattarto_user_id.

### 2.6 `wp_wpass_pont` (hűségpont-napló)
id, user_id, roller_id NULL, esemeny_id NULL, pont (+/−), indok, datum, kupon_kod NULL.

### 2.7 `wp_wpass_naplo` (audit)
id, user_id, muvelet (megtekintes / szerkesztes / export / torles / kiosztas), cel_tipus, cel_id, ip, datetime. **Minden belső megtekintés naplózva.**

### 2.8 Tulajdonosváltás
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
| munkadíj | | ✓ | ✓ (csak saját) | ✓ (csak saját) | ✓ |
| beszerzési ár, árrés | | | | | ✓ |
| tulajdonos neve, telefonja | | ✓ (saját) | | | ✓ |
| ügyféllista | | | | | ✓ |
| más állomás sora | | | | | ✓ |
| más telephely rollerei | | | | csak beolvasva | ✓ |
| pontok | | ✓ | | | ✓ |
| riportok | | | | | ✓ |

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
- **Riportok:** napi lezárt munkák, szerelőnkénti munkaidő, sávonkénti átfutás, pontkiadás, Whoosh-igazolt rollerek száma.
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

**MVP (1. hét):** 2.1–2.3, 2.7 táblák · nyilvános oldal · Pult beolvasás + roller-kártya + munkalap + műhely-tábla · Állomás-nézet tablet · esemény-automatika átadáskor · címke-PNG · szerepkörök + TOTP · napi mentés.

**2. fázis:** tulajdonosi nézet + SMS-belépés · pontok + kuponok · emlékeztetők · tulajdonosváltás · CSV-import régi ügyfelekhez · Brevo-export.

**3. fázis:** partner-telephelyek · Wallet-pass · riportok bővítése · "Whoosh-igazolt használt" hirdető-lista a nyilvános oldalon.

---

## 11. Amit Claude Code-nak kérdeznie kell, mielőtt kódol

1. Forpsi tárhely PHP-verzió és van-e composer? (ha nincs, a QR-lib vendorolva legyen)
2. SMS-szolgáltató: van-e már fiók, vagy MVP-ben csak email?
3. Kezdő telephely-lista és felhasználók (kik a szerelők, ki a pult).
4. Meglévő szerviz-Google-Sheet: importáljuk-e a történetet? (ha igen, oszlopstruktúra kell)

---

## 12. Elfogadási kritériumok (MVP)

- Egy ismeretlen QR beolvasása bárkinek csak a 4.1 mezőket mutatja, névtelen HTTP-kliensből is.
- Szerelő-fiókkal bejelentkezve egyetlen végponton sem kérhető le ügyfélnév, telefonszám, beszerzési ár — automatizált teszt.
- Pult → kiosztás → tablet frissül 5 mp-en belül (polling elég, nem kell websocket).
- "Kész" → átadás → szervizkönyv-esemény létrejön a munkalap adataival, kézi másolás nélkül.
- Címke-PNG Brother P-touch Editorba importálva olvasható QR-t ad 24 mm-es szalagon.
- Napi mentés lefut és külső helyre kerül; visszaállítás dokumentálva.
