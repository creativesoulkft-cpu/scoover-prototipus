import { useEffect, useState } from 'react';

const TRIGGER_LINE_PX = 140; // a nézet tetejétől ennyire számít "elért" egy szekció

function findScrollParent(el) {
  let node = el.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return document.scrollingElement ?? document.documentElement;
}

/**
 * Megfigyeli a megadott id-jú elemeket, és visszaadja, melyik van éppen
 * "elérve" görgetés közben – ebből dönti el a QuickNav, melyik gomb legyen
 * aktív. Két szabály:
 *  1. a legutolsó (legalulra görgetett) szekció, aminek teteje már átlépte a
 *     nézet tetejéhez közeli "trigger vonalat" – ez a szokásos scrollspy-logika;
 *  2. ha a görgethető konténer aljára értünk (pl. a lista utolsó szekciója
 *     rövidebb, mint a trigger-sáv, ezért sosem érné el az 1. szabályt),
 *     mindig az utolsó szekció legyen aktív.
 *
 * @param {string[]} ids
 * @returns {string|null}
 */
export function useScrollSpy(ids) {
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length) return undefined;

    const scrollParent = findScrollParent(els[0]);
    let raf = null;

    const compute = () => {
      raf = null;
      const atBottom = scrollParent === document.scrollingElement || scrollParent === document.documentElement
        ? window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
        : scrollParent.scrollTop + scrollParent.clientHeight >= scrollParent.scrollHeight - 2;

      if (atBottom) {
        setActiveId(ids[ids.length - 1]);
        return;
      }
      let current = ids[0];
      for (const el of els) {
        if (el.getBoundingClientRect().top <= TRIGGER_LINE_PX) current = el.id;
      }
      setActiveId(current);
    };
    const onScroll = () => { if (raf === null) raf = requestAnimationFrame(compute); };

    compute();
    scrollParent.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      scrollParent.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return activeId;
}
