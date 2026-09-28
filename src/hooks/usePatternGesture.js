/**
 * Közvetlen minta-mozgatás a képen – ahogy egy telefonos appban várnád:
 *   egy ujj / egér húzás  → eltolás
 *   két ujj csippentés     → méret
 *   két ujj forgatás       → forgatás
 *   egér görgő             → méret (Shift + görgő → forgatás)
 *   koppintás húzás nélkül → megmarad a darab ki/bekapcsolása (a path onClick)
 *
 * Csak "igazítás módban" aktív (a Stílus kártya kapcsolja be, mintaválasztás
 * után automatikusan) – így a képen a sima görgetés/koppintás nem zavarodik
 * össze a mintamozgatással, és a felhasználó tudja, hogy most a mintát fogja.
 *
 * A képernyő-elmozdulást az SVG saját egységeire váltjuk (getScreenCTM), ezért
 * a minta pontosan az ujjal együtt mozog, függetlenül a vászon méretétől.
 * A forgatás és a méret a vázlat közepe körül értendő (ugyanúgy, mint a
 * csúszkáknál – PatternDefs.transformString), így a két vezérlés felcserélhető.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const DRAG_THRESHOLD_PX = 4;
const MIN_SCALE = 0.25;
const MAX_SCALE = 3;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const norm360 = (a) => ((a % 360) + 360) % 360;

/**
 * @param {{ enabled: boolean, transform: {scale:number,rotate:number,dx:number,dy:number},
 *           onChange: (patch: object) => void, onGestureStart?: () => void,
 *           wheelRef?: import('react').RefObject<HTMLElement> }} p
 *   wheelRef: a vászon dobozának ref-je – a görgő-figyelőt natívan, NEM passzívan
 *   tesszük rá, mert a React onWheel passzív, és abból nem lehet az oldal
 *   görgetését letiltani (a minta nagyítása közben az oldal is elmozdulna).
 * @returns {{ handlers: object, active: boolean } | null}
 */
export function usePatternGesture({ enabled, transform, onChange, onGestureStart, wheelRef }) {
  const pointers = useRef(new Map());
  const base = useRef(null);
  const [active, setActive] = useState(false);
  const started = useRef(false);
  const tf = useRef(transform);
  tf.current = transform;

  const svgPoint = (svg, x, y) => {
    const m = svg.getScreenCTM();
    if (!m) return { x, y };
    const p = new DOMPoint(x, y).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const centerOf = (pts) => ({ x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length });
  const distOf = (pts) => Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  const angleOf = (pts) => (Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) * 180) / Math.PI;

  /** Ujj le-/felvételkor újraalapozzuk a gesztust a JELENLEGI transzformációról. */
  const rebase = useCallback(() => {
    const pts = [...pointers.current.values()];
    base.current = pts.length
      ? { count: pts.length, center: centerOf(pts), dist: pts.length >= 2 ? distOf(pts) : 0,
        angle: pts.length >= 2 ? angleOf(pts) : 0, tf: { ...tf.current }, moved: false }
      : null;
  }, []);

  const onPointerDown = useCallback((e) => {
    if (!enabled) return;
    if (e.button != null && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    rebase();
    if (pointers.current.size >= 2) {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
  }, [enabled, rebase]);

  const onPointerMove = useCallback((e) => {
    if (!enabled || !pointers.current.has(e.pointerId) || !base.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const b = base.current;
    const svg = e.currentTarget;

    if (b.count === 1) {
      const dxPx = pts[0].x - b.center.x, dyPx = pts[0].y - b.center.y;
      if (!b.moved && Math.hypot(dxPx, dyPx) < DRAG_THRESHOLD_PX) return;
      if (!b.moved) {
        b.moved = true;
        svg.setPointerCapture?.(e.pointerId);
        setActive(true);
        if (!started.current) { started.current = true; onGestureStart?.(); }
      }
      const p0 = svgPoint(svg, b.center.x, b.center.y);
      const p1 = svgPoint(svg, pts[0].x, pts[0].y);
      onChange({ dx: Math.round(b.tf.dx + (p1.x - p0.x)), dy: Math.round(b.tf.dy + (p1.y - p0.y)) });
      return;
    }

    if (b.count >= 2) {
      e.preventDefault();
      if (!b.moved) { b.moved = true; setActive(true); if (!started.current) { started.current = true; onGestureStart?.(); } }
      const c0 = svgPoint(svg, b.center.x, b.center.y);
      const c = centerOf(pts);
      const c1 = svgPoint(svg, c.x, c.y);
      const scale = clamp(b.tf.scale * (distOf(pts) / (b.dist || 1)), MIN_SCALE, MAX_SCALE);
      const rotate = norm360(b.tf.rotate + (angleOf(pts) - b.angle));
      onChange({
        scale: Math.round(scale * 100) / 100,
        rotate: Math.round(rotate),
        dx: Math.round(b.tf.dx + (c1.x - c0.x)),
        dy: Math.round(b.tf.dy + (c1.y - c0.y)),
      });
    }
  }, [enabled, onChange, onGestureStart]);

  const endPointer = useCallback((e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    rebase();
    if (!pointers.current.size) setActive(false);
  }, [rebase]);

  const onWheel = useCallback((e) => {
    if (!enabled) return;
    if (e.cancelable) e.preventDefault();
    if (!started.current) { started.current = true; onGestureStart?.(); }
    const t = tf.current;
    if (e.shiftKey) {
      onChange({ rotate: norm360(Math.round(t.rotate + (e.deltaY > 0 ? 5 : -5))) });
    } else {
      const factor = Math.exp(-e.deltaY * 0.0015);
      onChange({ scale: Math.round(clamp(t.scale * factor, MIN_SCALE, MAX_SCALE) * 100) / 100 });
    }
  }, [enabled, onChange, onGestureStart]);

  useEffect(() => {
    const el = wheelRef?.current;
    if (!enabled || !el) return undefined;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [enabled, wheelRef, onWheel]);

  return useMemo(() => (enabled ? {
    handlers: { onPointerDown, onPointerMove, onPointerUp: endPointer, onPointerCancel: endPointer },
    active,
  } : null), [enabled, onPointerDown, onPointerMove, endPointer, active]);
}
