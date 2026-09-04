import { useEffect, useState } from 'react';

/**
 * Érintéses eszköz-e (nincs egérmutató-hover, vagy durva mutatóeszköz).
 * A vevők többsége mobilról érkezik, ezért a súgószövegek ettől függenek
 * ("Vidd az egeret…" helyett "Koppints…").
 *
 * Médialekérdezésre épül, nem user-agent szimatolásra, és a változást is
 * követi (pl. tablet billentyűzet-dokkba helyezése, asztali ablakátméretezés).
 */
const TOUCH_QUERY = '(hover: none), (pointer: coarse)';

function matches() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(TOUCH_QUERY).matches
    : false;
}

export function useIsTouch() {
  const [isTouch, setIsTouch] = useState(matches);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(TOUCH_QUERY);
    const onChange = (e) => setIsTouch(e.matches);
    mq.addEventListener('change', onChange);
    setIsTouch(mq.matches);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isTouch;
}
