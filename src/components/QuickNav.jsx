/**
 * Rögzített gyorsnavigációs sáv az 5 főszekcióhoz. Egy gomb megnyitja az
 * adott szekciót (egyszerre csak egy lehet nyitva – a szülő intézi), és
 * odagörget. A nyitott szekció gombja kiemelt.
 *
 * A szekciók listája és sorrendje EGY helyen, itt – az App.jsx ugyanezeket az
 * id-kat használja a kártyáknál.
 */
import { useRef } from 'react';
import { useReportHeight } from '../hooks/useReportHeight.js';

export const SECTIONS = [
  { id: 'section-model', label: 'A rollered' },
  { id: 'section-style', label: 'Stílus' },
  { id: 'section-zones', label: 'Mit fóliázunk' },
  { id: 'section-footboard', label: 'Taposó' },
  { id: 'section-delivery', label: 'Felrakás' },
];

export default function QuickNav({ activeId, onSelect }) {
  const ref = useRef(null);
  useReportHeight(ref, '--quick-nav-h');
  return (
    <nav className="quick-nav" aria-label="Gyorsnavigáció" ref={ref}>
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`quick-nav-btn${activeId === s.id ? ' active' : ''}`}
          aria-current={activeId === s.id ? 'true' : undefined}
          onClick={() => onSelect(s.id)}
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}
