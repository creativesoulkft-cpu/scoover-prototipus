import re, sys
src = open(sys.argv[1], encoding='latin-1').read()
body = src.split('%%EndSetup', 1)[1].split('%%PageTrailer', 1)[0]
# CMYK -> a PNG-n látott márkaszínek
COLORS = {(0.35, 1.0, 0.1, 0.48): '#7A1F4E', (0.87, 0.0, 1.0, 0.0): '#22C000'}
def col(c, m, y, k):
    key = (round(c, 2), round(m, 2), round(y, 2), round(k, 2))
    if key in COLORS: return COLORS[key]
    r = 255 * (1 - c) * (1 - k); g = 255 * (1 - m) * (1 - k); b = 255 * (1 - y) * (1 - k)
    return '#%02x%02x%02x' % (r, g, b)

paths = []      # (color, d)
cur_color = '#000'; d = ''; compound = 0; comp_d = ''; cx = cy = 0
xs = []; ys = []
def P(x, y):
    xs.append(x); ys.append(-y); return '%.2f %.2f' % (x, -y)
for line in body.splitlines():
    t = line.strip().split()
    if not t or line.startswith('%'): continue
    op = t[-1]; a = [float(v) for v in t[:-1] if re.match(r'^-?[\d.]+$', v)]
    if op == 'k' and len(a) == 4: cur_color = col(*a)
    elif op == 'm': d += 'M' + P(a[0], a[1]) + ' '; cx, cy = a[0], a[1]
    elif op in ('l', 'L'): d += 'L' + P(a[0], a[1]) + ' '; cx, cy = a[0], a[1]
    elif op in ('c', 'C'):
        d += 'C' + P(a[0], a[1]) + ' ' + P(a[2], a[3]) + ' ' + P(a[4], a[5]) + ' '; cx, cy = a[4], a[5]
    elif op in ('v', 'V'):
        d += 'C' + P(cx, cy) + ' ' + P(a[0], a[1]) + ' ' + P(a[2], a[3]) + ' '; cx, cy = a[2], a[3]
    elif op in ('y', 'Y'):
        d += 'C' + P(a[0], a[1]) + ' ' + P(a[2], a[3]) + ' ' + P(a[2], a[3]) + ' '; cx, cy = a[2], a[3]
    elif op in ('f', 'F', 's', 'S', 'b', 'B'):
        d += 'Z '
        if compound: comp_d += d
        else: paths.append((cur_color, d))
        d = ''
    elif op == '*u': compound += 1; comp_d = ''
    elif op == '*U':
        compound -= 1
        if comp_d: paths.append((cur_color, comp_d)); comp_d = ''
minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
pad = 2
out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="%.2f %.2f %.2f %.2f">' % (minx - pad, miny - pad, maxx - minx + 2 * pad, maxy - miny + 2 * pad)]
for c, dd in paths:
    out.append('<path fill="%s" fill-rule="evenodd" d="%s"/>' % (c, dd.strip()))
out.append('</svg>')
open(sys.argv[2], 'w').write('\n'.join(out))
print(len(paths), 'paths; bbox', minx, miny, maxx, maxy)
