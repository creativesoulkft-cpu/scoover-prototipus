/**
 * Felirat-forgatás: teljes kör (−180° … +180°) és egy "Megfordítás" gomb.
 *
 * A ±90° nem volt elég: a kormányoszlopon a felirat alapból a cső irányába
 * dől, és aki fentről lefelé olvashatót szeretne, annak 180°-kal kell
 * megfordítania – csúszkával ez pontatlan, ezért van rá külön gomb.
 */
import Slider from './Slider.jsx';

/** −180 < szög ≤ 180 */
export const normalizeAngle = (a) => {
  const r = ((((a + 180) % 360) + 360) % 360) - 180;
  return r === -180 ? 180 : r;
};

export default function LabelRotate({ value, onChange }) {
  return (
    <div className="label-rotate">
      <Slider label="Forgatás" value={value ?? 0} min={-180} max={180} step={1}
        onChange={onChange} format={(v) => `${v}°`} />
      <div className="label-rotate-actions">
        <button type="button" className="btn btn-mini" onClick={() => onChange(normalizeAngle((value ?? 0) + 180))}
          title="A felirat 180°-os megfordítása (fejjel lefelé ↔ olvasható)">⟲ Megfordítás 180°</button>
        <button type="button" className="btn btn-mini" onClick={() => onChange(normalizeAngle((value ?? 0) - 90))} aria-label="Forgatás −90°">−90°</button>
        <button type="button" className="btn btn-mini" onClick={() => onChange(normalizeAngle((value ?? 0) + 90))} aria-label="Forgatás +90°">+90°</button>
        {(value ?? 0) !== 0 && <button type="button" className="link" onClick={() => onChange(0)}>0°</button>}
      </div>
    </div>
  );
}
