/**
 * Fejlesztői ellenőrző táblázat: minden modell × szint × darabcsoport árát
 * kiírja a konzolra, hogy egyben átlátható legyen árazás módosítása vagy
 * élesítés előtt. Csak fejlesztői buildben fut (App.jsx hívja, import.meta.env.DEV
 * mögé zárva) – éles buildből ez a hívás (és így ez a modul) kiesik.
 */
import { MODEL_PRICES, TIER_IDS, getGroupPrices } from '../pricing.js';

export function logDevPriceTable() {
  const rows = [];
  for (const [modelId, model] of Object.entries(MODEL_PRICES)) {
    for (const tierId of TIER_IDS) {
      const groups = getGroupPrices(modelId, tierId);
      const row = { modell: model.name, szint: tierId.toUpperCase(), 'teljes kit': model[tierId] };
      for (const g of groups) row[g.name] = g.price;
      const sum = groups.reduce((s, g) => s + g.price, 0);
      row['Σ darabár (à la carte, mind)'] = sum;
      rows.push(row);
    }
  }
  // eslint-disable-next-line no-console
  console.log('%cScoover árlista – ellenőrzés (csak fejlesztői build)', 'font-weight:bold');
  // eslint-disable-next-line no-console
  console.table(rows);
}
