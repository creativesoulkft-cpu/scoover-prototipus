/**
 * "Taposófelület" – külön tétel, külön tervezőnézet.
 *
 * Alapból nincs kiválasztva, és a "Teljes fólia szett" sem tartalmazza,
 * mert kültéri csúszásgátló anyagból készül (más anyag, más gyártás, más ár).
 * Bekapcsolva megjelenik a "Taposófelület tervezése" gomb, ami a nagy
 * előnézetet a taposó felülnézeti szerkesztőjére váltja (FootboardEditor.jsx).
 */
import { formatHuf } from '../utils/format.js';

export default function FootboardSection({ available, included, onIncludedChange, price, onDesign, editing }) {
  if (!available) {
    return <p className="muted small">Ehhez a modellhez nincs külön taposófelület-tétel.</p>;
  }
  return (
    <div className="controls">
      <label className={`zone-kit-row footboard-row${included ? ' active' : ''}`}>
        <input type="checkbox" checked={included} onChange={(e) => onIncludedChange(e.target.checked)} />
        <span className="zone-kit-text">
          <strong>Taposófelület — +{formatHuf(price)}</strong>
          <span className="muted small">Kültéri csúszásgátló anyagból készül, ezért külön tétel.</span>
        </span>
      </label>

      {included && (
        <button type="button" className={`btn btn-design${editing ? ' active' : ''}`} onClick={onDesign}>
          {editing ? '✓ A taposófelületet tervezed' : '✎ Taposófelület tervezése'}
        </button>
      )}
      {included && !editing && (
        <p className="muted small">
          A tervezőben saját mintát vagy képet, feliratot, nagyítást, forgatást és eltolást
          állíthatsz – csak erre a felületre, a roller többi részétől függetlenül.
        </p>
      )}
    </div>
  );
}
