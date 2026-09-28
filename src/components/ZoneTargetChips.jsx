/**
 * DESIGN-KEVERÉS – "Melyik részre?" chipsor a Stílus kártya tetején.
 *
 *   [Az egész roller]  [Dekk oldala •]  [Akkuház…]  [Kormányoszlop]  …
 *
 * A galériában választott minta és az igazítás arra a célra megy, ami itt ki
 * van jelölve. "Az egész roller" = az alap réteg; ha ezt választva vesz
 * mintát a vevő, a zónánkénti eltérések törlődnek (az egész roller egyforma
 * lesz). Egy zóna chipje mellett a • jelzi, hogy annak saját, eltérő mintája
 * van; a ✕ visszaállítja az alapra.
 */
export const TARGET_ALL = 'all';

export default function ZoneTargetChips({ zones, target, onTarget, overriddenIds, onResetZone, onHover }) {
  return (
    <div className="zone-target" onMouseLeave={() => onHover?.(null)}>
      <div className="zone-target-head">
        <strong>Melyik részre?</strong>
        <span className="muted small">Zónánként más minta is mehet – keverd bátran.</span>
      </div>
      <div className="chip-row">
        <button type="button" className={`chip${target === TARGET_ALL ? ' active' : ''}`}
          onClick={() => onTarget(TARGET_ALL)}>
          Az egész roller
        </button>
        {zones.map((z) => {
          const own = overriddenIds.has(z.id);
          return (
            <span key={z.id} className={`chip chip-zone${target === z.id ? ' active' : ''}${own ? ' own' : ''}`}
              onMouseEnter={() => onHover?.(z.pieceIds[0])}>
              <button type="button" className="chip-zone-btn" onClick={() => onTarget(z.id)}
                title={own ? `${z.name}: saját mintája van` : z.name}>
                {z.name}{own && <span className="chip-dot" aria-label="saját minta">•</span>}
              </button>
              {own && (
                <button type="button" className="chip-x" title="Vissza az egész roller mintájára"
                  aria-label={`${z.name}: vissza az alapmintára`} onClick={() => onResetZone(z.id)}>✕</button>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
