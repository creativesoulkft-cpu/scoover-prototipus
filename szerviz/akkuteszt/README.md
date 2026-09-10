# Akkumulátor terheléses teszt jegyzőkönyv

Ügyfélnek átadható, A4-es, kétoldalas PDF jegyzőkönyv a szervizben végzett
akkumulátor-kapacitásmérésről (SOH-minősítéssel, a tesztkészülék kijelzőfotójával).

## Új jegyzőkönyv

1. Másold le a `jegyzokonyvek/` egyik JSON-ját új néven (`ÉÉÉÉ-HH-NN-ugyfel-tipus.json`),
   írd át az adatokat (ügyfél, jármű, névleges Ah/Wh, mért Ah, idő, dátum, jegyzőkönyvszám).
2. A kijelzőfotót tedd az `assets/` mappába, és a JSON `test.photo` mezőjében hivatkozz rá
   (a JSON helyéhez képest, pl. `../assets/teszt-kijelzo.jpg`).
3. Futtasd:

```bash
node szerviz/akkuteszt/build.mjs szerviz/akkuteszt/jegyzokonyvek/<adat>.json
```

A JSON mellé kerül a `.html` és a `.pdf`. A PDF-hez Playwright + Chromium kell;
ha csak globálisan van telepítve, az `NPM_GLOBAL_ROOT` env-vel adható meg a helye.
`PREVIEW_PNG=1`-gyel egy teljes oldalas PNG előnézet is készül.

## Logó

`assets/whoosh-logo.svg` – az eredeti `LOGO_Whoosh.ai`-ból konvertált vektoros logó.
Ha `whoosh-logo.png` (vagy .jpg/.webp) is van az `assets/`-ben, a build azt részesíti előnyben.

## Minősítési sávok (SOH = mért Ah / névleges Ah)

| SOH | Minősítés |
|-----|-----------|
| ≥ 90 % | Kiváló |
| 80–89,9 % | Jó |
| 70–79,9 % | Megfelelő |
| 60–69,9 % | Gyenge |
| < 60 % | Csere javasolt |

A SOH két tizedesre kerekítve kerül minősítésre, hogy a kiírt érték és a sáv egyezzen.
