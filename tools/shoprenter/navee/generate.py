# -*- coding: utf-8 -*-
"""Navee termék-payloadok generálása a naveeshop.hu magyar specifikációkból.
Árazás: 40% árrés 250 000 Ft alatti beszerzésnél, 35% fölötte.
Minden szöveg magyar, a 2026-09-01-én életbe lépett KRESZ szerinti besorolással."""
import json, re, os, sys

S = sys.argv[1] if len(sys.argv) > 1 else '.'
OUT = sys.argv[2] if len(sys.argv) > 2 else './termekek'
specs = json.load(open(S + '/navee_specs.json', encoding='utf8'))
imgs = json.load(open(S + '/navee_img_files.json', encoding='utf8'))

B2B = {'easyride-25-pro':92000,'gt3':138000,'gt3-max':175000,'st3':211000,'st3-pro':220000,'k100':64000,
       'k100-pro':83000,'k100-max':106000,'st5-pro':285000,'st5-max':303000,'xt5-pro':350000,
       'xt5-ultra':526000,'n65i-ii':230000}
# Beszerzési ár nélküli modellek: becsült ár, inaktív marad amíg a partner meg nem adja
BECSULT = {'nt5-max':300000,'nt5-ultra-x':500000,'v50i-pro':130000}

NEV = {'easyride-25-pro':'Easyride 25 Pro','gt3':'GT3','gt3-max':'GT3 Max','k100':'K100','k100-pro':'K100 Pro',
       'k100-max':'K100 Max','n65i-ii':'N65i II','nt5-max':'NT5 Max','nt5-ultra-x':'NT5 Ultra X','st3':'ST3',
       'st3-pro':'ST3 Pro','st5-max':'ST5 Max','st5-pro':'ST5 Pro','v50i-pro':'V50i Pro','xt5-pro':'XT5 Pro',
       'xt5-ultra':'XT5 Ultra'}
SKU = {k: 'WHSHNAVEE' + re.sub(r'[^A-Z0-9]', '', NEV[k].upper().replace(' II', '2')) for k in NEV}

