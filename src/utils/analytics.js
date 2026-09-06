/**
 * Eseménymérés – GA4-kompatibilis egyedi események.
 *
 * ÉLESÍTÉS EGY SORRAL: állítsd az `ENABLED`-et true-ra, miután a GA4 mérőkód
 * (gtag.js) bekerült az index.html-be. Addig minden esemény csak a konzolra
 * megy, így fejlesztés közben is látszik, mi mérődne – és nem küldünk adatot
 * sehova, amíg nincs döntés a mérésről (adatvédelem: itt SEMMILYEN személyes
 * adat nem kerül eseménybe, csak konfigurációs választások és összegek).
 *
 * A GA4 egyedi események neve max. 40 karakter, a paramétereké max. 40, az
 * értékeké 100 – a lenti nevek ezen belül vannak. A `value` + `currency`
 * páros a GA4 bevétel-riportjaiba is beköthető (add_to_cart).
 */

/** ← EZT az egy sort kell átállítani, amikor a GA4 bekerül. */
const ENABLED = false;

/** A konfigurátor megnyitásának időbélyege – minden eseményhez eltelt időt adunk. */
let openedAt = null;

function secondsSinceOpen() {
  if (openedAt == null) return 0;
  return Math.round((Date.now() - openedAt) / 100) / 10; // 0,1 mp pontosság
}

/**
 * Egy esemény elküldése (vagy naplózása).
 * @param {string} event GA4 esemény-név (snake_case)
 * @param {Record<string, unknown>} [params]
 */
export function track(event, params = {}) {
  const payload = { ...params, seconds_since_open: secondsSinceOpen() };
  if (ENABLED && typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', event, payload);
    return;
  }
  // eslint-disable-next-line no-console
  console.info(`%c[analytics] ${event}`, 'color:#19e6c1', payload);
}

/**
 * A konfigurátor megnyitása – ez indítja az eltelt idő mérését is.
 * Csak EGYSZER küldi el: React StrictMode-ban (fejlesztői build) az effektek
 * kétszer futnak, és egy duplán mért munkamenet-indítás elrontaná a
 * konverziós arányokat.
 */
export function trackConfiguratorOpened(params = {}) {
  if (openedAt != null) return;
  openedAt = Date.now();
  track('configurator_opened', params);
}

/** Termékszint váltása (solid | print | custom). */
export const trackTierSelected = (tier) => track('tier_selected', { tier });

/** Konkrét minta választása – a minta NEVE (ez olvasható a GA4 riportban). */
export const trackPatternSelected = (pattern) => track('pattern_selected', {
  pattern_name: pattern?.name ?? 'ismeretlen',
  pattern_id: pattern?.id ?? null,
  tier: pattern?.line ?? null,
});

/** Saját kép feltöltése (méret px-ben, hogy lássuk, mekkora képeket töltenek). */
export const trackImageUploaded = ({ width, height, focusPieceId } = {}) =>
  track('image_uploaded', { image_width: width ?? null, image_height: height ?? null, focus_piece: focusPieceId ?? null });

/** Egy zóna be/ki ("Mit fóliázunk"). */
export const trackZoneToggled = (zoneId, included) => track('zone_toggled', { zone: zoneId, included: Boolean(included) });

/** Teljes fólia szett vissza egyben ("Kérem egyben") vagy minden törlése. */
export const trackKitToggled = (fullKit) => track('kit_toggled', { full_kit: Boolean(fullKit) });

/** Taposófelület-extra be/ki. */
export const trackFootboardToggled = (included) => track('footboard_toggled', { included: Boolean(included) });

/** Terv mentése képként. */
export const trackDesignSaved = ({ modelName, tier, method = 'download' } = {}) =>
  track('design_saved', { model: modelName ?? null, tier: tier ?? null, method });

/** Kosárba helyezés – a végösszeggel (GA4 bevétel-kompatibilis mezőnevek). */
export const trackAddToCart = ({ modelName, tier, total, isFullKit, pieceCount } = {}) =>
  track('add_to_cart', {
    model: modelName ?? null,
    tier: tier ?? null,
    value: total ?? 0,
    currency: 'HUF',
    full_kit: Boolean(isFullKit),
    piece_count: pieceCount ?? null,
  });
