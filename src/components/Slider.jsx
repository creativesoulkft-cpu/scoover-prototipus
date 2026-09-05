/**
 * Feliratos csúszka – közös a minta-illesztésnél, a feliratkártyáknál és a
 * taposó-szerkesztőnél.
 *
 * Húzás közben az aktuális érték egy buborékban jelenik meg a csúszka FÖLÖTT,
 * mert mobilon a felhasználó ujja pont a hüvelyket (és így a beépített értéket)
 * takarja ki. A buborék a hüvelyk fölé pozicionálódik: a szélső értékeknél a
 * hüvelyk nem a sáv legszélén áll, ezért a nyers százalékot a hüvelyk
 * szélességével korrigáljuk.
 *
 * Az osztott nézetben a csúszka megfogása automatikusan felnagyítja az
 * előnézetet – azt az App.jsx globális pointer-figyelője intézi (bármely
 * `input[type=range]`-re), így ide nem kell külön prop.
 */
import { useState } from 'react';

const THUMB_PX = 16;

export default function Slider({ label, value, min, max, step, onChange, format }) {
  const [active, setActive] = useState(false);
  const ratio = max === min ? 0 : (value - min) / (max - min);
  const text = format ? format(value) : value;

  return (
    <label className={`slider${active ? ' active' : ''}`}>
      <span>{label}<em>{text}</em></span>
      <span className="slider-track">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerDown={() => setActive(true)}
          onPointerUp={() => setActive(false)}
          onPointerCancel={() => setActive(false)}
          onBlur={() => setActive(false)}
        />
        {active && (
          <output
            className="slider-bubble"
            style={{ left: `calc(${ratio * 100}% + ${(0.5 - ratio) * THUMB_PX}px)` }}
          >
            {text}
          </output>
        )}
      </span>
    </label>
  );
}
