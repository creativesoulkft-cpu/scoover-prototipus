/**
 * Darablista: mutatja a modell összes fóliázható darabját, kiemeli a vászon
 * felett éppen mutatott darabot, és kattintásra/koppintásra ki/be kapcsolja
 * a fóliázást.
 *
 * A `footboard: true` darab (taposófelület) külön kiemelést kap: más anyagból
 * (kültéri csúszásgátló fólia) készül, és a ki/bekapcsolása egyben a
 * +6 900 Ft-os extrát is kapcsolja – lásd src/pricing.js.
 */
import { useIsTouch } from '../hooks/useIsTouch.js';
import { FOOTBOARD_EXTRA_HUF } from '../pricing.js';
import { formatHuf } from '../utils/format.js';

const GROUP_NAMES = { front: 'Első rész', deck: 'Dekk', rear: 'Hátsó rész' };

export default function PieceList({ pieces, hoveredId, disabledPieces, enabledCount, onHover, onToggle }) {
  const isTouch = useIsTouch();
  const groups = [...new Set(pieces.map((p) => p.group))];
  const active = enabledCount ?? pieces.filter((p) => !disabledPieces?.has(p.id)).length;

  return (
    <div className="piece-list" onMouseLeave={() => onHover(null)}>
      <p className="muted small">
        {active} / {pieces.length} darab fóliázva ·{' '}
        {isTouch ? 'koppints egy darabra a ki-/bekapcsoláshoz' : 'kattints egy darabra a ki/bekapcsoláshoz'}
      </p>
      {groups.map((g) => (
        <div key={g} className="piece-group">
          <h4>{GROUP_NAMES[g] ?? g}</h4>
          <ul>
            {pieces.filter((p) => p.group === g).map((p) => {
              const off = disabledPieces?.has(p.id);
              return (
                <li key={p.id}
                  className={`${hoveredId === p.id ? 'hovered' : ''}${off ? ' off' : ''}${p.footboard ? ' footboard' : ''}`}
                  onMouseEnter={() => onHover(p.id)}
                  onClick={() => onToggle(p.id)}
                  title={p.footboard ? `Kültéri csúszásgátló anyag – külön extra (+${formatHuf(FOOTBOARD_EXTRA_HUF)})` : undefined}
                >
                  <span className="dot" />
                  <span className="piece-name">{p.name}</span>
                  {p.footboard && <span className="premium-pill">Prémium csúszásgátló</span>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
