# Felirat-betűtípusok a nyomdai renderhez

A konfigurátor feliratai Google Fonts betűkkel készülnek (Orbitron, Anton,
Bebas Neue, Rajdhani, Oswald, Teko – lásd `src/data/fonts.js`). A szerver
oldali render (resvg) **helyi TTF/OTF fájlokból** dolgozik: másold ide a
betűk fájljait (a Google Fonts oldaláról letöltve, OFL licenc):

    server/print/fonts/Orbitron-Black.ttf   (weight 900)
    server/print/fonts/Anton-Regular.ttf
    server/print/fonts/BebasNeue-Regular.ttf
    server/print/fonts/Rajdhani-Bold.ttf
    server/print/fonts/Oswald-Bold.ttf
    server/print/fonts/Teko-SemiBold.ttf

A fájlnév nem számít, a betű belső családneve igen (megegyezik a
`fonts.js` `family` mezőjével). Ha egy betű hiányzik, a render a rendszer
sans-serif betűjével készül, és a manifest/munkalap **figyelmeztet**.
