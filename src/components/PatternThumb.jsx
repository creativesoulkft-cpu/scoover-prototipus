/**
 * Mini SVG előnézet egy mintáról – ugyanazt a PatternDefs renderelőt használja,
 * mint a fő vászon, így a bélyegkép garantáltan azt mutatja, ami a rollerre kerül.
 */
import { useId } from 'react';
import PatternDefs, { fillFor } from './PatternDefs.jsx';

const THUMB = { width: 96, height: 64 };

export default function PatternThumb({ pattern }) {
  const uid = useId();
  const defId = `thumb${uid}`;
  // a bélyegkép saját skálát kap, hogy a nagy csempék (camo, topo) is látszódjanak
  const scale = pattern.type === 'tile' ? Math.min(1, 140 / Math.max(pattern.tile.width, pattern.tile.height)) : 1;
  return (
    <svg viewBox={`0 0 ${THUMB.width} ${THUMB.height}`} className="pattern-thumb" aria-hidden="true">
      <defs>
        <PatternDefs pattern={pattern} defId={defId} transform={{ scale }} viewBox={THUMB} />
      </defs>
      <rect width={THUMB.width} height={THUMB.height} rx="6" fill={fillFor(pattern, defId)} />
    </svg>
  );
}
