// 9. fázis: a publikus boltból és az API-ból származó képkészlet összefésülése.
//
// Az API a bővebb forrás (a nem publikált termékeket is látja), de NEM szigorú
// felülhalmaza a publikusnak: néhány kép, amit a termékoldal kirak, nem szerepel
// sem a productImages, sem a mainPicture mezőben. Az archívum a kettő uniója legyen.
//
// Az összehasonlítás DEKÓDOLT útvonalon megy: ugyanaz a fájl más URL-kódolással is
// hivatkozható (pl. a "&" mint %26), és nyers URL-t hasonlítva hamis eltérést kapnánk.
import { createHash } from 'node:crypto'
import { cacheDir, migracioDir, writeJson, readJson, safeFilename, fileSize, path, fs } from './lib.mjs'

const adatDir = path.join(migracioDir, 'adat')
const teljes = await readJson(path.join(adatDir, 'kepek-manifest-teljes.json'))
let publikus = null
try { publikus = await readJson(path.join(adatDir, 'kepek-manifest.json')) } catch {}

const norm = u => {
  const rel = String(u).replace(/^.*?\/image\/data\//, '')
  try { return decodeURIComponent(rel) } catch { return rel }
}
const blobDir = path.join(cacheDir, 'kepblob')
const blobPath = u => {
  const ext = (u.match(/\.([A-Za-z0-9]{2,5})$/) || [])[1] || 'bin'
  return path.join(blobDir, createHash('sha1').update(u).digest('hex') + '.' + ext.toLowerCase())
}

const apiUtak = new Set()
for (const t of teljes.termekek) for (const k of t.kepek) if (k.url) apiUtak.add(norm(k.url))

const mappaSzerint = new Map(teljes.termekek.map(t => [t.mappa, t]))
const potolt = []

if (publikus) {
  for (const t of publikus.termekek) {
    for (const k of t.kepek) {
      if (!k.url || apiUtak.has(norm(k.url))) continue
      const cel = mappaSzerint.get(t.slug)
      if (!cel) { potolt.push({ slug: t.slug, url: k.url, allapot: 'nincs_ilyen_mappa' }); continue }
      const forras = blobPath(k.url)
      if ((await fileSize(forras)) < 100) { potolt.push({ slug: t.slug, url: k.url, allapot: 'nincs_a_gyorsitotarban' }); continue }
      const idx = cel.kepek.length + 1
      const nev = `${String(idx).padStart(2, '0')}-${safeFilename(decodeURIComponent(k.url.split('/').pop()))}`
      const celFajl = path.join(migracioDir, 'kepek', t.slug, nev)
      await fs.copyFile(forras, celFajl)
      const bejegyzes = {
        url: k.url,
        szerep: 'csak_boltoldalon',
        fajl: path.relative(migracioDir, celFajl),
        meret: await fileSize(celFajl),
        fo_kep: false,
        megjegyzes: 'a termékoldal kirakja, de az API productImages/mainPicture mezőjében nem szerepel'
      }
      cel.kepek.push(bejegyzes)
      potolt.push({ slug: t.slug, url: k.url, allapot: 'potolva', fajl: bejegyzes.fajl })
    }
  }
}

teljes.forras = 'Shoprenter API (productImages + products.mainPicture) ∪ publikus termékoldalak'
teljes.osszefesulve = new Date().toISOString()
teljes.csak_boltoldalon_potolt = potolt
teljes.osszes_kepfajl = teljes.termekek.reduce((a, t) => a + t.kepek.filter(k => k.fajl).length, 0)
teljes.osszes_bajt = teljes.termekek.reduce((a, t) => a + t.kepek.reduce((b, k) => b + (k.meret || 0), 0), 0)
await writeJson(path.join(adatDir, 'kepek-manifest-teljes.json'), teljes)

process.stderr.write(`Pótolt, csak a boltoldalon szereplő kép: ${potolt.filter(p => p.allapot === 'potolva').length}\n`)
for (const p of potolt.filter(p => p.allapot !== 'potolva')) process.stderr.write(`  FIGYELEM (${p.allapot}): ${p.url}\n`)
process.stderr.write(`Archívum összesen: ${teljes.osszes_kepfajl} képfájl, ${(teljes.osszes_bajt / 1048576).toFixed(1)} MB\n`)
