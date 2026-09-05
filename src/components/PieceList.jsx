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
import { FOOTBOARD_EXTRA_HUF, getGroupPrice, getPartialPricingInfo, hasPrice } from '../pricing.js';
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

export default function PieceList({
  pieces, hoveredId, disabledPieces, enabledCount, onHover, onToggle, modelId, tier,
  selectedGroupIds, totalGroupCount, mode = 'pieces', onSelectFullKit, onSelectPieces,
}) {
  const isTouch = useIsTouch();
  const rows = buildRows(pieces);
  const groups = [...new Set(rows.map((r) => r.group))];
  const active = enabledCount ?? pieces.filter((p) => !disabledPieces?.has(p.id)).length;

  // Átláthatóság: a lenti soroknál mutatott ár mindig LISTAÁR (mintha csak azt
  // az egy darabot választanád) – a tényleges végösszeg ennél olcsóbb, mert a
  // kiválasztott darabok száma nő -> a kedvezmény is nő, a teljes kit áráig.
  // Ez a panel teszi láthatóvá, hogy MOST mennyi ez a kedvezmény, és mit
  // érnél el, ha a maradék darabokat is bepipálnád.
  const showDiscountInfo = hasPrice(modelId) && totalGroupCount > 0 && selectedGroupIds;
  const info = showDiscountInfo ? getPartialPricingInfo(modelId, tier, selectedGroupIds) : null;
  /** Mennyivel jár jobban a teljes kittel, mint ha ugyanezt darabonként venné. */
  const kitSavings = info?.kitPrice != null ? info.listSum - info.kitPrice : 0;
  const kitActive = mode === 'kit';

  return (
    <div className="piece-list" onMouseLeave={() => onHover(null)}>
      {info && (
        <div className="kit-choice" role="group" aria-label="Teljes kit vagy egyes darabok">
          <button type="button" className={`kit-btn${kitActive ? ' active' : ''}`}
            aria-pressed={kitActive} onClick={onSelectFullKit}>
            <strong>Teljes kit</strong>
            <span className="kit-price">{formatHuf(info.kitPrice)}</span>
            {kitSavings > 0 && <span className="kit-savings">−{formatHuf(kitSavings)}</span>}
          </button>
          <button type="button" className={`kit-btn${!kitActive ? ' active' : ''}`}
            aria-pressed={!kitActive} onClick={onSelectPieces}>
            <strong>Egyes darabok</strong>
            <span className="kit-price">{kitActive ? 'te válogatsz' : formatHuf(info.total)}</span>
            <span className="muted small">darabáras</span>
          </button>
        </div>
      )}

      <p className="muted small">
        {active} / {pieces.length} darab fóliázva ·{' '}
        {isTouch ? 'koppints egy sorra a ki-/bekapcsoláshoz' : 'kattints egy sorra a ki/bekapcsoláshoz'}
      </p>

      {info && info.count > 0 && !kitActive && (
        <div className="piece-discount-info">
          <div className="pdi-row">
            <span>{info.isFullKit ? 'Teljes kit ára' : `Darabár most (${info.count}/${info.totalGroups} darab)`}</span>
            <strong>{formatHuf(info.total)}</strong>
          </div>
          <div className="pdi-bar" title={`${info.count} / ${info.totalGroups} darab kiválasztva`}>
            <div className="pdi-bar-fill" style={{ width: `${Math.round((info.count / info.totalGroups) * 100)}%` }} />
          </div>
          <p className="muted small">
            {info.isFullKit
              ? `Az összes darabot választottad – ez a teljes kit ára (külön-külön ${formatHuf(info.listSum)} lenne).`
              : `A lenti árak listaárak (mintha csak azt az egyet választanád). Most kb. ${info.discountPct}% `
                + `kedvezményt kapsz rájuk – minél többet pipálsz be, annál nagyobbat, egészen a teljes kitig `
                + `(${formatHuf(info.kitPrice)}, ${info.maxDiscountPct}% kedvezmény a listaárhoz képest).`}
          </p>
        </div>
      )}

      {groups.map((g) => (
        <div key={g} className="piece-group">
          <h4>{GROUP_NAMES[g] ?? g}</h4>
          <ul>
            {rows.filter((r) => r.group === g).map((r) => {
              const off = r.memberIds.every((id) => disabledPieces?.has(id));
              const hovered = r.memberIds.includes(hoveredId);
              // Teljes kit módban a darab-listaár félrevezető lenne (nem azt fizeti),
              // ezért csak darabonkénti módban mutatjuk.
              const price = r.priceGroup && !kitActive ? getGroupPrice(modelId, tier, r.priceGroup) : null;
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
