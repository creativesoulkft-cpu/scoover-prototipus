/**
 * Egyszeri "tanító" buborék a képen, amikor az igazítás mód először
 * bekapcsol: elmondja, hogy a mintát közvetlenül a rolleren lehet mozgatni.
 * Az első gesztus vagy a ✕ eltünteti; utána nem jön elő (localStorage).
 */
import { useIsTouch } from '../hooks/useIsTouch.js';

export const COACH_KEY = 'scoover-coach-adjust-v1';

export function coachSeen() {
  try { return localStorage.getItem(COACH_KEY) === '1'; } catch { return false; }
}
export function markCoachSeen() {
  try { localStorage.setItem(COACH_KEY, '1'); } catch { /* privát mód */ }
}

export default function CanvasCoach({ onDismiss }) {
  const isTouch = useIsTouch();
  return (
    <div className="canvas-coach" role="status">
      <strong>Igazítsd a mintát a rolleren</strong>
      <span>
        {isTouch
          ? 'Húzd egy ujjal · csippentsd a mérethez · két ujjal forgasd'
          : 'Húzd az egérrel · görgő a mérethez · Shift + görgő forgat'}
      </span>
      <button type="button" className="canvas-coach-x" aria-label="Bezárás" onClick={onDismiss}>✕</button>
    </div>
  );
}