def price(b):
    m = 0.60 if b < 250000 else 0.65
    x = b / m
    e = int(x // 1000)
    return e * 1000 + 900 if (x - e * 1000) < 900 else (e + 1) * 1000 + 900

def g(sp, *pats):
    for p in pats:
        for k, v in sp.items():
            if re.search(p, k, re.I):
                return tiszt(re.sub(r'\s+', ' ', str(v)).strip())
    return None

def tiszt(v):
    """A forrasoldal szamformatumainak javitasa: '7. 65Ah' -> '7,65Ah', lbs levagasa,
    a tobbszoros hatotav-ertekek olvashato tagolasa."""
    if not v: return v
    v = re.sub(r'(\d)\.\s+(\d)', r'\1,\2', v)          # 7. 65 -> 7,65
    v = re.sub(r'(\d)\.(\d)', r'\1,\2', v)              # 46.8 -> 46,8
    v = re.sub(r'\s*\(\d+\s*lbs?\)', '', v, flags=re.I)  # (331 lbs) el
    v = re.sub(r'(km/h-val|km/h sebességgel|kg\))\s*(?=\d)', r'\1 | ', v)
    v = re.sub(r'(\d+\s*km)\s*\|\s*', r'\1 | ', v)
    return re.sub(r'\s+', ' ', v).strip(' |')

def nevelo(nev):
    """Magyar hatarozott nevelo betuszavas modellnevekhez (XT5 -> az, GT3 -> a)."""
    n = nev.strip().upper()
    if n.startswith(('A', 'E', 'I', 'O', 'U', 'Á', 'É', 'Í', 'Ó', 'Ú')): return 'az'
    # betunkent kiejtve: X=iksz, S=es, N=en, M=em, F=ef, L=el, R=er
    return 'az' if n[0] in 'XSNMFLR' else 'a'

def num(s):
    if not s: return None
    m = re.search(r'([\d]+[.,]?\d*)', s.replace(' ', ''))
    return float(m.group(1).replace(',', '.')) if m else None

sp_ = lambda t: '<span style="font-size:16px;"><span style="color:#000000;">%s</span></span>' % t
P = lambda t: '<p>%s</p>' % sp_(t)
L = lambda t: '<li>%s</li>' % sp_(t)

def kresz_blokk(tomeg, nevleges, sebesseg, gyerek):
    """A 2026-09-01-én életbe lépett KRESZ szerinti besorolás."""
    if gyerek:
        return ([P('<strong>Fontos: mit mond az új KRESZ</strong>'),
                 P('2026. szeptember 1-jén életbe lépett az új KRESZ. Eszerint elektromos rollerrel közúton, '
                   'kerékpárúton és járdán <strong>csak 12 éves kor felett</strong> szabad közlekedni, bukósisakban. '
                   'Ez a roller 12 év alatti gyerekeknek készült, ezért <strong>közterületen nem használható</strong>: '
                   'zárt udvaron, magánterületen, parkban kijelölt helyen a helye. Szülői felügyelet és bukósisak '
                   'ott is kötelező. Ha bizonytalan vagy, hívj minket, elmondjuk pontosan, mi a helyzet.')])
    nagy = (tomeg or 0) >= 35
    if nagy:
        return ([P('<strong>Fontos: mit mond az új KRESZ</strong>'),
                 P('2026. szeptember 1-jén életbe lépett az új KRESZ. A rollereket teljesítmény, tömeg és '
                   'végsebesség szerint sorolja be. Ez a modell <strong>%s kg-os, vagyis a 35 kg-os határ fölött van, '
                   'így a nagyobb kategóriába esik</strong>: használatához bukósisak, felelősségbiztosítás és '
                   'vezetői engedély szükséges. Ezt előre megmondjuk, mert nem szeretnénk, hogy bírságot kapj. '
                   'Ha jogosítvány nélkül keresel rollert, nézd meg a 35 kg alatti modelleket, szívesen segítünk '
                   'választani.' % ('%g' % tomeg))])
    return ([P('<strong>Mit mond az új KRESZ</strong>'),
             P('2026. szeptember 1-jén életbe lépett az új KRESZ. Ez a modell a <strong>kis kategóriába esik</strong>: '
               'legfeljebb 25 km/h, 1000 W alatti névleges teljesítmény, 35 kg alatti tömeg. Ez azt jelenti, hogy '
               '<strong>vezetői engedély nélkül, 12 éves kortól használható</strong>. Bukósisak viselése kötelező, '
               'járdán legfeljebb 10 km/h, kerékpárúton és úttesten legfeljebb 20 km/h a megengedett sebesség. '
               'Sisakot nálunk is találsz, és a rollert eleve a szabályoknak megfelelően beállítva adjuk át.')])

def koltseg_blokk(wh, hatotav, gyerek=False):
    if not wh: return []
    if gyerek:
        kwh = wh / 1000
        return [P('<strong>Mibe kerül használni</strong>'),
                P('Egy teljes töltés %s kWh áramot használ, ami forintokban mérve elhanyagolható. '
                  'Cserébe a gyerek magától megy az iskolába, az edzésre, a barátokhoz, és nem kell mindenhova '
                  'autóval fuvarozni. Ez a szülőnek időben és üzemanyagban is sokat jelent.'
                  % ('%.2f' % kwh).replace('.', ','))]
    kwh = wh / 1000
    ar = round(kwh * 70)  # konzervatív, 70 Ft/kWh-val számolva
    t = ('Egy teljes töltés %s kWh áramot használ, ami a jelenlegi lakossági árammal <strong>nagyjából %d forint</strong>. '
         % (('%.2f' % kwh).replace('.', ','), max(ar, 10)))
    if hatotav:
        t += 'Ezzel akár %s kilométert mész. Aki naponta 10 km-t ingázik, annak ez havi néhány száz forintos üzemanyagköltség. ' % hatotav
    t += 'Parkolni ingyen parkolsz, dugóban nem állsz, és nincs se szervizdíj-sokk, se biztosítás, se súlyadó.'
    return [P('<strong>Mibe kerül használni</strong>'), P(t)]

def build(k):
    sp = specs[k]['spec']
    nev = NEV[k]
    gyerek = k.startswith('k100')
    tomeg = num(g(sp, r'nettó tömeg', r'^tömeg', r'súly'))
    nevleges = g(sp, r'névleges teljesítmény', r'névleges/max', r'névleges')
    maxw = g(sp, r'max\.? teljesítmény', r'maximális teljesítmény')
    seb = g(sp, r'max\.? sebesség')
    akku = g(sp, r'akkumulátor(?! felt)', r'akkumulátor kapacitás')
    feszultseg = g(sp, r'akkumulátor feszültség')
    hatotav = g(sp, r'max\.? hatótáv', r'hatótáv')
    gumi = g(sp, r'gumiabroncs', r'kerékméret', r'abroncs')
    fek = g(sp, r'fék')
    rugo = g(sp, r'felfüggesztés', r'rugóz')
    ip = g(sp, r'ip ?min', r'víz')
    toltes = g(sp, r'töltési idő(?! \(gyors)', r'töltési idő')
    terheles = g(sp, r'max\.? teherbírás', r'max\.? terhelhetőség')
    lejto = g(sp, r'max\.? lejtő', r'max\.? emelked', r'max\.? dőlés')
    wh = None
    for src in (akku, g(sp, r'akkumulátor kapacitás')):
        if src:
            m = re.search(r'([\d.,]+)\s*Wh', src, re.I)
            if m: wh = float(m.group(1).replace(',', '.')); break
    hatotav_rovid = None
    if hatotav:
        m = re.search(r'(\d+)\s*km', hatotav)
        if m: hatotav_rovid = m.group(1)

    # --- rövid leírás
    fo = []
    if nevleges: fo.append(nevleges + ' névleges motor')
    elif maxw: fo.append(maxw + ' motor')
    if akku: fo.append(akku + ' akkumulátor')
    if hatotav_rovid: fo.append('akár %s km hatótáv' % hatotav_rovid)
    if gumi: fo.append(gumi.split(',')[0])
    short = P('NAVEE %s – %s.' % (nev, ', '.join(fo[:4]) if fo else 'elektromos roller')) + \
            P('<strong>Hivatalos, magyar garanciás Navee, veszprémi és kapuvári szervizháttérrel.</strong> '
              'Összeszerelve, beállítva, feltöltve adjuk át, és megmutatjuk a használatát. '
              'Kérdésed van? Hívj, a rollerekhez tényleg értünk.')

    # --- leírás
    terep = (tomeg or 0) >= 30 or bool(re.search(r'terep|off.?road', (gumi or '') + (nev or ''), re.I))
    alcim = ('gyerekroller, amit komolyan vettek' if gyerek
             else 'nagy hatótávú túraroller a rosszabb utakra is' if terep
             else 'városi roller, ami a magyar utakat is bírja')
    d = [P('<strong>NAVEE %s – %s</strong>' % (nev, alcim))]
    if gyerek:
        d.append(P('A Navee K-szériát 6 és 14 év közötti gyerekeknek tervezték: alacsony sebesség, applikációból '
                   'állítható sebességkorlát, könnyű, kezelhető tömeg. Nem játék, hanem rendes gyártói minőség, '
                   'olyan márkától, ami a felnőtt rollerpiac élmezőnyében van.'))
    else:
        if terep:
            d.append(P('A Navee a városi elektromos rollerek egyik legjobb ár-érték arányú márkája, %s %s pedig a '
                       'felső kategóriája: %s Nem a panelházig tartó kétszáz méterre való, hanem arra, hogy '
                       'hétvégén is elmenj vele, murvás dűlőúton és emelkedőn is.'
                       % (nevelo(nev), nev,
                          ('komoly futómű, erős fékek, nagy akkumulátor.' if not hatotav_rovid
                           else 'egy töltéssel akár %s kilométer, komoly futómű és erős fékek.' % hatotav_rovid))))
        else:
            d.append(P('A Navee a városi elektromos rollerek egyik legjobb ár-érték arányú márkája. %s %s a '
                       'mindennapi ingázásra készült: %s Az egész gép arra van kitalálva, hogy reggel elindulj vele, '
                       'és este ugyanúgy hazaérj, esőben is.'
                       % (nevelo(nev).capitalize(), nev,
                          ('erős váz, komoly fékrendszer és tisztességes hatótáv.' if not hatotav_rovid
                           else 'egy töltéssel akár %s kilométer, erős váz és komoly fékrendszer.' % hatotav_rovid))))

    d += kresz_blokk(tomeg, nevleges, seb, gyerek)

    d.append(P('<strong>Amit tudni érdemes róla</strong>'))
    d.append('<ul>')
    if nevleges and maxw: d.append(L('<strong>Motor:</strong> %s névleges, %s csúcsteljesítmény' % (nevleges, maxw)))
    elif maxw: d.append(L('<strong>Motor:</strong> %s' % maxw))
    if akku: d.append(L('<strong>Akkumulátor:</strong> %s' % akku))
    if hatotav: d.append(L('<strong>Hatótáv:</strong> %s' % hatotav))
    if fek: d.append(L('<strong>Fékrendszer:</strong> %s' % fek))
    if rugo: d.append(L('<strong>Felfüggesztés:</strong> %s' % rugo))
    if gumi: d.append(L('<strong>Gumik:</strong> %s' % gumi))
    if ip: d.append(L('<strong>Vízállóság:</strong> %s – a magyar őszi-tavaszi időjáráshoz ez nem mellékes' % ip))
    if lejto: d.append(L('<strong>Emelkedő:</strong> %s' % lejto))
    if terheles: d.append(L('<strong>Terhelhetőség:</strong> %s' % terheles))
    d.append('</ul>')

    d += koltseg_blokk(wh, hatotav_rovid, gyerek)

    d.append(P('<strong>Műszaki adatok</strong>'))
    d.append('<table border="1" cellpadding="4" style="border-collapse:collapse;"><tbody>')
    for cim, ertek in [('Modell', 'NAVEE ' + nev), ('Névleges teljesítmény', nevleges), ('Max. teljesítmény', maxw),
                       ('Akkumulátor', akku), ('Akkumulátor feszültsége', feszultseg), ('Hatótáv', hatotav),
                       ('Végsebesség', seb), ('Emelkedő', lejto), ('Fék', fek), ('Felfüggesztés', rugo),
                       ('Gumiabroncs', gumi), ('Tömeg', ('%g kg' % tomeg) if tomeg else None),
                       ('Terhelhetőség', terheles), ('Vízállóság', ip), ('Töltési idő', toltes)]:
        if ertek:
            d.append('<tr><td><strong>%s</strong></td><td>%s</td></tr>' % (cim, ertek))
    d.append('</tbody></table>')

    d.append(P('<strong>Miért tőlünk vedd</strong><br />'
               'Hét éve csinálunk elektromos rollert, és nem csak dobozt adunk át. Saját szervizünk van Veszprémben '
               'és Kapuváron, alkatrészraktárral, akkumulátor-építéssel és vezérlőszervizzel. Ha baj van, nem '
               'külföldre kell küldened a rollert, hanem behozod hozzánk. Átvételkor összeszereljük, beállítjuk, '
               'feltöltjük, és végigmegyünk veled a kezelésén meg az új KRESZ szabályain. Ez a különbség egy '
               'áruházi doboz és egy szaküzlet között.'))

    desc = '\n'.join(d)
    meta_t = 'NAVEE %s elektromos roller – %s%s' % (
        nev,
        (nevleges + ', ') if nevleges else '',
        ('akár %s km' % hatotav_rovid) if hatotav_rovid else 'magyar garancia')
    meta_d = ('NAVEE %s elektromos roller hivatalos magyar garanciával. %s%s%s Veszprémi és kapuvári szervizháttér, '
              'összeszerelve, beállítva adjuk át.' % (
                  nev,
                  (akku + '. ') if akku else '',
                  ('Hatótáv akár %s km. ' % hatotav_rovid) if hatotav_rovid else '',
                  ('Végsebesség %s. ' % seb) if seb else ''))[:300]
    kulcs = ('navee %s, navee %s ár, navee elektromos roller, %s elektromos roller, elektromos roller magyar garanciával, '
             'elektromos roller veszprém' % (nev.lower(), nev.lower(), nev.lower()))

    b = B2B.get(k) or BECSULT[k]
    ar = price(b)
    kategoriak = ['Y2F0ZWdvcnktY2F0ZWdvcnlfaWQ9MTM4', 'Y2F0ZWdvcnktY2F0ZWdvcnlfaWQ9MzQz']  # 138 + 343 NAVEE
    if gyerek:
        kategoriak.append('Y2F0ZWdvcnktY2F0ZWdvcnlfaWQ9MTQz')  # 143 gyerek
    else:
        kategoriak.append('Y2F0ZWdvcnktY2F0ZWdvcnlfaWQ9MTQy')  # 142 felnőtt
        if (tomeg or 0) < 35:
            kategoriak.append('Y2F0ZWdvcnktY2F0ZWdvcnlfaWQ9MTgz')  # 183 jogosítvány nélkül

    reszek = []
    m = re.search(r'([\d,]+)\s*V', (akku or '') + ' ' + (feszultseg or ''), re.I)
    if m: reszek.append(re.sub(r',0$', '', m.group(1)) + 'V')
    if maxw:
        # tobbfele regios ertek eseten (pl. "250W/1350W (EU-SE) 600W/1350W") a legnagyobb megy a nevbe
        wk = [float(x.replace(',', '.')) for x in re.findall(r'([\d,]+)\s*W', maxw, re.I)]
        szorzo = 2 if re.search(r'[*×x]\s*2|2\s*[*×x]', maxw) else 1
        if wk:
            reszek.append(('%gWx2' % max(wk)) if szorzo == 2 else '%gW' % max(wk))
        else:
            reszek.append(re.sub(r'\s+', '', maxw))
    m = re.search(r'([\d,]+)\s*Ah', akku or '', re.I)
    if m: reszek.append(m.group(1) + 'Ah')
    elif wh: reszek.append(('%g' % wh).replace('.', ',') + 'Wh')
    cimke = 'Gyerek elektromos roller' if gyerek else 'Elektromos roller'
    leiras = {'name': 'NAVEE %s - %s%s' % (nev, cimke, (' - ' + ' - '.join(reszek)) if reszek else ''),
              'metaTitle': meta_t[:120], 'metaDescription': meta_d, 'metaKeywords': kulcs,
              'shortDescription': short, 'description': desc, 'measurementUnit': 'db'}
    fajlok = imgs.get(k, [])
    payload = {
        'sku': SKU[k], 'status': '0', 'price': '%.4f' % (ar / 1.27), 'stock1': '0',
        'orderable': '1', 'subtractStock': '1', 'shipped': '1', 'minimalOrderNumber': '1',
        'maximalOrderNumber': '0', 'freeShipping': '0', 'sortOrder': '1',
        'weight': ('%.2f' % tomeg) if tomeg else '0.00',
        'weightUnit': {'id': 'd2VpZ2h0Q2xhc3Mtd2VpZ2h0X2NsYXNzX2lkPTE='},
        'mainPicture': 'product/navee-%s/%s' % (k, fajlok[0]) if fajlok else '',
        'imageAlt': 'NAVEE %s elektromos roller' % nev,
        'taxClass': {'id': 'dGF4Q2xhc3MtdGF4X2NsYXNzX2lkPTEw'},
        'productClass': {'id': 'cHJvZHVjdENsYXNzLXByb2R1Y3RfY2xhc3NfaWQ9OQ=='},
        'manufacturer': {'id': 'bWFudWZhY3R1cmVyLW1hbnVmYWN0dXJlcl9pZD0xMjI='},
        'inStockStatus': {'id': 'c3RvY2tTdGF0dXMtc3RvY2tfc3RhdHVzX2lkPTk='},
        'onlyStock1Status': {'id': 'c3RvY2tTdGF0dXMtc3RvY2tfc3RhdHVzX2lkPTk='},
        'noStockStatus': {'id': 'c3RvY2tTdGF0dXMtc3RvY2tfc3RhdHVzX2lkPTU='},
        'productDescriptions': [dict(leiras, language={'id': 'bGFuZ3VhZ2UtbGFuZ3VhZ2VfaWQ9MQ=='}),
                                dict(leiras, language={'id': 'bGFuZ3VhZ2UtbGFuZ3VhZ2VfaWQ9NA=='})],
        'productCategoryRelations': [{'category': {'id': c}} for c in kategoriak],
    }
    attr = {'nums': {}, 'lists': []}
    if maxw:
        w = num(re.sub(r'\*\s*2|×\s*2|x\s*2', '', maxw))
        mult = 2 if re.search(r'[*×x]\s*2|2\s*[*×x]', maxw) else 1
        if w: attr['nums'][5] = str(int(w * mult))
    if akku:
        m = re.search(r'([\d.,]+)\s*Ah', akku, re.I)
        if m: attr['nums'][6] = m.group(1).replace(',', '.')
    if seb:
        v = num(seb)
        if v: attr['nums'][7] = str(int(v))
    if tomeg: attr['nums'][8] = str(int(round(tomeg)))
    if terheles:
        v = num(terheles)
        if v: attr['nums'][9] = str(int(v))
    if gumi:
        m = re.search(r'([\d.,]+)\s*(?:col|hüvelyk|″|")', gumi)
        if m: attr['nums'][14] = m.group(1).replace(',', '.')
    if akku:
        m = re.search(r'([\d.,]+)\s*V', akku, re.I) or (re.search(r'([\d.,]+)\s*V', feszultseg or '', re.I))
        if m: attr['nums'][23] = str(int(float(m.group(1).replace(',', '.'))))
    if hatotav_rovid: attr['nums'][28] = hatotav_rovid
    if fek:
        f = fek.lower()
        attr['lists'].append((11, 6 if 'hidraulik' in f else 4 if ('első' in f and 'tárcs' in f and 'hátsó' in f) else 8 if 'tárcs' in f else 3))
    attr['lists'].append((15, 2))          # felfújható
    if rugo:
        r = rugo.lower()
        attr['lists'].append((25, 3 if ('első' in r and 'hátsó' in r) else 1 if 'első' in r else 4))
    attr['lists'].append((2, 8))           # fekete
    return payload, attr, fajlok, {'b2b': b, 'ar': ar, 'becsult': k in BECSULT, 'tomeg': tomeg, 'gyerek': gyerek}

os.makedirs(OUT, exist_ok=True)
osszes = {}
for k in NEV:
    payload, attr, fajlok, info = build(k)
    json.dump(payload, open('%s/navee-%s.json' % (OUT, k), 'w', encoding='utf8'), ensure_ascii=False, indent=2)
    osszes[k] = {'sku': payload['sku'], 'attr': attr, 'kepek': fajlok, **info}
    print('%-16s %-22s %9s Ft  %s%s' % (k, payload['sku'], format(info['ar'], ','), '%d kép' % len(fajlok),
                                        '  [BECSÜLT ÁR]' if info['becsult'] else ''))
json.dump(osszes, open(OUT + '/_navee_meta.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
