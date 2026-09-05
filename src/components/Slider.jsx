/** Egyszerű, feliratos csúszka – közös a minta-illesztésnél, a feliratkártyáknál és a taposó-szerkesztőnél. */
export default function Slider({ label, value, min, max, step, onChange, format }) {
  return (
    <label className="slider">
      <span>{label}<em>{format ? format(value) : value}</em></span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
