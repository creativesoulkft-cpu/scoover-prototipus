/**
 * "Mit fóliázunk" – ZÓNÁS választás (nem egyenkénti darabok).
 *
 * Alapállapot: minden zóna kiválasztva, felül a nagy, bepipált
 * "Teljes fólia szett" sor. Amíg az aktív, a zónák halványítva látszanak
 * (kiválasztva, de nem hangsúlyosan), ár nélkül.
 *
 * Ha a vevő kivesz egy pipát: a szett-sor kikapcsol, a zónák teljes fényerőre
 * váltanak a saját árukkal, és a felső sor helyére a "Kérem egyben — spórolj
 * X Ft-ot" sor csúszik be, ami egy koppintással mindent visszakapcsol.
 * A kedvezmény tehát sosem tűnik el a képernyőről, csak átköltözik oda,
 * ahonnan visszakattintható.
 *
 * A taposófelület SZÁNDÉKOSAN nincs itt: külön anyag, külön tétel, saját
 * szekció (FootboardSection.jsx).
 *
 * Minden összeg a központi src/pricing.js-ből; a zónanevek a
 * src/data/zones.js-ből jönnek – itt nincs se ár, se elnevezés beégetve.
 */
import { formatHuf } from '../utils/format.js';

export default function ZoneSelector({
  zones,           // zonesForPieces() eredménye: az ezen a modellen létező zónák
  selectedIds,     // Set<zoneId>
  onToggleZone,    // (zoneId) => void
  onSelectAll,     // () => void  – "Teljes fólia szett" / "Kérem egyben"
  onClearAll,      // () => void  – "Törlés mind"
  prices,          // { [zoneId]: number }  – az aktuális modell/szint zónaárai
  kitPrice,        // a teljes szett ára
  listSum,         // a zónák külön-külön összege
  savings,         // listSum − kitPrice
  hoveredId,       // vászon ↔ lista kiemelés (darab-id)
  onHover,         // (pieceId|null) => void
  minimumOrder,    // { ok, message }
}) {
  const allSelected = zones.length > 0 && zones.every((z) => selectedIds.has(z.id));
  const noneSelected = zones.every((z) => !selectedIds.has(z.id));

  return (
    <div className="zone-selector" onMouseLeave={() => onHover?.(null)}>
      {allSelected ? (
        <label className="zone-kit-row active">
          <input type="checkbox" checked readOnly onClick={(e) => { e.preventDefault(); }} aria-label="Teljes fólia szett – kiválasztva" />
          <span className="zone-kit-text">
            <strong>Teljes fólia szett — {formatHuf(kitPrice)}</strong>
            <span className="muted small">
              külön darabonként {formatHuf(listSum)} — <em className="zone-savings">megspórolsz {formatHuf(savings)}-ot</em>
            </span>
          </span>
        </label>
      ) : (
        <button type="button" className="zone-kit-row rejoin" onClick={onSelectAll}>
          <span className="zone-kit-text">
            <strong>Kérem egyben — spórolj {formatHuf(savings)}-ot</strong>
            <span className="muted small">
              teljes fólia szett {formatHuf(kitPrice)} · egy koppintással minden zóna vissza
            </span>
          </span>
          <span className="zone-kit-arrow" aria-hidden="true">↺</span>
        </button>
      )}

      <ul className={`zone-list${allSelected ? ' dimmed' : ''}`}>
        {zones.map((z) => {
          const on = selectedIds.has(z.id);
          const hovered = hoveredId != null && z.pieceIds.includes(hoveredId);
          return (
            <li key={z.id} className={`zone-row${on ? '' : ' off'}${hovered ? ' hovered' : ''}`}
              onMouseEnter={() => onHover?.(z.pieceIds[0])}>
              <label className="zone-label">
                <input type="checkbox" checked={on} onChange={() => onToggleZone(z.id)} />
                <span className="zone-name">
                  <span>{z.name}</span>
                  <span className="muted small">{z.blurb}</span>
                </span>
              </label>
              {!allSelected && (
                <span className="zone-price">{formatHuf(prices[z.id] ?? 0)}</span>
              )}
            </li>
          );
        })}
      </ul>

      {!minimumOrder.ok && <p className="error small zone-min">{minimumOrder.message}</p>}
      {noneSelected && (
        <p className="muted small zone-min">Egyetlen zóna sincs kiválasztva – pipálj be legalább egyet, vagy kérd egyben.</p>
      )}

      <div className="zone-foot">
        <button type="button" className="link zone-clear" onClick={onClearAll} disabled={noneSelected}>
          Törlés mind
        </button>
      </div>
    </div>
  );
}
