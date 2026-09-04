/** Forintos összeg egységes kiírása: 39 900 Ft (magyar ezres tagolással). */
export function formatHuf(amount) {
  return `${Math.round(amount).toLocaleString('hu-HU')} Ft`;
}
