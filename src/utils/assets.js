/**
 * Statikus eszköz (kép) URL feloldása a Vite base-hez képest.
 *
 * `__INLINE_ASSETS__`: build-időben definiált térkép (Vite `define`). A normál
 * buildben üres; az egyfájlos demó-buildben (tools/build-singlefile.mjs) a
 * public/patterns/ képek data-URL-jeit tartalmazza, mert ott nincs statikus mappa.
 * Data-URL-t és abszolút URL-t változatlanul enged át.
 */
export function assetUrl(path) {
  if (!path || path.startsWith('data:') || path.startsWith('http')) return path;
  if (typeof __INLINE_ASSETS__ !== 'undefined' && __INLINE_ASSETS__[path]) return __INLINE_ASSETS__[path];
  return `${import.meta.env.BASE_URL}${path}`;
}
