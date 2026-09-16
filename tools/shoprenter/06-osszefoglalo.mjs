// 6. fázis: záró összesítő az archívumról (mennyiségek, hiányok, ellenőrző számok).
import { migracioDir, writeJson, readJson, path, fs } from './lib.mjs'

const adatDir = path.join(migracioDir, 'adat')
const termekek = await readJson(path.join(adatDir, 'termekek.json'))
const kategoriak = await readJson(path.join(adatDir, 'kategoriak.json'))
const oldalak = await readJson(path.join(adatDir, 'oldalak.json'))
const terkep = await readJson(path.join(migracioDir, 'atiranyitas', '301-terkep.json'))
let kepMan = null; let tartalmiMan = null
try { kepMan = await readJson(path.join(adatDir, 'kepek-manifest.json')) } catch {}
try { tartalmiMan = await readJson(path.join(adatDir, 'tartalmi-kepek-manifest.json')) } catch {}

async function mappaMeret (d) {
  let bajt = 0; let db = 0
  async function be (p) {
    let el
    try { el = await fs.readdir(p, { withFileTypes: true }) } catch { return }
    for (const e of el) {
      const fp = path.join(p, e.name)
      if (e.isDirectory()) await be(fp)
      else { db++; bajt += (await fs.stat(fp)).size }
    }
  }
  await be(d)
  return { db, bajt }
}
const kepMeret = await mappaMeret(path.join(migracioDir, 'kepek'))

const galeriaOsszesen = termekek.reduce((a, t) => a + t.kepek.length, 0)
const videos = termekek.filter(t => t.videok?.length)

const osszefoglalo = {
  keszult: new Date().toISOString(),
  forras: {
    bolt: 'https://elektromos-roller.net',
    motor: 'ShopRenter',
    cdn: 'https://elektromosroller.cdn.shoprenter.hu/custom/elektromosroller',
    modszer: 'publikus sitemap + termékoldalak feldolgozása (az API-kulcs nem működött)'
  },
  mennyisegek: {
    sitemap_url: terkep.darab,
    termek: termekek.length,
    kategoria: kategoriak.length,
    egyeb_oldal: oldalak.length,
    termekkep_galeriaban: galeriaOsszesen,
    egyedi_termekkep_url: new Set(termekek.flatMap(t => t.kepek)).size,
    letoltott_termekkep_fajl: kepMan?.osszes_kepfajl ?? null,
    termek_mappa: kepMan?.termek_mappak ?? null,
    tartalmi_kep: tartalmiMan?.letoltve ?? null,
    kepmappa_fajl_osszesen: kepMeret.db,
    kepmappa_meret_mb: Number((kepMeret.bajt / 1048576).toFixed(1)),
    beagyazott_video: videos.reduce((a, t) => a + t.videok.length, 0)
  },
  adatteljesseg: {
    nev_nelkul: termekek.filter(t => !t.nev).length,
    cikkszam_nelkul: termekek.filter(t => !t.cikkszam).length,
    ar_nelkul: termekek.filter(t => t.ar.brutto == null).length,
    kep_nelkul: termekek.filter(t => !t.kepek.length).length,
    hosszu_leiras_nelkul: termekek.filter(t => !t.leiras_html).length,
    csak_rovid_leirassal: termekek.filter(t => !t.leiras_html && t.rovid_leiras).length,
    meta_leiras_nelkul: termekek.filter(t => !t.meta_leiras).length,
    kategoria_nelkul: termekek.filter(t => !t.kategoria_utvonal?.length).length,
    raktaron: termekek.filter(t => t.keszlet.raktaron === true).length,
    nincs_raktaron: termekek.filter(t => t.keszlet.raktaron === false).length
  },
  atiranyitas: {
    sorok: terkep.darab,
    elotagos_uttal_atiranyitando: terkep.sorok.filter(r => r.tipus !== 'fooldal' && r.regi_utvonal !== r.javasolt_uj_utvonal).length,
    lapos_linkkel_valtozatlan: terkep.sorok.filter(r => r.lapos_linkkel_valtozatlan).length,
    opcionalisan_tisztithato_slug: terkep.sorok.filter(r => r.opcionalis_tisztitott_slug).length
  },
  ismert_hianyok: [
    'A Shoprenter REST API a megadott kulccsal 401-et ad, ezért az archívum a publikus boltoldalakból készült.',
    'Emiatt NEM tartalmazza: a nem publikált/inaktív termékeket, a nem listázott médiatár-fájlokat és a pontos darabszámú készletértékeket (csak a bolt által kiírt elérhetőségi szöveg és a schema.org InStock/OutOfStock szerepel).',
    'Vevő-, rendelés- és számlaadat nincs az archívumban; azt a Shoprenter admin felületéről kell exportálni.'
  ]
}
await writeJson(path.join(adatDir, 'osszefoglalo.json'), osszefoglalo)
process.stderr.write(JSON.stringify(osszefoglalo.mennyisegek, null, 2) + '\n')
