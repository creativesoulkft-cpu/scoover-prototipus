/**
 * Egy felirat tényleges betűtípusa/színe – ugyanez a logika kell a fő
 * roller feliratainak (App.jsx renderLabels) ÉS a taposó-szerkesztő önálló
 * feliratának (FootboardEditor.jsx) is, ezért egy helyen.
 */
import { getFontOption } from '../data/fonts.js';

/** @param {{fontId?:string}} label @param {object} categoryFont - a kategória alapértelmezett betűtípusa */
export function resolveLabelFont(label, categoryFont) {
  if (label.fontId && label.fontId !== 'auto') {
    return getFontOption(label.fontId) ?? categoryFont;
  }
  return categoryFont;
}

/** @param {{colorMode?:string, customColor?:string}} label @param {string} autoColor - a minta világossága alapján számolt fehér/fekete */
export function resolveLabelColor(label, autoColor) {
  if (label.colorMode === 'white') return '#ffffff';
  if (label.colorMode === 'black') return '#111111';
  if (label.colorMode === 'custom') return label.customColor || autoColor;
  return autoColor;
}
