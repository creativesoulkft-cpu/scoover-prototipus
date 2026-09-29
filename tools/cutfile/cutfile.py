"""
VÁGÓFÁJL (CorelDRAW PDF) → NYOMDAI GEOMETRIA

Két lépés, mindkettő újrafuttatható:

  python3 tools/cutfile/cutfile.py extract <vágóív.pdf> <modell-id>
      A PDF-ből kinyeri a darabokat (mm, pontos Bézier-görbékkel, lyukakkal),
      kiszűri a vágójeleket, olvasási sorrendben számoz, számozott áttekintőt
      rajzol, és – ha van korábbi hozzárendelés – az előző változat darabjaihoz
      párosítja őket (hely + méret + terület), így egy "pici pontosítás" után a
      hozzárendelés magától megmarad; csak az új/erősen változott darabot jelzi.

  python3 tools/cutfile/cutfile.py build <modell-id>
      A darabok + a hozzárendelés (mapping.json: melyik szám melyik modell-darab,
      bal/jobb) alapján alak-illesztéssel megkeresi, hogy a vevő előnézetében
      (fotó / vázlat / taposó felülnézet) látott darab hogyan fekszik a vágóíven
      (forgatás 5°-onként + tükrözés), és elkészíti a szerver nyomdai
      geometriáját: server/print/models/<modell-id>.print.json.
      A hozzárendeletlen darabokra javaslatot is ad (a legjobban illeszkedő
      előnézeti darab).

A vágóív EREDETI ELRENDEZÉSE megmarad: a nyomdai PDF ugyanakkora lap,
ugyanott a darabok, ugyanaz a vágóvonal – csak a kitöltés (minta) kerül rá.

Kimenet (a geometria NEM kerül gitbe – a repó nyilvános):
  tools/cutfile/<modell>/pieces.json, overview.svg/png   (gitignore)
  tools/cutfile/<modell>/mapping.json                    (git: csak számok, id-k, méret-aláírás)
  server/print/models/<modell>.print.json                (gitignore)

Függőség: pip install pymupdf numpy pillow; node (a modell előnézeti darabjaihoz)
"""
import json
import math
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pymupdf as fitz
from PIL import Image, ImageDraw

PT2MM = 25.4 / 72
HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
SERVER_MODELS = REPO / 'server' / 'print' / 'models'
CONFIDENCE = ('biztos', 'valószínű', 'kérdéses')


# ---------------------------------------------------------------------------
# PDF → alútvonalak
# ---------------------------------------------------------------------------
def fmt(v):
    r = round(v, 3)
    return '0' if r == 0 else f'{r:g}'


def bez(p0, p1, p2, p3, t):
    u = 1 - t
    return (u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
            u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1])


def mm(p):
    return (p.x * PT2MM, p.y * PT2MM)


def subpaths_of(drawing):
    out, cur, last = [], None, None

    def close():
        nonlocal cur
        if cur and len(cur['poly']) >= 3:
            cur['d'] += ' Z'
            out.append(cur)
        cur = None

    for it in drawing['items']:
        kind = it[0]
        if kind in ('re', 'qu'):
            close()
            if kind == 're':
                r = it[1]
                pts = [(x * PT2MM, y * PT2MM) for x, y in ((r.x0, r.y0), (r.x1, r.y0), (r.x1, r.y1), (r.x0, r.y1))]
            else:
                q = it[1]
                pts = [mm(q.ul), mm(q.ur), mm(q.lr), mm(q.ll)]
            out.append({'d': 'M ' + ' L '.join(f'{fmt(x)} {fmt(y)}' for x, y in pts) + ' Z', 'poly': pts})
            last = None
            continue
        start = mm(it[1])
        if last is None or math.dist(start, last) > 0.01:
            close()
            cur = {'d': f'M {fmt(start[0])} {fmt(start[1])}', 'poly': [start]}
        if kind == 'l':
            end = mm(it[2])
            cur['d'] += f' L {fmt(end[0])} {fmt(end[1])}'
            cur['poly'].append(end)
        elif kind == 'c':
            c1, c2, end = mm(it[2]), mm(it[3]), mm(it[4])
            cur['d'] += f' C {fmt(c1[0])} {fmt(c1[1])} {fmt(c2[0])} {fmt(c2[1])} {fmt(end[0])} {fmt(end[1])}'
            cur['poly'].extend(bez(start, c1, c2, end, k / 32) for k in range(1, 33))
        last = cur['poly'][-1]
    close()
    return out


