/**
 * Bélyegkép egy mintáról. Raszteres textúránál a kis (256 px) előnézeti képet
 * mutatja, hogy a galéria ne töltse le a teljes méretű csempéket; minden más
 * típusnál ugyanazt a PatternDefs renderelőt használja, mint a fő vászon.
 */
import { useId } from 'react';
import PatternDefs, { fillFor } from './PatternDefs.jsx';
import { assetUrl } from '../utils/assets.js';

const THUMB = { width: 96, height: 64 };

export default function PatternThumb({ pattern }) {
  const uid = useId();
  const defId = `thumb${uid}`;

  if (pattern.type === 'image-tile') {
    return <img className="pattern-thumb" src={assetUrl(pattern.thumb ?? pattern.src)} alt="" loading="lazy" />;
  }
  if (pattern.type === 'image') {
    return <img className="pattern-thumb" src={pattern.href} alt="" />;
  }
  // a bélyegkép saját skálát kap, hogy a nagy csempék is látszódjanak
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
