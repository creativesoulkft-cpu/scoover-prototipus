# akkumulatorepites.hu – v2 tervezet (WordPresshez)

Kattintható prototípus egyetlen fájlban (`index.html`), hat nézettel. A böngészőben megnyitva a felső menüvel lehet lapozni. A v1 (`../index.html`) összehasonlításnak marad.

| Nézet a prototípusban | WordPress-oldal (javasolt slug) | Cél |
|---|---|---|
| `#/` | `/` | Önbesorolás: roller, e-bike vagy hajó, közös bizonyítékok, közös GYIK és ajánlatkérés |
| `#/roller` | `/roller-akku-csere/` | Roller-hirdetés céloldala: ár az első képernyőn, árlista, tünetek, cella, űrlap |
| `#/e-bike` | `/e-bike-akku-felujitas/` | Kompatibilitás elöl (mibe igen, mibe nem), árlista, űrlap |
| `#/hajo` | `/hajoakku-lifepo4-balaton/` | Hajós hirdetés céloldala: WhatsApp a fő gomb, tételes rendszerár, menetidő-tábla |
| `#/biztonsag` | `/biztonsag-es-jotallas/` | Tűzeset-adatok, építés, töltési útmutató, jótállás, ajánlati feltételek |
| `#/jegyzet` | nem kerül ki | Belső tervezői jegyzet: kutatás, döntések, WordPress, fotók, források |

## Élesítés előtt

- A sárga pontozott aláhúzású részek (`.tbd`, `.tbd-b`) megerősítendő állítások, a `[szögletes zárójeles]` részek (`.fill`) hiányzó adatok. A döntési lista a prototípusban: `#/jegyzet/dontesek`.
- Élesben törlendő: a `.draftbar` sáv, a `.tbd`, `.tbd-b`, `.fill` jelölések, a `#jegyzet` nézet és a `<meta name="robots" content="noindex">`.
- A jótállás a v2-ben 2 év, 250 000 Ft felett 3 év (151/2003. Korm. r. 2. § (1), hatályos szöveg). A pack besorolását a 10/2024. IM r. 38. pontja (alkotórész) alapján egy fogyasztóvédelmi jogász erősítse meg.

## Oldalcímek és leírások

| Oldal | `<title>` | Meta description |
|---|---|---|
| Főoldal | Roller és e-bike akku csere, felújítás, hajóakku \| Veszprém | Roller és e-bike akku csere, felújítás fix áron, 106 900 Ft-tól. Tenpower 21700 cella, mért kapacitás, jótállási jegy. LiFePO4 hajóakku a Balatonon. |
| Roller | Roller akku csere Veszprém – fix ár, 106 900 Ft-tól \| Whoosh | Roller akku csere és felújítás Veszprémben: új, megmért pack a gyári rekeszbe, 36V 10Ah 106 900 Ft-tól. Fix árlista, 5–10 munkanap, jótállási jeggyel. |
| E-bike | E-bike akku felújítás Veszprém – 36, 48, 52 V \| Whoosh | E-bike akku felújítás és egyedi pack 36, 48 és 52 V-ra, a te tokodba vagy új házba. Előbb megnézzük, mibe lehet. Fix árlista, Veszprém. |
| Hajó | LiFePO4 hajóakku a Balatonon – felmérés, beépítés \| Whoosh | LiFePO4 hajóakku ólom helyett a Balatonon: 24/48 V, 2–6 kWh, felmérés a kikötőben, beépítés, teszt a vízen. Tételes, írásos ajánlat. |
| Biztonság | Roller akku biztonság, töltés és jótállás \| Whoosh Veszprém | Hogyan épül egy biztonságos roller akku, hogyan töltsd, és mit jelent a jótállás: 2 év, 250 000 Ft felett 3 év, jótállási jeggyel. |

## Átültetés WordPressbe

