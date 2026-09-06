/**
 * ZÓNÁK – a "Mit fóliázunk" szekció egységei.
 *
 * A vevő NEM egyenkénti darabokat választ, hanem zónákat. Minden zóna mögött a
 * valós darabkészlet áll (a modell-adatfájlok darabjainak `priceGroup` mezője
 * köti ide őket) – a vágófájl nem változik, csak a választás szintje.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ ELNEVEZÉSEK – EGYETLEN HELY.                                          │
 * │ A `name` mezők egyelőre MUNKACÍMEK. A végleges nevek a boltban       │
 * │ használt vevői szóhasználat alapján később cserélődnek – CSAK ITT     │
 * │ kell átírni őket, sehol máshol nem szerepelnek szövegként.            │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * ÁRAK: nem itt, hanem src/pricing.js → ZONE_PRICES_HUF (zóna-id szerint).
 *
 * Egy zóna akkor létezik egy modellen, ha a modellnek van legalább egy olyan
 * darabja, amelynek `priceGroup`-ja a zóna `groups` listájában szerepel. Így
 * egy új modellnél nem kell zónát felvenni: elég a darabjait a meglévő
 * csoport-id-kkal címkézni (lásd README "Új modell").
 *
 * A taposófelület (`footboard: true` darab) SZÁNDÉKOSAN nincs zónában: külön
 * anyag (kültéri csúszásgátló), külön tétel, saját tervezőnézettel – lásd
 * pricing.js FOOTBOARD_EXTRA_HUF és FootboardSection.jsx.
 */
export const ZONES = [
  {
    id: 'deck-side',
    name: 'Dekk oldala',
    blurb: 'A dekk két oldalsó, legnagyobb és legjobban látható felülete.',
    groups: ['deck-side'],
  },
  {
    id: 'panels',
    name: 'Akkuház / oldalpanelek',
    blurb: 'Az akkudoboz alja, a dekk-nyak és a csuklóborítás.',
    groups: ['battery', 'neck', 'joint'],
  },
  {
    id: 'stem',
    name: 'Kormányoszlop',
    blurb: 'A kormányoszlop és a kijelzőborítás.',
    groups: ['stem', 'display'],
  },
  {
    id: 'front',
    name: 'Első sárvédő + villa',
    blurb: 'Az első lengőkar-/villaborítás és – ahol van – az első sárvédő.',
    groups: ['fork', 'front-fender'],
  },
  {
    id: 'rear',
    name: 'Hátsó sárvédő + lengőkar',
    blurb: 'A hátsó sárvédő és a hátsó lengőkar-borítás.',
    groups: ['rear-fender', 'rear-swingarm'],
  },
];

export const ZONE_IDS = ZONES.map((z) => z.id);

export function getZone(id) {
  return ZONES.find((z) => z.id === id) ?? null;
}

/** Egy darab-csoport (priceGroup) melyik zónába tartozik. */
export function zoneOfGroup(groupId) {
  return ZONES.find((z) => z.groups.includes(groupId)) ?? null;
}

/** Egy darab melyik zónába tartozik (null: taposó vagy zónán kívüli darab). */
export function zoneOfPiece(piece) {
  if (!piece?.priceGroup) return null;
  return zoneOfGroup(piece.priceGroup);
}

/**
 * Az adott darablistán (modellen/nézeten) TÉNYLEGESEN létező zónák, a hozzájuk
 * tartozó darab-id-kkal – a ZONES sorrendjében.
 * @param {Array<{id:string, priceGroup?:string, footboard?:boolean}>} pieces
 * @returns {Array<{id:string, name:string, blurb:string, pieceIds:string[]}>}
 */
export function zonesForPieces(pieces) {
  return ZONES
    .map((z) => ({
      ...z,
      pieceIds: pieces.filter((p) => !p.footboard && p.priceGroup && z.groups.includes(p.priceGroup)).map((p) => p.id),
    }))
    .filter((z) => z.pieceIds.length > 0);
}
