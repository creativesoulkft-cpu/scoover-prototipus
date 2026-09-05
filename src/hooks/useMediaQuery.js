import { useEffect, useState } from 'react';

/**
 * Egy CSS media query aktuális állapota Reactből is olvashatóan.
 *
 * Azért kell, mert az osztott nézetben a képaláírás és a "Mentsd le a tervedet"
 * gomb NEM csak stílusban, hanem a DOM-ban is máshova kerül: asztalin a kép
 * alá (bal oszlop), keskeny nézetben a görgethető vezérlőpanel tetejére – ezt
 * CSS-sel nem lehet megoldani, csak a fa átrendezésével.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** A keskeny (osztott nézetes) elrendezés töréspontja – egy helyen, a CSS-sel egyezően. */
export const NARROW_QUERY = '(max-width: 1023px)';
