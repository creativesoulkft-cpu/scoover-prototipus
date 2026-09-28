/**
 * Munkalap (job sheet) – egy PNG a nyomdának és az ügyfélszolgálatnak:
 * mi készül, milyen darabok, milyen anyagból, hova, figyelmeztetésekkel.
 * SVG-ből rendereljük (resvg), így a szöveg és a táblázat éles marad.
 */
import { Resvg } from '@resvg/resvg-js';
import { config } from '../config.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export function renderJobSheet(manifest, { previewPng } = {}) {
  const W = 1240;
  const rows = [];
  let y = 40;
  const line = (text, { size = 16, weight = 400, color = '#111', x = 40, mono = false } = {}) => {
    rows.push(`<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" font-family="${mono ? 'DejaVu Sans Mono, monospace' : 'DejaVu Sans, Arial, sans-serif'}">${esc(text)}</text>`);
    y += size * 1.55;
  };
  const gap = (n = 10) => { y += n; };

  line('SCOOVER – NYOMDAI MUNKALAP', { size: 26, weight: 700 });
  line(`Terv: ${manifest.designId}   ·   Munka: ${manifest.jobId}   ·   ${manifest.orderRef ? `Rendelés: ${manifest.orderRef}   ·   ` : ''}${new Date(manifest.createdAt).toLocaleString('hu-HU')}`, { size: 14, color: '#444', mono: true });
  gap(6);
  line(`${manifest.model.name} · ${manifest.year ?? 'évjárat nélkül'} · szint: ${manifest.tier.toUpperCase()}${manifest.mixed ? ' (kevert design)' : ''}`, { size: 18, weight: 700 });
  line(`Felrakás: ${manifest.installation === 'none' ? 'nincs (postázás)' : manifest.installation} · Taposó: ${manifest.footboard ? 'IGEN (csúszásgátló anyag)' : 'nem'} · Nézet, amiben tervezték: ${manifest.view}`, { size: 14, color: '#333' });
  gap(8);

  line('Zónák és minták', { size: 16, weight: 700 });
  for (const z of manifest.zones) {
    line(`• ${z.name}: ${z.patternName}${z.tier === 'solid' && z.vinylColor ? ` (vinyl szín ${z.vinylColor})` : ''} · ${z.tier.toUpperCase()}`, { size: 14, x: 56 });
  }
  if (manifest.footboard) line(`• Taposófelület: ${manifest.footboard.patternName} · ${manifest.footboard.tier.toUpperCase()} · csúszásgátló anyag`, { size: 14, x: 56 });
  gap(8);

  line('Darabok (kifutóval, mm)', { size: 16, weight: 700 });
  const head = ['Darab', 'Méret (mm)', 'Db', 'Anyag / minta', 'Megj.'];
  const colX = [56, 420, 560, 620, 900];
  rows.push(head.map((h, i) => `<text x="${colX[i]}" y="${y}" font-size="13" font-weight="700" fill="#555" font-family="DejaVu Sans, Arial, sans-serif">${esc(h)}</text>`).join(''));
  y += 22;
  for (const p of manifest.pieces) {
    const cells = [
      `${p.id} – ${p.name}`,
      `${Math.round(p.widthMm)} × ${Math.round(p.heightMm)}`,
      String(p.copies.length),
      p.printable ? `nyomat: ${p.patternName}` : `vinyl ${p.vinylColor ?? ''} (csak vágás)`,
      [p.dpiEffective ? `${p.dpiEffective} dpi` : '', p.footboard ? 'csúszásgátló' : '', p.mirror ? 'bal/jobb tükör' : ''].filter(Boolean).join(' · '),
    ];
    rows.push(cells.map((c, i) => `<text x="${colX[i]}" y="${y}" font-size="13" fill="#111" font-family="DejaVu Sans, Arial, sans-serif">${esc(c)}</text>`).join(''));
    y += 21;
  }
  gap(10);
  line(`Lap: ${Math.round(manifest.sheet.rollWidthMm)} mm tekercs × ${Math.round(manifest.sheet.lengthMm)} mm hossz · ${manifest.sheet.pieceCount} darab · kifutó ${manifest.bleedMm} mm · vágóvonal: CutContour spot-szín (PDF)`, { size: 14, color: '#333' });
  gap(8);
  if (manifest.warnings.length) {
    line('FIGYELMEZTETÉSEK', { size: 16, weight: 700, color: '#b3261e' });
    for (const w of manifest.warnings) line(`! ${w}`, { size: 13, color: '#b3261e', x: 56 });
  } else {
    line('Nincs figyelmeztetés – gyártásra kész.', { size: 14, color: '#1b7f3b', weight: 700 });
  }
  gap(10);
  line(`Fájlok: ${manifest.files.pdf} · ${manifest.files.manifest}`, { size: 12, color: '#666', mono: true });

  const H = y + 40;
  const preview = previewPng
    ? `<image x="${W - 380}" y="40" width="340" height="240" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${previewPng.toString('base64')}"/>
       <rect x="${W - 380}" y="40" width="340" height="240" fill="none" stroke="#ccc"/>`
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#fff"/>
${preview}
${rows.join('\n')}
</svg>`;
  const r = new Resvg(svg, { font: { fontDirs: [config.print.fontsDir], loadSystemFonts: true, defaultFontFamily: 'DejaVu Sans' } });
  return r.render().asPng();
}