1. **Téma:** Kadence vagy GeneratePress, child theme-mel. Elementort nem javaslunk (lassabb mobilon), a *Custom HTML* blokkot sem: levágja a `<head>`-et és a scripteket.
2. **Stílus:** a `<style>` tartalma a child theme-be (`assets/akku.css`, `wp_enqueue_style`). Minden szín és méret a `:root` változókban van.
3. **Oldalak:** minden nézet saját oldalsablon (pl. `page-roller-akku-csere.php`) a megfelelő `<main>` tartalmával. A hash-alapú útválasztó élesben nem kell: a belső linkeket valódi URL-ekre kell írni, például `#/roller/arak` helyett `/roller-akku-csere/#arak`, és a szakasz-azonosítókból elhagyni az oldal-előtagot.
4. **Script:** `assets/akku.js` a láblécbe (`wp_enqueue_script`). Megtartandó: ártábla-sor koppintása az űrlapba, feltételes űrlapmezők, Bosch-figyelmeztetés, Contact-esemény. Az útválasztó és a mailto-fallback elhagyható.
5. **Űrlap és MiniCRM:** hivatalos WordPress-bővítmény nincs. Két út: a sablon űrlapja natívan küld a MiniCRM űrlap-végpontjára (a MiniCRM-ben létrehozott űrlap mezőneveivel), vagy Contact Form 7 plusz webhook a MiniCRM felé. A mezők neve és a rejtett mezők (`tipus`, `forras`, `kivalasztott_sor`) a sablonban vannak. Fotófeltöltéshez a bővítményes út kell.
6. **Sütik és Meta Pixel:** CookieYes vagy Complianz, az *Elfogadom* és az *Elutasítom* gomb egyenrangú. A Pixel alapkódja `fbq('consent','revoke')` mellett töltődjön, `grant` csak hozzájárulás után. A Lead az űrlap sikeres beküldésekor, a Contact hívás- és WhatsApp-kattintáskor fut, csak ha a Pixel betöltött.
7. **SEO:** Rank Math. A prototípus LocalBusiness JSON-LD-je kiváltható a Rank Math helyi SEO-jával, a kettő együtt ne legyen. A GYIK-ekhez FAQPage séma. Google Cégprofil telephellyel és balatoni szolgáltatási területtel.
8. **Képek:** WebP-ben, a hero legfeljebb 150 KB, `fetchpriority="high"`. A lista lent.
9. **Tárhely és DNS:** a domain a Forpsinál van. WordPress-tárhelynél a domain a tárhely címére mutat, a `../README.md` GitHub Pages-terve ezzel érvényét veszti.
10. **Ellenőrzés:** PageSpeed mobilon, próba-ajánlatkérés a MiniCRM-be, Meta Events Manager tesztesemények hozzájárulással, Search Console és oldaltérkép.

## Hirdetési linkek

- UTM csak a hirdetésből jövő linkre kell, például `https://akkumulatorepites.hu/roller-akku-csere/?utm_source=facebook&utm_medium=paid&utm_campaign=roller-akku`.
- Belső linkre ne tegyél UTM-et, mert felülírja a hirdetés forrását a mérésben.
- A főoldali űrlap a `?tipus=roller`, `?tipus=e-bike` vagy `?tipus=hajo` paraméterrel előválasztható.

## Képek

A fájlokat az `index.html` mellé kell másolni. Amíg hiányoznak, felirattal ellátott helyőrző látszik. JPG 80%-on, WordPressbe WebP-ként.

| Fájl | Méret, px | Mi legyen rajta |
|---|---|---|
| `hero.jpg` | 1600×1067 | Kész, zsugorozott pack a kézben vagy a munkaasztalon, mögötte elmosódva a műhely |
| `pack-roller.jpg` | 1200×800 | Kész roller-pack hőzsugorban, mellette a kapacitásmérő kijelzője |
| `ponthegesztes.jpg` | 1200×800 | Ponthegesztés közelről: cellák, nikkelszalag |
| `muhely.jpg` | 1600×900 | Széles műhelykép: ponthegesztő, kapacitásmérő, munka közben |
| `szilard.jpg` | 800×1000 | Szilárd a műhelyben, álló kép |
| `golfboard-pack.jpg` | 1200×800 | A kész Golfboard-pack |
| `ebike-akku.jpg` | 1200×800 | Felnyitott e-bike tok új cellasorral |
| `pack-hajo.jpg` | 1200×800 | LiFePO4 prizmatikus cellák, vagy nagy pack, amíg nincs hajós beépítés |
| `referencia-hajo.jpg` | később | Csak valódi balatoni beépítésről |

AI-generált termékfotó nem kerül ki.

## Források

A kutatás összefoglalója és a forráslista a prototípus `#/jegyzet` nézetében van. Az árak 2026. szeptember végi lekérdezések.
