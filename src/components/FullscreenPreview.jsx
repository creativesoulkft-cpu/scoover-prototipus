/**
 * Teljes képernyős előnézet: a roller kitölti a képernyőt, csippentéssel
 * (pinch) nagyítható és ujjal/egérrel húzható – mobilon így a fólia részletei
 * (minta illeszkedése a daraboknál, felirat) is megnézhetők, amit a kis
 * beágyazott előnézeten nem lehet kivenni.
 *
 * A nagyítást SAJÁT gesztuskezelés adja (pointer events + CSS transform), nem
 * a böngésző natív oldal-zoomja: az utóbbi az egész felületet nagyítaná
 * (ársáv, panelek), és a rögzített elemek miatt használhatatlan lenne.
 * Egérrel: görgő = nagyítás, húzás = mozgatás, dupla kattintás = alaphelyzet.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const IDENTITY = { scale: 1, x: 0, y: 0 };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const centerOf = (pts) => ({
  x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
  y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
});
const distOf = (pts) => Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);

export default function FullscreenPreview({ title, children, onClose }) {
  const [t, setT] = useState(IDENTITY);
  /** aktív érintőpontok (pointerId → képernyő-koordináta) */
  const pointers = useRef(new Map());
  /** a jelenlegi gesztus kiindulási állapota (ujjak száma/távolsága/középpontja + a kezdő transzformáció) */
  const gesture = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    // amíg nyitva van, a háttér ne görögjön mögötte
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  /** Minden ujjle-/ujjfelvételkor újraalapozzuk a gesztust az AKTUÁLIS
   *  transzformációról – így egy ujj elvétele/hozzátétele nem ugrik meg. */
  const rebase = useCallback((current) => {
    const pts = [...pointers.current.values()];
    gesture.current = pts.length
      ? { count: pts.length, center: centerOf(pts), dist: pts.length >= 2 ? distOf(pts) : 0, base: current }
      : null;
  }, []);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setT((cur) => { rebase(cur); return cur; });
  };

  const endPointer = (e) => {
    pointers.current.delete(e.pointerId);
    setT((cur) => { rebase(cur); return cur; });
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    if (!g || pts.length !== g.count) return; // a rebase majd rendezi

    const c = centerOf(pts);
    const scale = pts.length >= 2 && g.dist > 0
      ? clamp(g.base.scale * (distOf(pts) / g.dist), MIN_SCALE, MAX_SCALE)
      : g.base.scale;
    // nagyítás a gesztus középpontja körül + a középpont elmozdulása = mozgatás
    const k = scale / g.base.scale;
    setT({
      scale,
      x: c.x - (g.center.x - g.base.x) * k,
      y: c.y - (g.center.y - g.base.y) * k,
    });
  };

  const onWheel = (e) => {
    const factor = Math.exp(-e.deltaY / 400);
    setT((cur) => {
      const scale = clamp(cur.scale * factor, MIN_SCALE, MAX_SCALE);
      const k = scale / cur.scale;
      return { scale, x: e.clientX - (e.clientX - cur.x) * k, y: e.clientY - (e.clientY - cur.y) * k };
    });
  };

  const zoomBy = (factor) => setT((cur) => {
    const scale = clamp(cur.scale * factor, MIN_SCALE, MAX_SCALE);
    const k = scale / cur.scale;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    return { scale, x: cx - (cx - cur.x) * k, y: cy - (cy - cur.y) * k };
  });

  return (
    <div className="fs-preview" role="dialog" aria-modal="true" aria-label={`${title} – teljes képernyős előnézet`}>
      <div
        className="fs-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onWheel={onWheel}
        onDoubleClick={() => setT(IDENTITY)}
      >
        <div
          className="fs-content"
          style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})` }}
        >
          {children}
        </div>
      </div>

      <div className="fs-bar">
        <span className="muted small">{title} · csippentéssel nagyíthatod</span>
        <div className="fs-actions">
          <button type="button" className="btn" onClick={() => zoomBy(1 / 1.4)} aria-label="Kicsinyítés">−</button>
          <button type="button" className="btn" onClick={() => zoomBy(1.4)} aria-label="Nagyítás">+</button>
          <button type="button" className="btn" onClick={() => setT(IDENTITY)}>Alaphelyzet</button>
          <button type="button" className="btn btn-close" onClick={onClose}>Bezárás</button>
        </div>
      </div>
    </div>
  );
}
