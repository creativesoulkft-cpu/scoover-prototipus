/**
 * Húzható elválasztó az osztott (kép fent / vezérlők lent) mobil elrendezéshez.
 *
 * A felhasználó ujjal/egérrel átméretezheti a felosztást; elengedéskor a
 * legközelebbi rögzülő pozícióra ugrik (SPLIT_SNAPS). A tényleges méretet a
 * szülő tartja állapotban (App.jsx `splitPct` = a KÉP magassága százalékban),
 * mert ugyanezt az értéket állítja automatikusan a csúszka-húzás is.
 */
import { useRef } from 'react';

/** Rögzülő pozíciók a KÉP magasságára, %-ban. */
export const SPLIT_SNAPS = [
  { pct: 70, label: 'Nagy kép' },
  { pct: 45, label: 'Alap' },
  { pct: 25, label: 'Nagy panel' },
];
const MIN_PCT = 20;
const MAX_PCT = 78;

export const nearestSnap = (pct) =>
  SPLIT_SNAPS.reduce((best, s) => (Math.abs(s.pct - pct) < Math.abs(best - pct) ? s.pct : best), SPLIT_SNAPS[0].pct);

export default function SplitHandle({ pct, onChange, onDragStateChange, containerRef }) {
  const dragging = useRef(false);

  const pctFromY = (clientY) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box || box.height === 0) return pct;
    const raw = ((clientY - box.top) / box.height) * 100;
    return Math.min(MAX_PCT, Math.max(MIN_PCT, raw));
  };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragging.current = true;
    onDragStateChange(true);
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    e.preventDefault();
    onChange(pctFromY(e.clientY));
  };

  const endDrag = (e) => {
    if (!dragging.current) return;
    dragging.current = false;
    onDragStateChange(false);
    onChange(nearestSnap(pctFromY(e.clientY)));
  };

  /** Billentyűzettel is állítható: fel/le nyíl lépteti a rögzülő pozíciók között. */
  const onKeyDown = (e) => {
    const idx = SPLIT_SNAPS.findIndex((s) => s.pct === nearestSnap(pct));
    if (e.key === 'ArrowUp' && idx < SPLIT_SNAPS.length - 1) { e.preventDefault(); onChange(SPLIT_SNAPS[idx + 1].pct); }
    if (e.key === 'ArrowDown' && idx > 0) { e.preventDefault(); onChange(SPLIT_SNAPS[idx - 1].pct); }
  };

  return (
    <div
      className="split-handle"
      role="separator"
      aria-label="Előnézet és vezérlők aránya – húzd, vagy nyilakkal állítsd"
      aria-orientation="horizontal"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={MIN_PCT}
      aria-valuemax={MAX_PCT}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      onDoubleClick={() => onChange(45)}
    >
      <span className="split-grip" />
    </div>
  );
}
