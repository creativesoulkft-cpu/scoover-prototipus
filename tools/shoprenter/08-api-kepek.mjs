// 8. fázis: a TELJES képállomány letöltése az API adatai alapján, eredeti felbontásban.
// Ez tartalmazza a nem publikált termékek képeit is, amiket a boltoldalról nem lehet elérni.
import { createHash } from 'node:crypto'
import { cacheDir, migracioDir, curlBatch, ensureDir, writeJson, readJson, safeFilename, slugify, fileSize, path, fs, CDN } from './lib.mjs'
import { dekodolId } from './sr-api.mjs'

const adatDir = path.join(migracioDir, 'adat')
const apiDir = path.join(adatDir, 'api')
const termekek = await readJson(path.join(apiDir, 'products.json'))
const kepek = await readJson(path.join(apiDir, 'productImages.json'))
const leirasok = await readJson(path.join(apiDir, 'productDescriptions.json'))

// publikus termékek: a korábbi, boltoldalról készült mentésből – hogy a mappanevek
// megegyezzenek a már meglévő archívuméval
let publikus = []
try { publikus = await readJson(path.join(adatDir, 'termekek.json')) } catch {}
const slugCikkszam = new Map(publikus.filter(t => t.cikkszam).map(t => [String(t.cikkszam), t.slug]))

// termék-azonosító -> név (az első nyelv leírásából)
const nevMap = new Map()
for (const l of leirasok) {
  const pid = String(l.product?.href || '').split('/').pop()
  if (pid && l.name && !nevMap.has(pid)) nevMap.set(pid, l.name)
}

// termék-azonosító -> termék
const termekMap = new Map(termekek.map(t => [String(t.id), t]))

// mappanév termékenként: elsősorban a publikus slug (cikkszám alapján), különben a névből
const mappaNev = new Map()
const hasznalt = new Set()
for (const t of termekek) {
  const id = String(t.id)
  const szam = dekodolId(id).szam
  let nev = slugCikkszam.get(String(t.sku)) || slugify(nevMap.get(id) || '') || slugify(t.sku || '') || `termek-${szam || id.slice(0, 8)}`
  if (hasznalt.has(nev)) nev = `${nev}-${szam || id.slice(0, 6)}`
  hasznalt.add(nev)
  mappaNev.set(id, nev)
}

// kép-lista termékenként: főkép elöl, utána a galéria sortOrder szerint
const perTermek = new Map()
for (const t of termekek) {
  const lista = []
  if (t.mainPicture && String(t.mainPicture).trim()) lista.push({ utvonal: String(t.mainPicture).trim(), szerep: 'fokep', sorrend: 0 })
  perTermek.set(String(t.id), lista)
}
for (const k of kepek) {
  const pid = String(k.product?.href || '').split('/').pop()
  if (!pid || !perTermek.has(pid)) continue
  const up = String(k.imagePath || '').trim()
  if (!up) continue
  perTermek.get(pid).push({ utvonal: up, szerep: 'galeria', sorrend: Number(k.sortOrder) || 0, alt: k.imageAlt || null })
}

const kepUrl = p => `${CDN}/image/data/${p.split('/').map(encodeURIComponent).join('/')}`

const osszesUrl = new Set()
for (const lista of perTermek.values()) for (const k of lista) osszesUrl.add(kepUrl(k.utvonal))
process.stderr.write(`Egyedi kép-URL az API szerint: ${osszesUrl.size}\n`)

const blobDir = path.join(cacheDir, 'kepblob')
await ensureDir(blobDir)
const blobPath = u => {
  const ext = (u.match(/\.([A-Za-z0-9]{2,5})$/) || [])[1] || 'bin'
  return path.join(blobDir, createHash('sha1').update(u).digest('hex') + '.' + ext.toLowerCase())
}
const jobs = [...osszesUrl].map(u => ({ url: u, out: blobPath(u) }))
const res = await curlBatch(jobs, { label: 'api-kepek', concurrency: 10, retries: 4, minBytes: 100 })

const MAGIC = [{ e: 'jpg', b: [0xff, 0xd8, 0xff] }, { e: 'png', b: [0x89, 0x50, 0x4e, 0x47] }, { e: 'gif', b: [0x47, 0x49, 0x46, 0x38] }, { e: 'bmp', b: [0x42, 0x4d] }]
async function kepTipus (p) {
  let fh
  try {
    fh = await fs.open(p, 'r'); const buf = Buffer.alloc(16); await fh.read(buf, 0, 16, 0)
    if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'webp'
    for (const m of MAGIC) if (m.b.every((x, i) => buf[i] === x)) return m.e
    return null
  } catch { return null } finally { await fh?.close() }
}

const ervenyes = new Map(); const hibas = []
for (const u of osszesUrl) {
  const p = blobPath(u); const t = await kepTipus(p)
  if (t) ervenyes.set(u, { path: p, tipus: t, meret: await fileSize(p) })
  else hibas.push({ url: u, kod: res.get(u)?.code ?? 0 })
}
process.stderr.write(`Érvényes: ${ervenyes.size}, hibás/hiányzó: ${hibas.length}\n`)

const kepDir = path.join(migracioDir, 'kepek')
const manifest = []; let masolt = 0; let bajt = 0; let ujFajl = 0
for (const [pid, lista] of perTermek) {
  if (!lista.length) continue
  const t = termekMap.get(pid)
  const mappa = mappaNev.get(pid)
  const cel = path.join(kepDir, mappa)
  await ensureDir(cel)
  const latott = new Set(); const sorok = []
  let idx = 0
  for (const k of lista.sort((a, b) => (a.szerep === 'fokep' ? -1 : b.szerep === 'fokep' ? 1 : a.sorrend - b.sorrend))) {
    const u = kepUrl(k.utvonal)
    if (latott.has(u)) continue
    latott.add(u); idx++
    const info = ervenyes.get(u)
    if (!info) { sorok.push({ url: u, szerep: k.szerep, fajl: null, hiba: 'letoltes_sikertelen' }); continue }
    const nev = `${String(idx).padStart(2, '0')}-${safeFilename(decodeURIComponent(u.split('/').pop()))}`
    const celFajl = path.join(cel, nev)
    const volt = await fileSize(celFajl)
    if (volt !== info.meret) { await fs.copyFile(info.path, celFajl); if (volt < 0) ujFajl++ }
    masolt++; bajt += info.meret
    sorok.push({ url: u, szerep: k.szerep, sorrend: k.sorrend, fajl: path.relative(migracioDir, celFajl), meret: info.meret, tipus: info.tipus, fo_kep: idx === 1 })
  }
  manifest.push({ mappa, shoprenter_id: dekodolId(pid).szam, api_id: pid, cikkszam: t?.sku ?? null, publikalt: String(t?.status) === '1', nev: nevMap.get(pid) || null, kepek: sorok })
}

await writeJson(path.join(adatDir, 'kepek-manifest-teljes.json'), {
  keszult: new Date().toISOString(),
  forras: 'Shoprenter API (productImages + products.mainPicture)',
  egyedi_kep_url: osszesUrl.size,
  sikeresen_letoltve: ervenyes.size,
  hibas,
  termek_mappak: manifest.length,
  osszes_kepfajl: masolt,
  uj_fajl_most: ujFajl,
  osszes_bajt: bajt,
  termekek: manifest
})
process.stderr.write(`Mappák: ${manifest.length}, képfájl: ${masolt} (ebből most új: ${ujFajl}), ${(bajt / 1048576).toFixed(1)} MB\n`)
if (hibas.length) process.stderr.write(`FIGYELEM: ${hibas.length} kép nem tölthető le\n`)
