/** Relatív világosság 0..1 egy #rrggbb színből (sRGB, egyszerűsített). */
export function hexLuminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** A minta világossága: adatból, vagy egyszínűnél a színből számolva. */
export function patternLuminance(pattern) {
  if (!pattern) return 0.5;
  if (typeof pattern.luminance === 'number') return pattern.luminance;
  if (pattern.type === 'solid') return hexLuminance(pattern.color);
  return 0.5;
}

/** Feliratszín: sötét háttérre fehér, világosra fekete. */
export function labelColorFor(pattern) {
  return patternLuminance(pattern) < 0.45 ? '#ffffff' : '#111111';
}
