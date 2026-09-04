/**
 * Darablista: árcsoportonként (nem fizikai darabonként!) egy sor – egy néven
 * (pl. "Dekk oldala") több fizikai darab-azonosító is szerepelhet
 * (pieces[].priceGroup), ezek egyetlen közös árral és egyetlen közös
 * be-/kikapcsoló gombbal viselkednek (lásd src/pricing.js PRICE_GROUPS).
 *
 * A taposófelület (footboard: true) ettől független sort kap, saját
 * kiemeléssel és a +6 900 Ft-os extrával. Az árcsoportba nem tartozó,
 * egyéb darabok (pl. a Master "Első sárvédő"-je) saját, ár nélküli sort
 * kapnak – ezek egyelőre csak vizuálisan ki/bekapcsolhatók.
 */
import { useIsTouch } from '../hooks/useIsTouch.js';
import { FOOTBOARD_EXTRA_HUF, getGroupPrice } from '../pricing.js';
import { formatHuf } from '../utils/format.js';

const GROUP_NAMES = { front: 'Első rész', deck: 'Dekk', rear: 'Hátsó rész' };

/** Egyetlen darab helyett árcsoportonkénti sorokat épít – lásd fájl fejléce. */
function buildRows(pieces) {
  const seen = new Set();
  const rows = [];
  for (const p of pieces) {
    if (p.footboard) {
      rows.push({ key: p.id, name: p.name, group: p.group, memberIds: [p.id], footboard: true });
      continue;
    }
    if (p.priceGroup) {
      if (seen.has(p.priceGroup)) continue;
      seen.add(p.priceGroup);
      const members = pieces.filter((q) => q.priceGroup === p.priceGroup);
      rows.push({
        key: p.priceGroup, name: members[0].name, group: p.group,
        memberIds: members.map((m) => m.id), priceGroup: p.priceGroup,
      });
      continue;
    }
    rows.push({ key: p.id, name: p.name, group: p.group, memberIds: [p.id] });
  }
  return rows;
}

export default function PieceList({ pieces, hoveredId, disabledPieces, enabledCount, onHover, onToggle, modelId, tier }) {
  const isTouch = useIsTouch();
  const rows = buildRows(pieces);
  const groups = [...new Set(rows.map((r) => r.group))];
  const active = enabledCount ?? pieces.filter((p) => !disabledPieces?.has(p.id)).length;

  return (
    <div className="piece-list" onMouseLeave={() => onHover(null)}>
      <p className="muted small">
        {active} / {pieces.length} darab fóliázva ·{' '}
        {isTouch ? 'koppints egy sorra a ki-/bekapcsoláshoz' : 'kattints egy sorra a ki/bekapcsoláshoz'}
      </p>
      {groups.map((g) => (
        <div key={g} className="piece-group">
          <h4>{GROUP_NAMES[g] ?? g}</h4>
          <ul>
            {rows.filter((r) => r.group === g).map((r) => {
              const off = r.memberIds.every((id) => disabledPieces?.has(id));
              const hovered = r.memberIds.includes(hoveredId);
              const price = r.priceGroup ? getGroupPrice(modelId, tier, r.priceGroup) : null;
              return (
                <li key={r.key}
                  className={`${hovered ? 'hovered' : ''}${off ? ' off' : ''}${r.footboard ? ' footboard' : ''}`}
                  onMouseEnter={() => onHover(r.memberIds[0])}
                  onClick={() => onToggle(r.memberIds[0])}
                  title={r.footboard ? `Kültéri csúszásgátló anyag – külön extra (+${formatHuf(FOOTBOARD_EXTRA_HUF)})` : undefined}
                >
                  <span className="dot" />
                  <span className="piece-name">{r.name}{r.memberIds.length > 1 && ` (${r.memberIds.length} darab)`}</span>
                  {r.footboard && <span className="premium-pill">Prémium csúszásgátló</span>}
                  {price != null && <span className="piece-price">{formatHuf(price)}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
