// Akkumulátor terheléses teszt jegyzőkönyv – HTML sablon.
// Bemenet: a jegyzőkönyv JSON adatai + beágyazandó képek (data URI vagy null).

const PURPLE = '#7A1F4E';
const GREEN = '#1FC500';

export function fmtNum(n, decimals = 2) {
  return n.toLocaleString('hu-HU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
export function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${y}. ${m}. ${d}.`;
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function durationToHours(hms) {
  const [h, m, s] = hms.split(':').map(Number);
  return h + m / 60 + s / 3600;
}
function durationHuman(hms) {
  const [h, m, s] = hms.split(':').map(Number);
  return `${h} óra ${m} perc ${s} mp`;
}

export function grade(soh) {
  if (soh >= 90) return { label: 'Kiváló', color: '#1a8f2a', text: 'Új állapothoz közeli kapacitás.' };
  if (soh >= 80) return { label: 'Jó', color: '#4caf22', text: 'Egészséges, használatra alkalmas akkumulátor, tartalékkal.' };
  if (soh >= 70) return { label: 'Megfelelő', color: '#e0a800', text: 'Normál használatra alkalmas, hatótáv érezhetően csökkent.' };
  if (soh >= 60) return { label: 'Gyenge', color: '#e8641b', text: 'Jelentős kapacitásvesztés, cella-felújítás mérlegelendő.' };
  return { label: 'Csere javasolt', color: '#c62828', text: 'Az akkumulátor elérte élettartama végét.' };
}

export function derive(data) {
  const b = data.vehicle.battery;
  const t = data.test;
  const hours = durationToHours(t.duration);
  // egy tizedesre kerekítve, hogy a minősítés a kijelzett értékkel legyen összhangban
  const soh = Math.round((t.dischargedAh / b.nominalAh) * 1000) / 10;
  const avgCurrent = t.dischargedAh / hours;
  const estWh = t.dischargedAh * b.avgVoltage;
  const cRate = avgCurrent / b.nominalAh;
  return { hours, soh, avgCurrent, estWh, cRate, grade: grade(soh) };
}

export function render(data, assets) {
  const d = derive(data);
  const b = data.vehicle.battery;
  const t = data.test;
  const s = data.service;
  const g = d.grade;

  const logo = assets.logoDataUri
    ? `<img class="logo" src="${assets.logoDataUri}" alt="Whoosh elektromos roller">`
    : `<div class="logo logo-text">Whoosh</div>`;

  const photoBlock = assets.photoDataUri
    ? `<figure class="photo">
         <img src="${assets.photoDataUri}" alt="A tesztkészülék kijelzője a mérés végén">
         <figcaption>1. ábra – A tesztkészülék kijelzője a mérés lezárásakor (eredeti, szerkesztetlen felvétel).</figcaption>
       </figure>`
    : `<figure class="photo">
         <div class="lcd-bezel"><div class="lcd">${t.displayLines.map(l => `<div>${esc(l)}</div>`).join('')}</div></div>
         <figcaption>1. ábra – A tesztkészülék kijelzőjén a mérés lezárásakor rögzített értékek (a kijelzőről készült fotó átirata).</figcaption>
       </figure>`;

  const frameNo = data.vehicle.frameNo ? esc(data.vehicle.frameNo) : '<span class="fill">&nbsp;</span>';
  const technician = data.technician ? esc(data.technician) : '';

  // SOH skála: 50–100% tartomány
  const sohPct = Math.max(0, Math.min(100, ((d.soh - 50) / 50) * 100));

  const footer = (page) => `
    <footer>
      <div class="foot-left">
        <strong>${esc(s.name)}</strong> · ${esc(s.address)} · Tel.: ${esc(s.phone)} · ${esc(s.email)} · ${esc(s.web)}
      </div>
      <div class="foot-right">${esc(data.docId)} · ${page}/2. oldal</div>
    </footer>`;

  return `<!doctype html>
<html lang="hu">
<head>
<meta charset="utf-8">
<title>Akkumulátor teszt jegyzőkönyv – ${esc(data.docId)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: "Liberation Sans", Arial, Helvetica, "DejaVu Sans", sans-serif;
    color: #1d1d1f; font-size: 10.2pt; line-height: 1.38;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .page {
    width: 210mm; height: 297mm; padding: 13mm 15mm 20mm 15mm;
    position: relative; overflow: hidden; page-break-after: always; background: #fff;
  }
  .page:last-child { page-break-after: auto; }

  header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8mm;
           border-bottom: 2.2pt solid ${PURPLE}; padding-bottom: 4mm; }
  .logo { width: 50mm; height: auto; display: block; }
  .logo-text { font-size: 26pt; font-weight: 700; color: ${PURPLE}; }
  .brand-line { font-size: 8.4pt; color: #555; margin-top: 1.5mm; }
  .title { text-align: right; }
  .title h1 { margin: 0; font-size: 17pt; letter-spacing: .04em; color: ${PURPLE}; text-transform: uppercase; line-height: 1.15; }
  .title h2 { margin: 1mm 0 0; font-size: 11pt; font-weight: 400; color: #444; }
  .meta { margin-top: 2.5mm; font-size: 9pt; color: #333; }
  .meta b { color: #000; }

  h3 { font-size: 10.5pt; text-transform: uppercase; letter-spacing: .06em; color: ${PURPLE};
       margin: 4.5mm 0 1.8mm; padding-bottom: 1mm; border-bottom: .6pt solid #d9c6d1; }
  h3 .num { display: inline-block; min-width: 6mm; color: ${GREEN}; }

  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 7mm; }
  table.kv { width: 100%; border-collapse: collapse; }
  table.kv td { padding: 1.1mm 0; vertical-align: top; border-bottom: .4pt solid #ececec; }
  table.kv td:first-child { width: 38%; color: #666; font-size: 9pt; }
  table.kv td:last-child { font-weight: 600; }
  .fill { display: inline-block; min-width: 45mm; border-bottom: .6pt solid #888; }

  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; margin-top: 3mm; }
  .kpi { border: .8pt solid #e2d5dc; border-top: 3pt solid ${PURPLE}; border-radius: 1.5mm; padding: 2.2mm 3mm 1.8mm; background: #fbf8fa; }
  .kpi.hero { border-top-color: ${GREEN}; background: #f3fbef; }
  .kpi .l { font-size: 8pt; color: #666; text-transform: uppercase; letter-spacing: .05em; }
  .kpi .v { font-size: 17pt; font-weight: 700; color: ${PURPLE}; margin-top: .8mm; line-height: 1.1; }
  .kpi.hero .v { color: #1a7f1a; }
  .kpi .u { font-size: 9pt; font-weight: 400; color: #555; }
  .kpi .s { font-size: 8pt; color: #666; margin-top: 1mm; }

  .evidence { display: grid; grid-template-columns: 78mm 1fr; gap: 6mm; align-items: start; margin-top: 2mm; }
  figure.photo { margin: 0; }
  figure.photo img { width: 100%; max-height: 92mm; object-fit: cover; object-position: center 40%; border-radius: 1.5mm; border: .6pt solid #ccc; display: block; }
  figcaption { font-size: 8pt; color: #555; margin-top: 1.5mm; line-height: 1.3; }
  .lcd-bezel { background: #e9e9e6; border: .8pt solid #bbb; border-radius: 2mm; padding: 5mm 5mm; }
  .lcd { background: #1633e6; color: #8ff7ff; font-family: "DejaVu Sans Mono", "Liberation Mono", monospace;
         font-size: 12.5pt; line-height: 1.45; padding: 3.5mm 4mm; border: 2.2pt solid #111; border-radius: 1mm;
         letter-spacing: .04em; white-space: pre; text-shadow: 0 0 1.5px #b8fbff; }
  table.read { width: 100%; border-collapse: collapse; font-size: 8.9pt; }
  table.read th { text-align: left; background: ${PURPLE}; color: #fff; padding: 1.3mm 2mm; font-size: 8.4pt; text-transform: uppercase; letter-spacing: .05em; }
  table.read td { padding: 1.1mm 2mm; border-bottom: .5pt solid #e3e3e3; vertical-align: top; }
  table.read td.k { color: #555; width: 34%; }
  table.read td.v { font-weight: 600; }
  table.read tr.total td { background: #f3fbef; font-weight: 700; }
  .small { font-size: 8.3pt; color: #666; }

  .verdict { display: grid; grid-template-columns: 1fr 52mm; gap: 6mm; align-items: center; margin-top: 2mm; }
  .badge { text-align: center; border-radius: 2mm; padding: 3mm 2mm; color: #fff; }
  .badge .bl { font-size: 8pt; text-transform: uppercase; letter-spacing: .08em; opacity: .9; }
  .badge .bv { font-size: 22pt; font-weight: 700; line-height: 1.05; }
  .badge .bg { font-size: 11pt; font-weight: 700; margin-top: 1mm; }
  .scale { margin-top: 2mm; }
  .bar { position: relative; height: 5mm; border-radius: 2.5mm; overflow: visible;
         background: linear-gradient(90deg, #c62828 0%, #e8641b 20%, #e0a800 40%, #4caf22 60%, #1a8f2a 100%); }
  .marker { position: absolute; top: -1.6mm; width: 1mm; height: 8.2mm; background: #111; border-radius: .3mm; transform: translateX(-50%); }
  .marker::after { content: attr(data-v); position: absolute; top: -4.4mm; left: 50%; transform: translateX(-50%);
                   font-size: 8pt; font-weight: 700; white-space: nowrap; }
  .ticks { display: flex; justify-content: space-between; font-size: 7.6pt; color: #666; margin-top: 1mm; }
  .zones { display: flex; font-size: 7.6pt; color: #444; margin-top: .5mm; }
  .zones span { flex: 1; text-align: center; }

  p { margin: 0 0 2mm; }
  ol, ul { margin: 0 0 2mm; padding-left: 5mm; }
  li { margin-bottom: 1mm; }
  .note { background: #f7f3f5; border-left: 2.5pt solid ${PURPLE}; padding: 2.5mm 3.5mm; font-size: 9.2pt; margin-top: 2mm; }
  .box { border: .8pt solid #ddd; border-radius: 1.5mm; padding: 3mm 4mm; }
  .interp { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }

  .sign { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6mm; margin-top: 4mm; }
  .sig { border-top: .6pt solid #333; padding-top: 1.5mm; font-size: 8.6pt; color: #444; height: 22mm; position: relative; }
  .sig .who { font-weight: 700; color: #000; }
  .sig .name { position: absolute; bottom: 1mm; left: 0; font-size: 9pt; color: #000; }
  .stamp { border: .6pt dashed #999; border-radius: 1.5mm; height: 28mm; display: flex; align-items: center; justify-content: center; color: #999; font-size: 8pt; }

  footer { position: absolute; left: 15mm; right: 15mm; bottom: 9mm; display: flex; justify-content: space-between;
           gap: 6mm; font-size: 7.6pt; color: #666; border-top: .6pt solid #ddd; padding-top: 2mm; }
  .foot-right { white-space: nowrap; }
  .verify { font-size: 8.2pt; color: #555; margin-top: 3mm; }
</style>
</head>
<body>

<!-- ============ 1. OLDAL ============ -->
<section class="page">
  <header>
    <div>
      ${logo}
      <div class="brand-line">Elektromos roller szaküzlet és márkafüggetlen szakszerviz</div>
    </div>
    <div class="title">
      <h1>Akkumulátor terheléses<br>teszt jegyzőkönyv</h1>
      <h2>Kapacitásmérés és állapotminősítés (SOH)</h2>
      <div class="meta">Jegyzőkönyv száma: <b>${esc(data.docId)}</b><br>Kiállítás dátuma: <b>${fmtDate(data.docDate)}</b></div>
    </div>
  </header>

  <div class="cols">
    <div>
      <h3><span class="num">1.</span>Megrendelő / tulajdonos</h3>
      <table class="kv">
        <tr><td>Név</td><td>${esc(data.customer.name)}</td></tr>
        <tr><td>Telefon</td><td>${esc(data.customer.phone)}</td></tr>
        <tr><td>E-mail</td><td>${esc(data.customer.email)}</td></tr>
        <tr><td>Mérés dátuma</td><td>${fmtDate(t.date)}</td></tr>
      </table>
    </div>
    <div>
      <h3><span class="num">2.</span>Jármű és akkumulátor</h3>
      <table class="kv">
        <tr><td>Gyártó / típus</td><td>${esc(data.vehicle.brand)} ${esc(data.vehicle.model)}</td></tr>
        <tr><td>Alvázszám</td><td>${frameNo}</td></tr>
        <tr><td>Akkumulátor</td><td>${esc(b.chemistry)}</td></tr>
        <tr><td>Névleges kapacitás</td><td>${fmtNum(b.nominalAh, 0)} Ah · ${fmtNum(b.nominalWh, 0)} Wh (gyári adat)</td></tr>
      </table>
    </div>
  </div>

  <h3><span class="num">3.</span>Mérési eredmény</h3>
  <div class="kpis">
    <div class="kpi hero">
      <div class="l">Kisütött kapacitás</div>
      <div class="v">${fmtNum(t.dischargedAh)} <span class="u">Ah</span></div>
      <div class="s">a készülék Ah-számlálója szerint</div>
    </div>
    <div class="kpi">
      <div class="l">Névleges kapacitás</div>
      <div class="v">${fmtNum(b.nominalAh, 0)} <span class="u">Ah</span></div>
      <div class="s">gyári adatlap</div>
    </div>
    <div class="kpi">
      <div class="l">Állapot (SOH)</div>
      <div class="v">${fmtNum(d.soh, 1)} <span class="u">%</span></div>
      <div class="s">mért / névleges kapacitás</div>
    </div>
    <div class="kpi">
      <div class="l">Kisütés időtartama</div>
      <div class="v">${esc(t.duration)}</div>
      <div class="s">${durationHuman(t.duration)}</div>
    </div>
  </div>

  <div class="evidence">
    ${photoBlock}
    <div>
      <table class="read">
        <tr><th colspan="2">A kijelzőn rögzített értékek</th></tr>
        <tr><td class="k">Kimenet</td><td class="v">00.00 V / 00.00 A <span class="small">(OF = terhelés lekapcsolva, mérés lezárva)</span></td></tr>
        <tr class="total"><td class="k">DSC (kisütött töltés)</td><td class="v">${fmtNum(t.dischargedAh)} Ah</td></tr>
        <tr><td class="k">Time (mérési idő)</td><td class="v">${esc(t.duration)}</td></tr>
        <tr><th colspan="2">Számított jellemzők</th></tr>
        <tr><td class="k">Átlagos kisütő áram</td><td class="v">≈ ${fmtNum(d.avgCurrent, 1)} A <span class="small">(${fmtNum(d.cRate, 2)} C, kíméletes terhelés)</span></td></tr>
        <tr><td class="k">Leadott energia</td><td class="v">≈ ${fmtNum(d.estWh, 0)} Wh <span class="small">(${fmtNum(b.avgVoltage, 1)} V átlagfeszültséggel számolva)</span></td></tr>
        <tr><td class="k">Kisütés vége</td><td class="v">BMS védelmi lekapcsolás <span class="small">(a csomag saját alsó határa)</span></td></tr>
      </table>
    </div>
  </div>

  <h3><span class="num">4.</span>Minősítés</h3>
  <div class="verdict">
    <div>
      <div class="scale">
        <div class="bar"><div class="marker" style="left:${sohPct.toFixed(1)}%" data-v="${fmtNum(d.soh, 1)} %"></div></div>
        <div class="ticks"><span>50 %</span><span>60 %</span><span>70 %</span><span>80 %</span><span>90 %</span><span>100 %</span></div>
        <div class="zones"><span>csere javasolt</span><span>gyenge</span><span>megfelelő</span><span>jó</span><span>kiváló</span></div>
      </div>
      <p style="margin-top:3mm;margin-bottom:0"><b>${esc(g.label)}:</b> ${esc(g.text)} A gyári névleges kapacitás <b>${fmtNum(d.soh, 1)} %-a</b> áll rendelkezésre valós terhelés alatt, ami az iparági „egészséges” küszöböt (80 %) ${d.soh >= 80 ? 'eléri' : 'nem éri el'}.</p>
    </div>
    <div class="badge" style="background:${g.color}">
      <div class="bl">Akkumulátor állapota</div>
      <div class="bv">${fmtNum(d.soh, 1)} %</div>
      <div class="bg">${esc(g.label)}</div>
    </div>
  </div>

  ${footer(1)}
</section>

<!-- ============ 2. OLDAL ============ -->
<section class="page">
  <h3 style="margin-top:0"><span class="num">5.</span>A mérés menete</h3>
  <ol>
    <li><b>Teljes feltöltés.</b> Az akkumulátort a jármű saját töltőjével teljesen feltöltöttük (${fmtNum(b.fullVoltage, 1)} V, a töltő automatikus lekapcsolásáig), majd a cellafeszültségek kiegyenlítődéséig pihentettük.</li>
    <li><b>Terheléses kisütés.</b> A csomagot elektronikus terhelésre kötöttük, amely állandó, kíméletes árammal (≈ ${fmtNum(d.avgCurrent, 1)} A) sütötte ki. A készülék a leadott töltést folyamatosan integrálta (Ah-számlálás).</li>
    <li><b>Lekapcsolás.</b> A mérés a csomag saját akkumulátor-védelmi elektronikájának (BMS) lekapcsolásáig tartott, tehát a ténylegesen használható kapacitást mértük, nem egy önkényes feszültséghatárig.</li>
    <li><b>Rögzítés.</b> A mérés végén a kijelzőn megjelenő végértékeket (DSC ${fmtNum(t.dischargedAh)} Ah, ${esc(t.duration)}) fotóval és ezzel a jegyzőkönyvvel dokumentáltuk.</li>
    <li><b>Kiértékelés.</b> Az állapotot (State of Health, SOH) a mért és a gyári névleges kapacitás hányadosaként számítottuk: ${fmtNum(t.dischargedAh)} Ah / ${fmtNum(b.nominalAh, 0)} Ah = <b>${fmtNum(d.soh, 1)} %</b>.</li>
  </ol>
  <p class="small">Eszköz: ${esc(t.instrument)}. A kis áramerősségű (${fmtNum(d.cRate, 2)} C) kisütés a menet közbeni, nagyobb terheléshez képest az akkumulátor számára kedvező, ezért a kapott érték a valós használható kapacitás felső, de realisztikus becslése.</p>

  <h3><span class="num">6.</span>Mit jelent ez az eredmény?</h3>
  <div class="interp">
    <div class="box">
      <p><b>Vevő szemszögéből</b></p>
      <ul>
        <li>Az akkumulátor <b>nem „fáradt”</b>: a gyári kapacitás ${fmtNum(d.soh, 0)} %-a ténylegesen rendelkezésre áll.</li>
        <li>Azonos vezetési körülmények között a gyári hatótáv kb. <b>${fmtNum(d.soh, 0)} %-a</b> várható.</li>
        <li>A mérés <b>független szakszervizben</b>, mérőműszerrel készült – nem a roller kijelzőjének becslése.</li>
        <li>A BMS a teljes kisütési ciklust hibajelzés nélkül végigkísérte: a csomag védelme működik.</li>
      </ul>
    </div>
    <div class="box">
      <p><b>Műszaki háttér</b></p>
      <ul>
        <li>A lítium-ion akkumulátorok kapacitása használat és idő során természetesen csökken; 80 % felett a csomag az iparágban „egészségesnek” minősül.</li>
        <li>A kapacitásmérés a legmegbízhatóbb állapotjelző: a roller kijelzője csak feszültségből becsül, ez a mérés a ténylegesen kivehető töltést adja meg.</li>
        <li>Az eredmény a csomag egészére vonatkozik; a cellák egyedi kiegyenlítettségét külön BMS-diagnosztika mutatja.</li>
      </ul>
    </div>
  </div>

  <h3><span class="num">7.</span>Érvényesség és korlátok</h3>
  <div class="note">
    A jegyzőkönyv a mérés napján (${fmtDate(t.date)}) fennálló állapotot rögzíti; nem garancia, és nem helyettesíti a jármű egyéb részegységeinek (motor, vezérlő, töltő, futómű) átvizsgálását. A tényleges hatótáv a vezető tömegétől, a terepviszonyoktól, a hőmérséklettől és a vezetési stílustól függ. A leadott energia (Wh) és az átlagos kisütő áram a mért Ah, az idő és a névleges átlagfeszültség alapján számított érték.
    ${t.notes ? `<br><br><b>Megjegyzés:</b> ${esc(t.notes)}` : ''}
  </div>

  <h3><span class="num">8.</span>Hitelesítés</h3>
  <p class="small">A mérést a ${esc(s.name)} szakszerviz végezte és dokumentálta. A jegyzőkönyv eredetisége a szerviz elérhetőségein, a jegyzőkönyv számára (<b>${esc(data.docId)}</b>) hivatkozva ellenőrizhető.</p>
  <div class="sign">
    <div class="sig"><span class="who">Mérést végezte</span><br>szerviztechnikus<span class="name">${technician}</span></div>
    <div class="stamp">szerviz bélyegzője</div>
    <div class="sig"><span class="who">Tulajdonos</span><br>${esc(data.customer.name)}</div>
  </div>
  <p class="verify" style="margin-top:8mm">Kelt: Veszprém, ${fmtDate(data.docDate)}</p>

  ${footer(2)}
</section>

</body>
</html>`;
}
