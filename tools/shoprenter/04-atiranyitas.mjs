// 4. fázis: webcím-térkép a 301 átirányításokhoz (régi Shoprenter cím -> javasolt WooCommerce cím).
//
// Alapelv: a slug ALAPBÓL VÁLTOZATLAN marad. Költözésnél ez a helyes döntés —
// nulla ütközési kockázat, és a Google-nél felépített minden link megőrzi az értékét.
// A Shoprenter a duplikált terméknevekhez a termék azonosítóját ragasztja utótagként
// (pl. ...-2771). Ezek kozmetikailag zavaróak, ezért külön, OPCIONÁLIS oszlopban
// javaslunk tisztított változatot — de csak ott, ahol az nem ütközik másik slug-gal.
import { migracioDir, writeJson, readJson, slugify, ensureDir, path, fs } from './lib.mjs'

const adatDir = path.join(migracioDir, 'adat')
const termekek = await readJson(path.join(adatDir, 'termekek.json'))
const kategoriak = await readJson(path.join(adatDir, 'kategoriak.json'))
const oldalak = await readJson(path.join(adatDir, 'oldalak.json'))

// WooCommerce / WordPress útvonal-előtagok (magyar beállítás)
const ELOTAG = { termek: 'termek', kategoria: 'termek-kategoria', oldal: '' }

const mindenSlug = new Set([...termekek, ...kategoriak, ...oldalak].map(x => x.slug).filter(Boolean))

const sorok = []
const foglalt = new Map()

function felvesz (rec, tipus) {
  const alap = rec.slug || slugify(rec.nev || '') || `elem-${rec.shoprenter_id || sorok.length}`
  const megjegyzes = []

  // ütközésfeloldás típuson belül (elvileg nem fordulhat elő, a Shoprenter már egyedi)
  let ujSlug = alap
  const kulcs = () => `${tipus}:${ujSlug}`
  if (foglalt.has(kulcs())) {
    ujSlug = `${alap}-${rec.shoprenter_id || sorok.length}`
    megjegyzes.push('slug-ütközés feloldva a Shoprenter-azonosítóval')
  }
  foglalt.set(kulcs(), rec.url)

  // opcionális tisztítás: csak valódi azonosító-utótagnál, és csak ha az alap szabad
  let tisztitott = null
  const m = alap.match(/^(.+?)-(\d{3,6})$/)
  if (m && rec.shoprenter_id && String(rec.shoprenter_id) === m[2]) {
    if (mindenSlug.has(m[1])) {
      megjegyzes.push(`azonosító-utótag (-${m[2]}), de a "${m[1]}" slug már foglalt – maradjon változatlan`)
    } else {
      tisztitott = m[1]
      megjegyzes.push(`opcionálisan tisztítható: az -${m[2]} utótag a Shoprenter azonosítója`)
    }
  }

  const elotag = ELOTAG[tipus]
  const ujUtvonal = elotag ? `/${elotag}/${ujSlug}/` : `/${ujSlug}/`

  sorok.push({
    regi_url: rec.url,
    regi_utvonal: rec.utvonal,
    tipus,
    nev: rec.nev || null,
    shoprenter_id: rec.shoprenter_id ?? null,
    cikkszam: rec.cikkszam ?? null,
    uj_slug: ujSlug,
    javasolt_uj_utvonal: ujUtvonal,
    opcionalis_tisztitott_slug: tisztitott,
    opcionalis_tisztitott_utvonal: tisztitott ? (elotag ? `/${elotag}/${tisztitott}/` : `/${tisztitott}/`) : null,
    // Ha a WooCommerce-ben a termék-permalink alapja üresre van állítva (lapos linkek),
    // a gyökérszintű régi cím változatlanul megtartható, és átirányítás sem kell.
    lapos_linkkel_valtozatlan: rec.utvonal === `/${ujSlug}`,
    megjegyzes: megjegyzes.join('; ') || null
  })
}

for (const t of termekek) felvesz(t, 'termek')
for (const k of kategoriak) felvesz(k, 'kategoria')
for (const o of oldalak) {
  if (o.utvonal === '/' || o.utvonal === '') {
    sorok.push({
      regi_url: o.url, regi_utvonal: '/', tipus: 'fooldal', nev: 'Főoldal', shoprenter_id: null, cikkszam: null,
      uj_slug: '', javasolt_uj_utvonal: '/', opcionalis_tisztitott_slug: null, opcionalis_tisztitott_utvonal: null,
      lapos_linkkel_valtozatlan: true, megjegyzes: 'főoldal, átirányítás nem kell'
    })
    continue
  }
  felvesz(o, 'oldal')
}

const atDir = path.join(migracioDir, 'atiranyitas')
await ensureDir(atDir)
await writeJson(path.join(atDir, '301-terkep.json'), { keszult: new Date().toISOString(), darab: sorok.length, sorok })

const csvEsc = v => {
  const s = v == null ? '' : String(v)
  return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}
const fejlec = ['regi_url', 'regi_utvonal', 'tipus', 'nev', 'shoprenter_id', 'cikkszam', 'uj_slug',
  'javasolt_uj_utvonal', 'opcionalis_tisztitott_slug', 'opcionalis_tisztitott_utvonal', 'lapos_linkkel_valtozatlan', 'megjegyzes']
const csv = [fejlec.join(';'), ...sorok.map(r => fejlec.map(f => csvEsc(r[f])).join(';'))].join('\n') + '\n'
await fs.writeFile(path.join(atDir, '301-terkep.csv'), '﻿' + csv, 'utf8')

const atiranyitando = sorok.filter(r => r.tipus !== 'fooldal' && r.regi_utvonal !== r.javasolt_uj_utvonal)

const wp = ['source,target,regex,code',
  ...atiranyitando.map(r => `${csvEsc(r.regi_utvonal)},${csvEsc(r.javasolt_uj_utvonal)},0,301`)].join('\n') + '\n'
await fs.writeFile(path.join(atDir, 'redirection-plugin.csv'), wp, 'utf8')

const nginx = ['# Whoosh – Shoprenter -> WooCommerce 301 átirányítások',
  '# a server{} blokkba: include /etc/nginx/snippets/whoosh-301.conf;', '',
  ...atiranyitando.map(r => `location = ${r.regi_utvonal} { return 301 ${r.javasolt_uj_utvonal}; }`)].join('\n') + '\n'
await fs.writeFile(path.join(atDir, 'redirects-nginx.conf'), nginx, 'utf8')

const ht = ['# Whoosh – Shoprenter -> WooCommerce 301 átirányítások (.htaccess)', 'RewriteEngine On', '',
  ...atiranyitando.map(r => `Redirect 301 ${r.regi_utvonal} ${r.javasolt_uj_utvonal}`)].join('\n') + '\n'
await fs.writeFile(path.join(atDir, 'redirects-htaccess.txt'), ht, 'utf8')

const szamlalo = sorok.reduce((a, r) => (a[r.tipus] = (a[r.tipus] || 0) + 1, a), {})
process.stderr.write(`Webcím-térkép: ${sorok.length} sor (${Object.entries(szamlalo).map(([k, v]) => `${k}: ${v}`).join(', ')})\n`)
process.stderr.write(`Átirányítandó (előtagos WooCommerce úttal): ${atiranyitando.length}\n`)
process.stderr.write(`Lapos terméklink esetén átirányítás nélkül megtartható: ${sorok.filter(r => r.lapos_linkkel_valtozatlan).length}\n`)
process.stderr.write(`Opcionálisan tisztítható slug: ${sorok.filter(r => r.opcionalis_tisztitott_slug).length}\n`)
