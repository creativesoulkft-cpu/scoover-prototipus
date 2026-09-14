# akkumulatorepites.hu – landing page

Egyetlen `index.html`, nulla külső függőség. Bármilyen statikus hosztra feltehető; itt a GitHub Pages út van leírva, mert ingyenes és a domain rákötése kb. fél óra.

Élesítés előtt a fájl tetején lévő 5 pontos kommentet nézd át (FORM_ACTION, Meta Pixel, og:image, fotó, domain).

## 5 lépés: GitHub Pages + Forpsi domain

**1. Külön repo a landingnek.**
GitHub → New repository → név: `akkumulatorepites` (public). Ne a Scoover-repóba tedd: egy repóhoz egy GitHub Pages-oldal tartozik, és a Scooveré már foglalt. Az ott lévő `.github/workflows/deploy-pages.yml` minden pushnál a Vite-demó `dist` mappáját publikálja, az `akkumulatorepites/index.html` onnan nem kerül élesbe. Attól, hogy a Scoover-repóba pusholtad, még nem él. Töltsd fel az `index.html`-t az új repo gyökerébe (Add file → Upload files, vagy git push). Ha van `og.jpg` (megosztáskép), az is a gyökérbe megy.

**2. `CNAME` fájl a repo gyökerébe.**
Ebbe az új repóba (nem a Scooverbe) hozz létre egy `CNAME` nevű fájlt (kiterjesztés nélkül), tartalma egyetlen sor:
```
akkumulatorepites.hu
```
Ettől a Pages tudni fogja, melyik domainre válaszoljon, és nem törli a beállítást a következő pushnál.

**3. Pages bekapcsolása.**
Repo → Settings → Pages → Build and deployment → Source: **Deploy from a branch** → Branch: `main`, mappa: `/ (root)` → Save. 1–2 perc múlva (első alkalommal akár 5–10 perc) a Pages elindul. Figyelem: a 2. lépés `CNAME` fájlja miatt a `https://<felhasználó>.github.io/akkumulatorepites/` cím ilyenkor már az `akkumulatorepites.hu`-ra irányít át, ami a 4–5. lépésig még nem nyílik meg. Ez nem hiba. Ha előbb szeretnéd élőben látni az oldalt a github.io címen, a `CNAME` fájlt csak az 5. lépés előtt tedd fel.

**4. DNS a Forpsinál.**
Előtte nézd meg, hogy a domain névszerverei a Forpsinál vannak-e (Forpsi admin → a domain adatlapján a névszerver / NS sor). Ha nem a Forpsi névszerverei vannak beállítva (pl. egy korábbi tárhelyszolgáltatóé), a rekordokat ott kell felvinni, ahová az NS mutat, vagy előbb állítsd vissza a névszervereket a Forpsiéra.

Forpsi admin → Domainek → akkumulatorepites.hu → DNS-rekordok szerkesztése. Ez kell:

| Típus | Név (host) | Érték | Megjegyzés |
|---|---|---|---|
| CNAME | `www` | `<felhasználó>.github.io` | a www aldomain |
| A | gyökér (lásd lent) | `185.199.108.153` | gyökérdomain, 4 rekord |
| A | gyökér | `185.199.109.153` | |
| A | gyökér | `185.199.110.153` | |
| A | gyökér | `185.199.111.153` | |

Két dolog, amin el szoktak akadni. A gyökérdomaint (`akkumulatorepites.hu` www nélkül) a Forpsi felületén nem `@`-cal jelölöd, mint máshol: a Név/Hostname mezőt hagyd üresen, vagy ha a felület kéri, írd be a teljes domaint (`akkumulatorepites.hu`). A CNAME értékét záró pont nélkül írd be (`<felhasználó>.github.io`); ha valahol ponttal a végén látod, a pontot hagyd le. A `<felhasználó>` helyére a saját GitHub-felhasználóneved jön, kisbetűvel.

A gyökérdomainre a legtöbb DNS-szolgáltató, a Forpsi is, nem enged CNAME-et, ezért oda a GitHub 4 fix A-rekordja megy. A `www`-re CNAME. Ha van korábbi A- vagy CNAME-rekord a gyökéren vagy a `www`-n (pl. Forpsi parkoló oldal), azt töröld. Átfutás: általában 10–60 perc, legrosszabb esetben 24 óra.

**5. Domain megadása a GitHubon + HTTPS.**
Repo → Settings → Pages → Custom domain: `akkumulatorepites.hu` → Save (a `CNAME` fájl miatt valószínűleg már ki van töltve, akkor csak ellenőrizd). A GitHub ellenőrzi a DNS-t. Ha pirosat mutat („Improperly configured”), a 4. lépés rekordjai még nem futottak át: várj, majd **Check again**. Ha zöld, pipáld be az **Enforce HTTPS**-t. A tanúsítványt a GitHub adja ingyen; a pipa a zöld DNS után általában 10–60 percen belül lesz kattintható, a GitHub szerint legrosszabb esetben 24 óra. Amíg szürke, nincs teendő, csak várni. A `www.akkumulatorepites.hu` a www CNAME miatt automatikusan a gyökérre irányít, HTTPS-sel.

## Módosítás később

Szöveg vagy ár változik → az `index.html`-t szerkeszted, push, 1–2 perc múlva élesben. Az árak a `<section id="arak">` táblázatában vannak, egy sor = egy pack.

## Ellenőrzés élesítés után

- `https://akkumulatorepites.hu` HTTPS-sel nyílik, nincs tanúsítvány-hiba
- mobilon az alsó Hívás / WhatsApp sáv látszik
- az űrlap küldése: MiniCRM URL-lel a MiniCRM-be érkezik, nélküle a levelező nyílik meg kitöltött levéllel, és megjelenik a WhatsApp-alternatíva
- Meta Events Manager → Test events: PageView jön az oldalról, Lead az űrlap küldésekor, Contact a Hívás / WhatsApp gombra kattintva
