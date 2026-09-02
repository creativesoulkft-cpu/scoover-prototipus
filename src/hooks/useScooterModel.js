import { useEffect, useState } from 'react';
import { getModelMeta } from '../data/models/index.js';

/** Már betöltött modellek gyorsítótára – egy modell csak egyszer töltődik le. */
const cache = new Map();

/**
 * Betölti (lazy import) a kiválasztott rollermodell geometriáját.
 * Csak az aktív modell adata van memóriában/aktív használatban; modellváltáskor
 * az előző eredmény a cache-ben marad, hogy a visszaváltás azonnali legyen.
 *
 * @param {string} modelId
 * @returns {{ model: object|null, loading: boolean, error: Error|null }}
 */
export function useScooterModel(modelId) {
  const [state, setState] = useState(() => ({
    model: cache.get(modelId) ?? null,
    loading: !cache.has(modelId),
    error: null,
  }));

  useEffect(() => {
    let cancelled = false;
    if (cache.has(modelId)) {
      setState({ model: cache.get(modelId), loading: false, error: null });
      return undefined;
    }
    const meta = getModelMeta(modelId);
    if (!meta) {
      setState({ model: null, loading: false, error: new Error(`Ismeretlen modell: ${modelId}`) });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    meta
      .load()
      .then((mod) => {
        cache.set(modelId, mod.default);
        if (!cancelled) setState({ model: mod.default, loading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ model: null, loading: false, error });
      });
    return () => {
      cancelled = true;
    };
  }, [modelId]);

  return state;
}
