/**
 * Fejlesztői ellenőrző táblázat: minden modell × szint zónaárát és a teljes
 * szett árát kiírja a konzolra, hogy egyben átlátható legyen árazás
 * módosítása vagy élesítés előtt. Csak fejlesztői buildben fut (App.jsx
 * hívja, import.meta.env.DEV mögé zárva) – éles buildből kiesik.
 */
import { MODEL_PRICES, TIER_IDS, getKitInfo, FOOTBOARD_EXTRA_HUF } from '../pricing.js';

export function logDevPriceTable() {
  const rows = [];
  for (const [modelId, model] of Object.entries(MODEL_PRICES)) {
    for (const tierId of TIER_IDS) {
      const kit = getKitInfo(modelId, tierId);
      const row = { modell: model.name, szint: tierId.toUpperCase(), 'teljes szett': kit.kitPrice };
      for (const z of kit.zones) row[z.name] = z.price;
      row['Σ zónák külön'] = kit.listSum;
      row['megtakarítás a szettel'] = kit.savings;
      row['taposó (külön)'] = FOOTBOARD_EXTRA_HUF;
      rows.push(row);
    }
  }
  // eslint-disable-next-line no-console
  console.log('%cScoover árlista – ellenőrzés (csak fejlesztői build)', 'font-weight:bold');
  // eslint-disable-next-line no-console
  console.table(rows);
}