def area(poly):
    n = len(poly)
    return abs(sum(poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1] for i in range(n))) / 2


def bbox(poly):
    xs, ys = [p[0] for p in poly], [p[1] for p in poly]
    return min(xs), min(ys), max(xs), max(ys)


def inside(pt, poly):
    x, y = pt
    res, j = False, len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi:
            res = not res
        j = i
    return res


def is_cut_stroke(drawing):
    """Vágóvonal = színes körvonal. A fekete rövid vonalak a Corel vágó-/regisztrációs jelei."""
    col = drawing.get('color')
    if not col or all(c < 0.05 for c in col):
        return False
    return drawing.get('type') in ('s', 'fs')


def extract_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    page = doc[0]
    subs, skipped = [], 0
    for dr in page.get_drawings():
        if not is_cut_stroke(dr):
            skipped += 1
            continue
        for sp in subpaths_of(dr):
            sp['area'] = area(sp['poly'])
            sp['bbox'] = bbox(sp['poly'])
            sp['width'] = round(dr.get('width') or 0, 2)
            subs.append(sp)
    subs.sort(key=lambda s: -s['area'])
    for i, s in enumerate(subs):
        s['parent'] = None
        sb = s['bbox']
        for j in range(i - 1, -1, -1):
            o, bx = subs[j], subs[j]['bbox']
            if sb[0] < bx[0] - 0.01 or sb[1] < bx[1] - 0.01 or sb[2] > bx[2] + 0.01 or sb[3] > bx[3] + 0.01:
                continue
            if all(inside(p, o['poly']) for p in s['poly'][:: max(1, len(s['poly']) // 12)]):
                s['parent'] = j
                break

    def depth(k):
        d = 0
        while subs[k]['parent'] is not None:
            k, d = subs[k]['parent'], d + 1
        return d

    pieces, owner = [], {}
    for i, s in enumerate(subs):
        if depth(i) % 2 == 0:
            owner[i] = len(pieces)
            pieces.append({'outer': s, 'holes': []})
        else:
            pieces[owner[s['parent']]]['holes'].append(s)
    pieces.sort(key=lambda p: (round(p['outer']['bbox'][1] / 40), p['outer']['bbox'][0]))
    out = []
    for n, p in enumerate(pieces, start=1):
        x0, y0, x1, y1 = p['outer']['bbox']
        out.append({
            'n': n,
            'd': ' '.join([p['outer']['d']] + [h['d'] for h in p['holes']]),
            'polys': [[[round(x, 2), round(y, 2)] for x, y in p['outer']['poly']]] + [[[round(x, 2), round(y, 2)] for x, y in h['poly']] for h in p['holes']],
            'xMm': round(x0, 3), 'yMm': round(y0, 3), 'widthMm': round(x1 - x0, 3), 'heightMm': round(y1 - y0, 3),
            'areaMm2': round(p['outer']['area'] - sum(h['area'] for h in p['holes']), 1),
            'holes': len(p['holes']), 'strokePt': p['outer']['width'],
        })
    sheet = {'widthMm': round(page.rect.width * PT2MM, 3), 'heightMm': round(page.rect.height * PT2MM, 3)}
    meta = {k: v for k, v in (doc.metadata or {}).items() if v}
    return out, sheet, meta, skipped


def signature(p):
    return [round(p['xMm'] + p['widthMm'] / 2, 2), round(p['yMm'] + p['heightMm'] / 2, 2), p['widthMm'], p['heightMm'], p['areaMm2']]


def carry_over(pieces, old):
    """Az új darabok párosítása az előző hozzárendelés darabjaival (hely + méret + terület)."""
    prev = old.get('pieces', {})
    pairs = []
    for p in pieces:
        cx, cy, w, h, a = signature(p)
        for key, m in prev.items():
            if 'sig' not in m:
                continue
            pcx, pcy, pw, ph, pa = m['sig']
            d = math.hypot(cx - pcx, cy - pcy) / 60 + abs(w - pw) / max(pw, 1) + abs(h - ph) / max(ph, 1) + abs(a - pa) / max(pa, 1)
            pairs.append((d, p['n'], key))
    pairs.sort()
    used_new, used_old, result = set(), set(), {}
    for d, n, key in pairs:
        if d > 1.0 or n in used_new or key in used_old:
            continue
        used_new.add(n)
        used_old.add(key)
        result[n] = (key, d)
    return result, [k for k in prev if k not in used_old]


# ---------------------------------------------------------------------------
# SVG path (előnézet) → sokszögek
# ---------------------------------------------------------------------------
NUM = re.compile(r'-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?', re.I)


def arc_points(x1, y1, rx, ry, rot, large, sweep, x2, y2, steps=16):
    if rx == 0 or ry == 0:
        return [(x2, y2)]
    phi = math.radians(rot)
    cs, sn = math.cos(phi), math.sin(phi)
    dx, dy = (x1 - x2) / 2, (y1 - y2) / 2
    x1p, y1p = cs * dx + sn * dy, -sn * dx + cs * dy
    rx, ry = abs(rx), abs(ry)
    lam = x1p**2 / rx**2 + y1p**2 / ry**2
    if lam > 1:
        rx, ry = rx * math.sqrt(lam), ry * math.sqrt(lam)
    num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
    den = rx * rx * y1p * y1p + ry * ry * x1p * x1p
    coef = math.sqrt(max(0, num / (den or 1)))
    if large == sweep:
        coef = -coef
    cxp, cyp = coef * rx * y1p / ry, -coef * ry * x1p / rx
    cx, cy = cs * cxp - sn * cyp + (x1 + x2) / 2, sn * cxp + cs * cyp + (y1 + y2) / 2

    def ang(ux, uy, vx, vy):
        a = math.acos(max(-1, min(1, (ux * vx + uy * vy) / ((math.hypot(ux, uy) * math.hypot(vx, vy)) or 1))))
        return -a if ux * vy - uy * vx < 0 else a

    t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
    dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
    if not sweep and dt > 0:
        dt -= 2 * math.pi
    if sweep and dt < 0:
        dt += 2 * math.pi
    return [(cs * rx * math.cos(t1 + dt * i / steps) - sn * ry * math.sin(t1 + dt * i / steps) + cx,
             sn * rx * math.cos(t1 + dt * i / steps) + cs * ry * math.sin(t1 + dt * i / steps) + cy) for i in range(1, steps + 1)]


def path_polys(d):
    polys, cur = [], []
    x = y = sx = sy = 0.0
    for cmd, args in re.findall(r'([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)', d):
        n = [float(v) for v in NUM.findall(args)]
        rel = cmd.islower()
        C = cmd.upper()
        if C == 'Z':
            if len(cur) >= 3:
                polys.append(cur)
            cur, x, y = [], sx, sy
            continue
        i = 0
        while i < len(n) or (C in 'Z' and i == 0):
            if C in 'ML':
                x, y = (x + n[i], y + n[i + 1]) if rel else (n[i], n[i + 1])
                i += 2
                if C == 'M' and not cur:
                    sx, sy = x, y
                cur.append((x, y))
            elif C == 'H':
                x = x + n[i] if rel else n[i]
                i += 1
                cur.append((x, y))
            elif C == 'V':
                y = y + n[i] if rel else n[i]
                i += 1
                cur.append((x, y))
            elif C == 'C':
                p = n[i:i + 6]
                i += 6
                if rel:
                    p = [p[0] + x, p[1] + y, p[2] + x, p[3] + y, p[4] + x, p[5] + y]
                cur.extend(bez((x, y), (p[0], p[1]), (p[2], p[3]), (p[4], p[5]), k / 8) for k in range(1, 9))
                x, y = p[4], p[5]
            elif C == 'Q':
                p = n[i:i + 4]
                i += 4
                if rel:
                    p = [p[0] + x, p[1] + y, p[2] + x, p[3] + y]
                for k in range(1, 9):
                    t = k / 8
                    u = 1 - t
                    cur.append((u * u * x + 2 * u * t * p[0] + t * t * p[2], u * u * y + 2 * u * t * p[1] + t * t * p[3]))
                x, y = p[2], p[3]
            elif C == 'A':
                p = n[i:i + 7]
                i += 7
                ex, ey = (x + p[5], y + p[6]) if rel else (p[5], p[6])
                cur.extend(arc_points(x, y, p[0], p[1], p[2], int(p[3]), int(p[4]), ex, ey))
                x, y = ex, ey
            else:
                break
    if len(cur) >= 3:
        polys.append(cur)
    return polys


# ---------------------------------------------------------------------------
# Alak-illesztés: előnézeti darab → vágóív darab (forgatás + tükrözés)
# ---------------------------------------------------------------------------
RES = 72


def mask_of(polys, bb):
    x0, y0, x1, y1 = bb
    w, h = max(x1 - x0, 1e-6), max(y1 - y0, 1e-6)
    acc = np.zeros((RES, RES), dtype=bool)
    for poly in polys:
        img = Image.new('1', (RES, RES), 0)
        ImageDraw.Draw(img).polygon([((px - x0) / w * (RES - 1), (py - y0) / h * (RES - 1)) for px, py in poly], fill=1)
        acc ^= np.array(img, dtype=bool)
    return acc


def transform_polys(polys, theta, mirror):
    c, s = math.cos(theta), math.sin(theta)
    out = []
    for poly in polys:
        q = []
        for x, y in poly:
            if mirror:
                x = -x
            q.append((c * x - s * y, s * x + c * y))
        out.append(q)
    return out


def all_bbox(polys):
    xs = [p[0] for poly in polys for p in poly]
    ys = [p[1] for poly in polys for p in poly]
    return min(xs), min(ys), max(xs), max(ys)


def best_fit(prev_polys, cut_polys, step=5, mirrors=(False, True)):
    """A legjobb (forgatás, tükör) a két alak között: IoU a befoglaló dobozra normalizálva, arány-büntetéssel.

    Tükrözés: a matricát mindig a nyomott oldaláról rajzolják, ezért a BAL oldali
    darab a jobb oldali (a fotón látszó oldal) tükörképe – a hívó ezt a
    `mirrors` paraméterrel rögzíti, a keresés csak a forgatást dönti el.
    Döntetlennél (szimmetrikus alak) a kisebb forgatás nyer: a vágóíven a
    darabok jellemzően a roller természetes irányában fekszenek."""
    cb = all_bbox(cut_polys)
    cmask = mask_of(cut_polys, cb)
    car = (cb[2] - cb[0]) / max(cb[3] - cb[1], 1e-6)
    best = None
    for mirror in mirrors:
        for deg in range(0, 360, step):
            tp = transform_polys(prev_polys, math.radians(deg), mirror)
            pb = all_bbox(tp)
            par = (pb[2] - pb[0]) / max(pb[3] - pb[1], 1e-6)
            pm = mask_of(tp, pb)
            inter = np.logical_and(pm, cmask).sum()
            union = np.logical_or(pm, cmask).sum() or 1
            score = inter / union - 0.35 * abs(math.log(par / car)) - 0.0004 * min(deg, 360 - deg)
            if best is None or score > best[0]:
                best = (score, deg, mirror)
    return {'score': round(float(best[0]), 3), 'rotate': best[1], 'mirror': best[2]}


def map_matrix(prev_polys, cut_bb, rotate, mirror):
    """Előnézet → vágóív (lap-mm) affin mátrix [a,b,c,d,e,f]: tükör → forgatás → egyenletes lépték → a dobozközepek egybe."""
    pb0 = all_bbox(prev_polys)
    pcx, pcy = (pb0[0] + pb0[2]) / 2, (pb0[1] + pb0[3]) / 2
    centered = [[(x - pcx, y - pcy) for x, y in poly] for poly in prev_polys]
    tp = transform_polys(centered, math.radians(rotate), mirror)
    tb = all_bbox(tp)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    cw, ch = cut_bb[2] - cut_bb[0], cut_bb[3] - cut_bb[1]
    s = math.sqrt((cw * ch) / max(tw * th, 1e-9))
    tcx, tcy = (tb[0] + tb[2]) / 2, (tb[1] + tb[3]) / 2
    ccx, ccy = (cut_bb[0] + cut_bb[2]) / 2, (cut_bb[1] + cut_bb[3]) / 2
    c, sn = math.cos(math.radians(rotate)), math.sin(math.radians(rotate))
    mx = -1 if mirror else 1
    # p' = s·R·Mx·(p − pc) − s·tc + cc
    a, b = s * c * mx, s * sn * mx
    cc_, d = -s * sn, s * c
    e = -(a * pcx + cc_ * pcy) - s * tcx + ccx
    f = -(b * pcx + d * pcy) - s * tcy + ccy
    return [round(v, 6) for v in (a, b, cc_, d, e, f)], round(s, 5)


# ---------------------------------------------------------------------------
# Áttekintő
# ---------------------------------------------------------------------------
def overview_svg(pieces, sheet, mapping):
    W, H = sheet['widthMm'], sheet['heightMm']
    pm = mapping.get('pieces', {})
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W * 2:.0f}" height="{H * 2:.0f}" viewBox="0 0 {W:.2f} {H:.2f}">',
             f'<rect width="{W:.2f}" height="{H:.2f}" fill="#fff"/>']
    for p in pieces:
        m = pm.get(str(p['n']), {})
        pid, conf = m.get('id'), m.get('confidence', '')
        color = '#1b7f3b' if pid and conf == 'biztos' else '#c77700' if pid else '#9e9e9e' if m.get('extra') else '#c2185b'
        parts.append(f'<path d="{p["d"]}" fill="{color}" fill-opacity="0.10" fill-rule="evenodd" stroke="{color}" stroke-width="0.7"/>')
        cx, cy = p['xMm'] + p['widthMm'] / 2, p['yMm'] + p['heightMm'] / 2
        size = max(10, min(28, min(p['widthMm'], p['heightMm']) * 0.4))
        parts.append(f'<text x="{cx:.1f}" y="{cy:.1f}" font-size="{size:.1f}" font-family="DejaVu Sans, Arial" font-weight="700" text-anchor="middle" fill="#111">{p["n"]}</text>')
        sub = f'{p["widthMm"]:.0f}×{p["heightMm"]:.0f}'
        if pid:
            sub = f'{pid}{"-" + m["copy"] if m.get("copy") else ""}{" ?" if conf != "biztos" else ""}'
        elif m.get('extra'):
            sub = m['extra']
        parts.append(f'<text x="{cx:.1f}" y="{cy + size * 0.8:.1f}" font-size="{max(7, size * 0.42):.1f}" font-family="DejaVu Sans, Arial" text-anchor="middle" fill="#333">{sub}</text>')
    parts.append('</svg>')
    return '\n'.join(parts)


def save_overview(outdir, pieces, sheet, mapping):
    svg = overview_svg(pieces, sheet, mapping)
    (outdir / 'overview.svg').write_text(svg, encoding='utf-8')
    fitz.open(stream=svg.encode('utf-8'), filetype='svg')[0].get_pixmap(dpi=60, alpha=False).save(str(outdir / 'overview.png'))


# ---------------------------------------------------------------------------
# Parancsok
# ---------------------------------------------------------------------------
def cmd_extract(pdf, model):
    outdir = HERE / model
    outdir.mkdir(parents=True, exist_ok=True)
    pieces, sheet, meta, skipped = extract_pdf(pdf)
    mapping_path = outdir / 'mapping.json'
    old = json.loads(mapping_path.read_text(encoding='utf-8')) if mapping_path.exists() else {}
    matches, removed = carry_over(pieces, old) if old.get('pieces') else ({}, [])
    newmap = {}
    for p in pieces:
        if p['n'] in matches:
            key, dist = matches[p['n']]
            entry = {k: v for k, v in old['pieces'][key].items() if k not in ('sig', 'note', 'suggest', 'fit')}
            if dist > 0.05:
                entry['note'] = f'változott az előző változathoz képest (eltérés {dist:.2f}) – ellenőrizd'
        else:
            entry = {'id': None, 'copy': None, 'confidence': '', **({'note': 'ÚJ darab az előző változathoz képest'} if old.get('pieces') else {})}
        entry['sig'] = signature(p)
        newmap[str(p['n'])] = entry
    mapping = {
        'model': model,
        'source': {'file': Path(pdf).name, 'title': meta.get('title'), 'creator': meta.get('creator'), 'created': meta.get('creationDate')},
        'sheet': sheet,
        'pieces': newmap,
    }
    if removed:
        mapping['removedSincePrevious'] = [{'n': k, **old['pieces'][k]} for k in removed]
    (outdir / 'pieces.json').write_text(json.dumps({'model': model, 'source': mapping['source'], 'sheet': sheet, 'pieces': pieces}, ensure_ascii=False), encoding='utf-8')
    mapping_path.write_text(json.dumps(mapping, ensure_ascii=False, indent=2), encoding='utf-8')
    save_overview(outdir, pieces, sheet, mapping)
    print(f'{Path(pdf).name}: {len(pieces)} darab, lap {sheet["widthMm"]:.0f}×{sheet["heightMm"]:.0f} mm, kiszűrt vágójel: {skipped}')
    for p in pieces:
        m = newmap[str(p['n'])]
        print(f'  #{p["n"]:>2}  {p["widthMm"]:7.1f} × {p["heightMm"]:6.1f} mm  lyuk:{p["holes"]}  vonal:{p["strokePt"]}pt  → {m.get("id") or m.get("extra") or "—"}{("-" + m["copy"]) if m.get("copy") else ""}  {m.get("note", "")}')
    if removed:
        print(f'\nAz előző változatból HIÁNYZIK: {", ".join("#" + k for k in removed)}')
    print(f'\nÁttekintő: {outdir / "overview.png"}\nHozzárendelés: {mapping_path}  →  utána: cutfile.py build {model}')


def preview_of(model):
    out = subprocess.run(['node', str(HERE / 'dump-preview.mjs'), model], capture_output=True, text=True, cwd=REPO, check=True)
    return json.loads(out.stdout)


def cmd_build(model):
    outdir = HERE / model
    data = json.loads((outdir / 'pieces.json').read_text(encoding='utf-8'))
    mapping = json.loads((outdir / 'mapping.json').read_text(encoding='utf-8'))
    preview = preview_of(model)
    views = {v: preview[v] for v in ('photo', 'schematic', 'footboard') if preview.get(v)}
    prev_polys = {v: {p['id']: path_polys(p['d']) for p in views[v]['pieces']} for v in views}
    group_of = {v: {p['id']: p.get('priceGroup') for p in views[v]['pieces']} for v in views}
    # a render a VÁZLAT darab-id-it használja (model.pieces) – ez a mérvadó lista
    meta_by_id = {p['id']: p for p in views['schematic']['pieces']}

    def preview_polys(v, pid):
        if pid in prev_polys[v]:
            return prev_polys[v][pid]
        grp = meta_by_id.get(pid, {}).get('priceGroup')
        alias = next((i for i, g in group_of[v].items() if grp and g == grp), None)
        return prev_polys[v].get(alias) if alias else None

    pieces_out, unassigned, notes = {}, [], []
    scales = {v: [] for v in views}
    for p in data['pieces']:
        m = mapping['pieces'].get(str(p['n']), {})
        cut_polys = [[tuple(pt) for pt in poly] for poly in p['polys']]
        cut_bb = (p['xMm'], p['yMm'], p['xMm'] + p['widthMm'], p['yMm'] + p['heightMm'])
        pid = m.get('id')
        if not pid:
            # javaslat: a legjobban illeszkedő előnézeti darab (fotó, különben vázlat)
            v = 'photo' if 'photo' in views else 'schematic'
            cands = sorted(((best_fit(polys, cut_polys, step=10)['score'], cid) for cid, polys in prev_polys[v].items() if cid != 'deck-top'), reverse=True)[:2]
            m['suggest'] = [f'{cid} ({sc:.2f})' for sc, cid in cands]
            unassigned.append({'n': p['n'], 'widthMm': p['widthMm'], 'heightMm': p['heightMm'], 'extra': m.get('extra'), 'suggest': m['suggest']})
            continue
        if pid not in meta_by_id:
            notes.append(f'#{p["n"]}: ismeretlen darab-id "{pid}" – kihagyva')
            continue
        is_fb = bool(meta_by_id[pid].get('footboard'))
        fits, maps = {}, {}
        for v in (['footboard'] if is_fb else [x for x in ('photo', 'schematic') if x in views]):
            polys = prev_polys[v].get('deck-top') if is_fb else preview_polys(v, pid)
            if not polys:
                continue
            fixed = (m.get('fit') or {}).get(v)
            mirror = m.get('copy') == 'L'
            fit = fixed if fixed else best_fit(polys, cut_polys, mirrors=(mirror,))
            matrix, s = map_matrix(polys, cut_bb, fit['rotate'], fit['mirror'])
            fits[v] = {**fit, 'scale': s}
            maps[v] = matrix
            scales[v].append(s)
            if fit.get('score', 1) < 0.35:
                notes.append(f'#{p["n"]} ({pid}, {v}): gyenge alak-illeszkedés ({fit.get("score")}) – ellenőrizd a hozzárendelést / a minta irányát')
        m['fitResult'] = fits
        entry = pieces_out.setdefault(pid, {
            'id': pid, 'name': meta_by_id[pid]['name'], 'priceGroup': meta_by_id[pid].get('priceGroup'),
            'size': meta_by_id[pid].get('size', 'medium'), 'footboard': is_fb, 'copies': [],
        })
        entry['copies'].append({
            'key': f'{pid}-{m["copy"]}' if m.get('copy') else f'{pid}-{p["n"]}', 'n': p['n'], 'side': m.get('copy'),
            'd': p['d'], 'xMm': p['xMm'], 'yMm': p['yMm'], 'widthMm': p['widthMm'], 'heightMm': p['heightMm'],
            'confidence': m.get('confidence') or 'kérdéses', 'previewMaps': maps,
        })

    # A kifutó nem lóghat át a szomszéd darabra: a hozzárendelt darabok közti legkisebb
    # távolság fele a felső korlát (a vágóíven a darabok néha szorosan vannak).
    def sample(polys, k=400):
        pts = [pt for poly in polys for pt in poly]
        step = max(1, len(pts) // k)
        return np.array(pts[::step])
    assigned = [pp for pp in data['pieces'] if mapping['pieces'].get(str(pp['n']), {}).get('id') in pieces_out]
    samples = {pp['n']: sample(pp['polys']) for pp in data['pieces']}
    min_gap, close_pairs = 1e9, []
    for a in assigned:
        for b in data['pieces']:
            if a['n'] == b['n']:
                continue
            ax0, ay0, ax1, ay1 = a['xMm'], a['yMm'], a['xMm'] + a['widthMm'], a['yMm'] + a['heightMm']
            bx0, by0, bx1, by1 = b['xMm'], b['yMm'], b['xMm'] + b['widthMm'], b['yMm'] + b['heightMm']
            if ax0 - bx1 > 10 or bx0 - ax1 > 10 or ay0 - by1 > 10 or by0 - ay1 > 10:
                continue
            dmin = float(np.sqrt(((samples[a['n']][:, None, :] - samples[b['n']][None, :, :]) ** 2).sum(-1)).min())
            min_gap = min(min_gap, dmin)
            if dmin < 4:
                close_pairs.append(f'#{a["n"]}–#{b["n"]}: {dmin:.1f} mm')
    bleed = 2.0 if min_gap >= 4 else max(0.5, math.floor(min_gap / 2 * 10) / 10)
    if close_pairs:
        notes.append(f'Szoros darabok a vágóíven ({", ".join(sorted(set(close_pairs))[:6])}) – a kifutó {bleed} mm-re csökkentve.')

    missing = [pid for pid, meta in meta_by_id.items() if pid not in pieces_out]
    if missing:
        notes.append('A vágóívből hiányzó modell-darab (nincs hozzárendelve): ' + ', '.join(missing))
    med = lambda a: sorted(a)[len(a) // 2] if a else None  # noqa: E731
    out = {
        'model': model, 'source': 'cutfile', 'sourceFile': mapping['source']['file'], 'sourceTitle': mapping['source'].get('title'),
        'generatedAt': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'unit': 'mm', 'layout': 'sheet',
        'bleedMm': bleed, 'minGapMm': round(min_gap, 2) if min_gap < 1e9 else None, 'sheet': data['sheet'],
        # a nézet egy egysége mm-ben (a saját kép dpi-becsléséhez) – a hozzárendelt darabok mediánja
        'mmPerUnit': {v: (round(med(scales[v]), 4) if scales[v] else None) for v in views},
        'pieces': list(pieces_out.values()), 'unassigned': unassigned, 'notes': notes,
    }
    SERVER_MODELS.mkdir(parents=True, exist_ok=True)
    target = SERVER_MODELS / f'{model}.print.json'
    target.write_text(json.dumps(out, ensure_ascii=False), encoding='utf-8')
    (outdir / 'mapping.json').write_text(json.dumps(mapping, ensure_ascii=False, indent=2), encoding='utf-8')
    save_overview(outdir, data['pieces'], data['sheet'], mapping)

    print(f'{model}: {sum(len(e["copies"]) for e in pieces_out.values())} hozzárendelt darab ({len(pieces_out)} modell-darab), {len(unassigned)} hozzárendeletlen → {target.relative_to(REPO)}')
    for e in pieces_out.values():
        for c in e['copies']:
            f = mapping['pieces'][str(c['n'])].get('fitResult', {})
            fs = ' · '.join(f'{v}: {x["rotate"]}°{" tükör" if x["mirror"] else ""} ({x.get("score", "kézi")})' for v, x in f.items())
            print(f'  #{c["n"]:>2} {c["key"]:<18} {c["confidence"]:<10} {fs}')
    for u in unassigned:
        print(f'  #{u["n"]:>2} — {u.get("extra") or "hozzárendeletlen"} · javaslat: {", ".join(u["suggest"])}')
    for n in notes:
        print(f'  ! {n}')
    print(f'  kifutó: {bleed} mm (legkisebb darabköz: {out["minGapMm"]} mm)')
    print(f'  mm/egység: {out["mmPerUnit"]}  → src/data/models/index.js printScale')


if __name__ == '__main__':
    if len(sys.argv) >= 4 and sys.argv[1] == 'extract':
        cmd_extract(sys.argv[2], sys.argv[3])
    elif len(sys.argv) >= 3 and sys.argv[1] == 'build':
        cmd_build(sys.argv[2])
    else:
        print(__doc__)
        sys.exit(1)
