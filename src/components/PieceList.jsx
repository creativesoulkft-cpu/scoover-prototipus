/**
 * Darablista: mutatja a modell összes fóliázható darabját, kiemeli a vászon
 * felett éppen mutatott darabot, és kattintásra ki/be kapcsolja a fóliázást.
 */
const GROUP_NAMES = { front: 'Első rész', deck: 'Dekk', rear: 'Hátsó rész' };

export default function PieceList({ pieces, hoveredId, disabledPieces, onHover, onToggle }) {
  const groups = [...new Set(pieces.map((p) => p.group))];
  const active = pieces.length - (disabledPieces?.size ?? 0);
  return (
    <div className="piece-list" onMouseLeave={() => onHover(null)}>
      <p className="muted small">{active} / {pieces.length} darab fóliázva · kattints egy darabra a ki/bekapcsoláshoz</p>
      {groups.map((g) => (
        <div key={g} className="piece-group">
          <h4>{GROUP_NAMES[g] ?? g}</h4>
          <ul>
            {pieces.filter((p) => p.group === g).map((p) => {
              const off = disabledPieces?.has(p.id);
              return (
                <li key={p.id}
                  className={`${hoveredId === p.id ? 'hovered' : ''}${off ? ' off' : ''}`}
                  onMouseEnter={() => onHover(p.id)}
                  onClick={() => onToggle(p.id)}
                >
                  <span className="dot" />{p.name}
                  {p.standingSurface && <span className="standing-badge" title="Külön anyag- és minta-döntési pont">Csúszásgátló</span>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
