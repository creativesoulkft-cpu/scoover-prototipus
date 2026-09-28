/**
 * KÍVÁNSÁGLISTA – márkák és modell-javaslatok.
 *
 * A vevő szabadon beírhat bármit; a lista csak gyorsítja a gépelést
 * (datalist) és egységesíti az írásmódot, hogy az admin összesítés
 * (melyik modellre hányan várnak) ne szóródjon szét "G2 pro max" /
 * "G2 Pro/Max" változatokra. Bővítsd bátran – csak adat.
 */
export const WISHLIST_BRANDS = [
  { id: 'kukirin', name: 'Kukirin', models: ['G2 Pro', 'G2 Max', 'G3', 'G3 Pro', 'G4', 'G4 Max', 'M4 Pro', 'M5 Pro'] },
  { id: 'segway-ninebot', name: 'Segway Ninebot', models: ['Max G2', 'Max G30', 'F2', 'F2 Plus', 'F2 Pro', 'E2', 'E2 Plus', 'D38E', 'GT1', 'GT2', 'ZT3 Pro'] },
  { id: 'xiaomi', name: 'Xiaomi', models: ['Electric Scooter 4', '4 Pro', '4 Ultra', '3 Lite', 'Mi Pro 2', 'Mi 1S', 'Elite'] },
  { id: 'navee', name: 'Navee', models: ['V50', 'V40', 'N65', 'S65', 'ST3 Pro', 'GT3'] },
  { id: 'whoosh', name: 'Whoosh', models: [] },
  { id: 'ootd', name: 'OOTD', models: ['S10', 'S8', 'S12'] },
  { id: 'gspace', name: 'Gspace', models: [] },
  { id: 'yume', name: 'Yume', models: ['Y10', 'X11', 'D5', 'Swift', 'Hawk'] },
  { id: 'dualtron', name: 'Dualtron', models: ['Mini', 'Victor', 'Thunder', 'Storm'] },
  { id: 'kaabo', name: 'Kaabo', models: ['Mantis 8', 'Mantis 10', 'Wolf Warrior', 'Skywalker'] },
  { id: 'vsett', name: 'VSETT', models: ['9+', '10+', '11+'] },
  { id: 'other', name: 'Egyéb márka', models: [] },
];

/** Amikor a modell ismert, de még nincs hozzá vágófájl – a fiók listájában "hamarosan". */
export const COMING_SOON = ['kukirin-g2-pro-max'];

/** Évjárat-választék a kívánsághoz (a legfrissebb elöl). */
export function wishlistYears(now = new Date().getFullYear()) {
  const out = [];
  for (let y = now + 1; y >= 2018; y--) out.push(y);
  return out;
}
