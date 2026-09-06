import { useLayoutEffect } from 'react';

/**
 * Egy elem tényleges magasságát CSS-változóba írja a <html>-en, és követi a
 * változását (ResizeObserver). Arra kell, hogy egymás alá tapadó (sticky)
 * sávok – ársáv, gyorsnavigáció, szekciófejléc – pontosan a másik ALÁ
 * tapadjanak, ne egymásra, akkor is, ha a magasságuk tartalomtól függ.
 * @param {import('react').RefObject<HTMLElement>} ref
 * @param {string} varName pl. '--price-bar-h'
 */
export function useReportHeight(ref, varName) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const write = () => document.documentElement.style.setProperty(varName, `${el.offsetHeight}px`);
    write();
    const ro = new ResizeObserver(write);
    ro.observe(el);
    return () => { ro.disconnect(); document.documentElement.style.removeProperty(varName); };
  }, [ref, varName]);
}
