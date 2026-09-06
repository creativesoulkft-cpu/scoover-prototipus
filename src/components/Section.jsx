/**
 * Egy főszekció kártyája (akkordeon-elem).
 *
 * - Mindig látszik: a cím, alatta EGY soros magyarázat ("mit találsz itt"),
 *   a fejléc jobb szélén az aktuális választás rövid összefoglalója, és egy
 *   ⓘ ikon, ami koppintásra 2-3 mondatos bővebb magyarázatot nyit.
 * - Egyszerre csak egy főszekció van nyitva (a nyitást a szülő vezérli:
 *   `open` + `onToggle`); a nyitott szekció fejléce a görgetés közben a panel
 *   tetejére tapad (position: sticky – a `--section-top` CSS-változó adja,
 *   mi van fölötte: asztalin az ársáv, mobilon a gyorsnavigáció).
 * - Az `id` a gyorsnavigáció célpontja (QuickNav).
 */
import { useState } from 'react';

export default function Section({ id, title, blurb, info, summary, open, onToggle, children, footer }) {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <section id={id} className={`card${open ? ' open' : ''}`}>
      <div className="card-head">
        <button
          type="button"
          className="card-toggle"
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={onToggle}
        >
          <span className="card-chevron" aria-hidden="true">▸</span>
          <span className="card-titles">
            <span className="card-title">{title}</span>
            <span className="card-blurb">{blurb}</span>
          </span>
          {summary && <span className="card-summary">{summary}</span>}
        </button>
        {info && (
          <button
            type="button"
            className={`card-info${infoOpen ? ' active' : ''}`}
            aria-expanded={infoOpen}
            aria-label={`Bővebben: ${title}`}
            title="Bővebb magyarázat"
            onClick={() => setInfoOpen((v) => !v)}
          >
            i
          </button>
        )}
      </div>

      {infoOpen && info && (
        <div className="card-infobox" role="note">
          {info}
        </div>
      )}

      {open && (
        <div id={`${id}-body`} className="card-body">
          {children}
          {footer && <div className="card-footer">{footer}</div>}
        </div>
      )}
    </section>
  );
}
