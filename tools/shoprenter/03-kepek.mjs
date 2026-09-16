// 3. fázis: minden termékkép letöltése EREDETI felbontásban, termékenkénti mappába.
// A CDN-en az /image/cache/<meret>/ a méretezett változat, az /image/data/ az eredeti feltöltött fájl.
import { createHash } from 'node:crypto'
import { cacheDir, migracioDir, curlBatch, ensureDir, writeJson, readJson, safeFilename, fileSize, path, fs } from './lib.mjs'

const adatDir = path.join(migracioDir, 'adat')
const termekek = await readJson(path.join(adatDir, 'termekek.json'))
const kepDir = path.join(migracioDir, 'kepek')
const blobDir = path.join(cacheDir, 'kepblob')
await ensureDir(blobDir)

// 1) egyedi kép-URL-ek letöltése egyszer, tartalom szerinti gyorsítótárba
const osszesUrl = new Set()
for (const t of termekek) for (const u of [...t.kepek, ...t.leiras_kepek]) osszesUrl.add(u)
const urlLista = [...osszesUrl]
process.stderr.write(`Egyedi kép-URL: ${urlLista.length}\n`)

// A gyorsítótár fájlneve az URL SHA-1 lenyomata. Beszédes névből csonkolni veszélyes:
// a hosszú CDN-útvonalak eleje azonos, így a levágott nevek ütköznének és
// más termék képe kerülne a mappába.
const blobPath = u => {
  const ext = (u.match(/\.([A-Za-z0-9]{2,5})$/) || [])[1] || 'bin'
  return path.join(blobDir, createHash('sha1').update(u).digest('hex') + '.' + ext.toLowerCase())
}
const jobs = urlLista.map(u => ({ url: u, out: blobPath(u) }))
const res = await curlBatch(jobs, { label: 'kepek', concurrency: 10, retries: 4, minBytes: 100 })

// 2) érvényesség: tényleg kép-e (mágikus bájtok)
const MAGIC = [
  { ext: 'jpg', bytes: [0xff, 0xd8, 0xff] },
  { ext: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: 'gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { ext: 'bmp', bytes: [0x42, 0x4d] }
]
async function kepTipus (p) {
  let fh
  try {
    fh = await fs.open(p, 'r')
    const buf = Buffer.alloc(16)
    await fh.read(buf, 0, 16, 0)
    if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'webp'
    for (const m of MAGIC) if (m.bytes.every((b, i) => buf[i] === b)) return m.ext
    return null
  } catch { return null } finally { await fh?.close() }
}

const ervenyes = new Map(); const hibasUrl = []
for (const u of urlLista) {
  const p = blobPath(u)
  const tip = await kepTipus(p)
  if (tip) ervenyes.set(u, { path: p, tipus: tip, meret: await fileSize(p) })
  else hibasUrl.push({ url: u, kod: res.get(u)?.code ?? 0 })
}
process.stderr.write(`Érvényes képfájl: ${ervenyes.size}, hibás/hiányzó: ${hibasUrl.length}\n`)

// 3) szétmásolás termékenkénti mappába, galéria-sorrendben
const manifest = []
let masolt = 0; let osszBajt = 0
const hasznaltSlug = new Map()
for (const t of termekek) {
  let slug = t.slug || `termek-${t.shoprenter_id || 'ismeretlen'}`
  if (hasznaltSlug.has(slug) && hasznaltSlug.get(slug) !== t.url) {
    slug = `${slug}-${t.shoprenter_id || hasznaltSlug.size}`
  }
  hasznaltSlug.set(slug, t.url)

  const cel = path.join(kepDir, slug)
  const sorok = []
  const felsorolt = [
    ...t.kepek.map((u, i) => ({ u, szerep: 'galeria', idx: i })),
    ...t.leiras_kepek.filter(u => !t.kepek.includes(u)).map((u, i) => ({ u, szerep: 'leirasban', idx: t.kepek.length + i }))
  ]
  if (!felsorolt.length) continue
  await ensureDir(cel)
  for (const { u, szerep, idx } of felsorolt) {
    const info = ervenyes.get(u)
    if (!info) { sorok.push({ url: u, szerep, fajl: null, hiba: 'letoltes_sikertelen' }); continue }
    const eredetiNev = decodeURIComponent(u.split('/').pop().split('?')[0])
    const nev = `${String(idx + 1).padStart(2, '0')}-${safeFilename(eredetiNev)}`
    // a sorszám-előtag mappán belül garantálja az egyediséget
    const celFajl = path.join(cel, nev)
    if ((await fileSize(celFajl)) !== info.meret) await fs.copyFile(info.path, celFajl)
    masolt++; osszBajt += info.meret
    sorok.push({
      url: u,
      szerep,
      fajl: path.relative(migracioDir, celFajl),
      meret: info.meret,
      tipus: info.tipus,
      fo_kep: szerep === 'galeria' && idx === 0
    })
  }
  manifest.push({ slug, termek_url: t.url, shoprenter_id: t.shoprenter_id, cikkszam: t.cikkszam, mappa: path.relative(migracioDir, cel), kepek: sorok })
}

await writeJson(path.join(adatDir, 'kepek-manifest.json'), {
  keszult: new Date().toISOString(),
  egyedi_kep_url: urlLista.length,
  sikeresen_letoltve: ervenyes.size,
  hibas: hibasUrl,
  termek_mappak: manifest.length,
  osszes_kepfajl: masolt,
  osszes_bajt: osszBajt,
  termekek: manifest
})
process.stderr.write(`Mappák: ${manifest.length}, kimásolt képfájl: ${masolt}, összesen ${(osszBajt / 1048576).toFixed(1)} MB\n`)
if (hibasUrl.length) process.stderr.write(`FIGYELEM: ${hibasUrl.length} kép nem tölthető le, lásd kepek-manifest.json -> hibas\n`)
