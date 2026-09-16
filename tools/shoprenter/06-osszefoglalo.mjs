// 6. fázis: záró összesítő az archívumról (mennyiségek, hiányok, ellenőrző számok).
import { migracioDir, writeJson, readJson, path, fs } from './lib.mjs'

const adatDir = path.join(migracioDir, 'adat')
const be = async p => { try { return await readJson(path.join(adatDir, p)) } catch { return null } }

const teljes = await be('termekek-teljes.json')
const publikus = await be('termekek.json')
const kepMan = await be('kepek-manifest-teljes.json')
const tartalmi = await be('tartalmi-kepek-manifest.json')
const terkep = await be(path.join('..', 'atiranyitas', '301-terkep-teljes.json'))

async function mappaMeret (d) {
  let bajt = 0; let db = 0
  async function be2 (p) {
    let el; try { el = await fs.readdir(p, { withFileTypes: true }) } catch { return }
    for (const e of el) {
      const fp = path.join(p, e.name)
      if (e.isDirectory()) await be2(fp); else { db++; bajt += (await fs.stat(fp)).size }
    }
  }
  await be2(d); return { db, bajt }
}
const kepMeret = await mappaMeret(path.join(migracioDir, 'kepek'))

const t = teljes || []
const osszefoglalo = {
  keszult: new Date().toISOString(),
  forras: {
    bolt: 'https://elektromos-roller.net',
    api: 'https://elektromosroller.api.myshoprenter.hu',
    modszer: 'Shoprenter REST API (teljes katalógus) + publikus boltoldalak (kiegészítésként)'
  },
  mennyisegek: {
    termek_osszes: t.length,
    termek_publikalt: t.filter(x => x.publikalt).length,
    termek_rejtett: t.filter(x => !x.publikalt).length,
    termek_csak_publikus_mentesben: publikus?.length ?? null,
    termekkep_fajl: kepMan?.osszes_kepfajl ?? null,
    termek_kepmappa: kepMan?.termek_mappak ?? null,
    egyedi_kep_url: kepMan?.egyedi_kep_url ?? null,
    csak_boltoldalon_talalt_kep: (kepMan?.csak_boltoldalon_potolt || []).filter(p => p.allapot === 'potolva').length,
    tartalmi_kep: tartalmi?.letoltve ?? null,
    kepmappa_fajl_osszesen: kepMeret.db,
    kepmappa_meret_mb: Number((kepMeret.bajt / 1048576).toFixed(1)),
    kategoria: new Set(t.flatMap(x => x.kategoriak.map(k => k.nev))).size,
    gyarto: new Set(t.map(x => x.gyarto).filter(Boolean)).size,
    atiranyitas_sor: terkep?.darab ?? null
  },
  adatteljesseg: {
    nev_nelkul: t.filter(x => !x.nev).length,
    regi_cim_nelkul: t.filter(x => !x.regi_slug).length,
    kep_nelkul: t.filter(x => !x.kepek.length).length,
    kategoria_nelkul: t.filter(x => !x.kategoriak.length).length,
    hosszu_leiras_nelkul: t.filter(x => !x.leiras.teljes).length,
    pontos_keszlettel: t.filter(x => x.keszlet.darab != null).length,
    beszerzesi_arral: t.filter(x => x.ar.beszerzesi).length,
    akcios_arral: t.filter(x => x.ar.akciok.length).length,
    gtin_nel: t.filter(x => x.gtin).length
  },
  megjegyzesek: [
    'Az árak NETTÓ értékek. A bruttó ár 27% áfával: netto * 1.27 – ezt 377 terméken ellenőriztük a bolt publikus bruttó áraival szemben.',
    'A rejtett (status 0) termékek régi címére is érkezhet forgalom külső hivatkozásokból, ezért a webcím-térkép rájuk is tartalmaz sort.',
    'A képarchívum két forrás uniója: az API productImages/mainPicture mezői, plusz néhány kép, amit csak a termékoldal rak ki.'
  ],
  ismert_hianyok: [
    'Vevő-, rendelés-, számla- és kuponadat nincs az archívumban – azt a Shoprenter admin felületéről kell exportálni.',
    'A nem hivatkozott médiatár-fájlok (amikre sem termék, sem oldal nem mutat) nem szerepelnek.'
  ]
}
await writeJson(path.join(adatDir, 'osszefoglalo.json'), osszefoglalo)
process.stderr.write(JSON.stringify({ ...osszefoglalo.mennyisegek, ...osszefoglalo.adatteljesseg }, null, 2) + '\n')
