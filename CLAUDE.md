# Scoover fólia-konfigurátor – munkaszabályok Claude Code-nak

Tulajdonos: Szilárd (Whoosh, Veszprém; Scoover márka). Nyelv: magyar, tömören, gyakorlatiasan.

## Ez a repó CSAK a konfigurátor

React/Vite kliens (`src/`), Node híd-szerver (`server/`), nyomdai pipeline (`tools/cutfile/`, `server/print/`).
Minden más Whoosh-munka (webshop, botok, marketing, szerviz, landing oldalak, Shoprenter) a
**`whoosh`** monorepóba való: https://github.com/creativesoulkft-cpu/whoosh – ide ne kerüljön.

## Ágak

1. **A `main` az igazság.** Munkamenet elején `git fetch origin main && git merge origin/main`.
2. A munkamenet a saját `claude/...` ágán dolgozik, és minden kész egység után beolvaszt a `main`-be:
   `git checkout main && git merge --no-ff <ág> && git push origin main`.
3. Régi, be nem olvasztott kísérletek `archiv/...` ágon maradnak (lásd README).

## Hosting

- A repó **privát**. A statikus demó Cloudflare Pages-ről megy (build: `npm run build`, kimenet: `dist`), nem GitHub Pages-ről.
- A `server/` még nincs fent sehol; amíg nincs, a belépés/mentés/kívánságlista/nyomdai fájl csak helyben megy
  (`cd server && npm install && npm start`, mellette `npm run dev`).

## Soha a repóba

- Vágóív-geometria (`tools/cutfile/*/pieces.json`, PDF-ek, `server/print/models/*.json`) – gitignore-olva, csak a szerveren.
- Kulcsok (`.env`), ügyféladat, beszállítói ár.
