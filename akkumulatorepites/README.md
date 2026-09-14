# akkumulatorepites.hu – landing page

Egyetlen `index.html`, nulla külső függőség. Bármilyen statikus hosztra feltehető; itt a GitHub Pages út van leírva, mert ingyenes és a domain rákötése 10 perc.

Élesítés előtt a fájl tetején lévő 5 pontos kommentet nézd át (FORM_ACTION, Meta Pixel, og:image, fotók, domain).

## 5 lépés: GitHub Pages + Forpsi domain

**1. Külön repo a landingnek.**
GitHub → New repository → név: `akkumulatorepites` (public). A GitHub Pages egy repóhoz egy domaint tud, ezért ne a Scoover-repóba tedd, hanem ebbe az újba. Töltsd fel az `index.html`-t a repo gyökerébe (Add file → Upload files, vagy git push).

**2. `CNAME` fájl a repo gyökerébe.**
Hozz létre egy `CNAME` nevű fájlt (kiterjesztés nélkül), tartalma egyetlen sor:
```
akkumulatorepites.hu
```
Ettől a Pages tudni fogja, melyik domainre válaszoljon, és nem törli a beállítást a következő pushnál.

**3. Pages bekapcsolása.**
Repo → Settings → Pages → Build and deployment → Source: **Deploy from a branch** → Branch: `main`, mappa: `/ (root)` → Save. 1–2 perc múlva él a `https://<felhasználó>.github.io/akkumulatorepites/` címen.

**4. DNS a Forpsinál.**
Forpsi admin → Domainek → akkumulatorepites.hu → DNS-rekordok szerkesztése. Két dolog kell:

| Típus | Név (host) | Érték | Megjegyzés |
|---|---|---|---|
| CNAME | `www` | `<felhasználó>.github.io.` | a www aldomain |
| A | `@` (gyökér) | `185.199.108.153` | gyökérdomain, 4 rekord |
| A | `@` | `185.199.109.153` | |
| A | `@` | `185.199.110.153` | |
| A | `@` | `185.199.111.153` | |

A gyökérdomainre (`akkumulatorepites.hu` www nélkül) a legtöbb DNS-szolgáltató, a Forpsi is, nem enged CNAME-et, ezért oda a GitHub 4 fix A-rekordja megy. A `www`-re CNAME. Ha van korábbi A- vagy CNAME-rekord a `@`-on vagy a `www`-n (pl. Forpsi parkoló oldal), azt töröld. Átfutás: általában 10–60 perc, legrosszabb esetben 24 óra.

**5. Domain megadása a GitHubon + HTTPS.**
Repo → Settings → Pages → Custom domain: `akkumulatorepites.hu` → Save. Megvárod, míg a DNS-ellenőrzés zöld lesz, majd bepipálod az **Enforce HTTPS**-t (a tanúsítványt a GitHub adja, ingyen, néha 10–20 perc mire elérhető a pipa). A `www.akkumulatorepites.hu` automatikusan átirányít a gyökérre.

## Módosítás később

Szöveg vagy ár változik → az `index.html`-t szerkeszted, push, 1–2 perc múlva élesben. Az árak a `<section id="arak">` táblázatában vannak, egy sor = egy pack.

## Ellenőrzés élesítés után

- `https://akkumulatorepites.hu` HTTPS-sel nyílik, nincs tanúsítvány-hiba
- mobilon az alsó Hívás / WhatsApp sáv látszik
- az űrlap küldése: MiniCRM URL-lel a MiniCRM-be érkezik, nélküle a levelező nyílik meg kitöltött levéllel
- Meta Events Manager → Test events: PageView jön az oldalról, Lead az űrlap küldésekor
