/**
 * Rögzített gyorsnavigációs sáv: Minta / Feliratok / Darabok a megfelelő
 * oldalsáv-szekcióhoz görget (smooth scroll, nyitja is, ha zárva volt); a
 * Taposó gomb ehelyett a taposó-szerkesztő nézetet kapcsolja be/ki – lásd
 * FootboardEditor.jsx. A görgetéssel elért szekció gombja automatikusan
 * kiemelődik (useScrollSpy).
 */
import { useScrollSpy } from '../hooks/useScrollSpy.js';

const SECTIONS = [
  { id: 'section-minta', label: 'Minta' },
  { id: 'section-feliratok', label: 'Feliratok' },
  { id: 'section-darabok', label: 'Darabok' },
];

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.tagName === 'DETAILS') el.open = true;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function QuickNav({ footboardActive, onToggleFootboard, footboardAvailable }) {
  const activeId = useScrollSpy(SECTIONS.map((s) => s.id));

  return (
    <nav className="quick-nav" aria-label="Gyorsnavigáció">
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`quick-nav-btn${activeId === s.id && !footboardActive ? ' active' : ''}`}
          onClick={() => scrollToSection(s.id)}
        >
          {s.label}
        </button>
      ))}
      {footboardAvailable && (
        <button
          type="button"
          className={`quick-nav-btn footboard${footboardActive ? ' active' : ''}`}
          title="Taposófelület tervezése"
          onClick={onToggleFootboard}
        >
          Taposó
        </button>
      )}
    </nav>
  );
}
