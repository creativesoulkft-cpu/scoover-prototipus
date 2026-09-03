"""
Fotós nézet maszk-finomító.

Bemenet:  tools/photo-masks/<modell>.json – a termékfotó és a darabok DURVA
          sokszögei (fotó-pixelben), plusz a darab-metaadatok.
Kimenet:  src/data/models/<modell>.photo.js – a sokszögek a fotó sziluettjére
          vágva (a világos háttér levágva), simított SVG path-ként.

Így a kézi körberajzolásnak csak nagyjából kell követnie a darabot: a széleket
a fotó adja, a maszk sosem lóg a háttérre. A darabok közti belső határok a
durva sokszögekből maradnak.

Futtatás:  python3 tools/photo-masks.py tools/photo-masks/kukirin-g2.json
Függőség:  pip install opencv-python-headless numpy
"""
import json, sys, cv2, numpy as np

cfg = json.load(open(sys.argv[1]))
img = cv2.imread(cfg['image'])
H, W = img.shape[:2]

# --- sziluett: minden, ami nem közel-fehér háttér ---
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
sil = (gray < cfg.get('backgroundThreshold', 225)).astype(np.uint8) * 255
sil = cv2.morphologyEx(sil, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))   # apró lyukak (csillanás) zárása
sil = cv2.morphologyEx(sil, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))    # zaj eltávolítása

def refine(poly):
    m = np.zeros((H, W), np.uint8)
    cv2.fillPoly(m, [np.array(poly, np.int32)], 255)
    m = cv2.bitwise_and(m, sil)
    cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts:
        raise SystemExit(f'üres maszk: {poly}')
    c = max(cnts, key=cv2.contourArea)                 # a legnagyobb összefüggő rész
    c = cv2.approxPolyDP(c, 1.2, True).reshape(-1, 2)  # ~1 px tűréssel egyszerűsítve
    return 'M ' + ' L '.join(f'{x} {y}' for x, y in c) + ' Z', int(cv2.contourArea(c))

lines = []
for p in cfg['pieces']:
    d, area = refine(p['poly'])
    extra = ''
    if 'labelAngle' in p: extra += f", labelAngle: {p['labelAngle']}"
    if p.get('defaultLabel'): extra += ', defaultLabel: true'
    if 'patternTransform' in p: extra += f", patternTransform: '{p['patternTransform']}'"
    lines.append(f"    {{ id: '{p['id']}', name: '{p['name']}', group: '{p['group']}', size: '{p['size']}'{extra},\n      d: '{d}' }},")
    print(f"{p['id']:16s} terület={area:6d} px²")

rel_img = cfg['image'].replace('public/', '')
out = f"""/**
 * {cfg['modelName']} – fotós nézet (termékfotó + darab-maszkok).
 *
 * GENERÁLT FÁJL: tools/photo-masks.py tools/photo-masks/{sys.argv[1].split('/')[-1]}
 * A durva sokszögeket a JSON-ban kell szerkeszteni; a szkript a fotó
 * sziluettjére vágja őket, így a maszk nem lóg a háttérre.
 * Koordináták: fotó-pixel ({W}×{H}). A darab-id-k a vázlat/vágófájl id-jai.
 */
export default {{
  image: '{rel_img}',
  viewBox: {{ width: {W}, height: {H} }},
  shading: {json.dumps(cfg.get('shading', {}))},
  pieces: [
{chr(10).join(lines)}
  ],
}};
"""
open(cfg['output'], 'w').write(out)
print('->', cfg['output'])
