// 5. fázis: a nem termékhez kötött képek archiválása (kategóriafejek, bannerek,
// ckeditor-ral a szöveges oldalakba ágyazott képek, logók). Ezek is elérhetetlenné
// válnak a Shoprenter lekapcsolásakor.
import { createHash } from 'node:crypto'
import { cacheDir, migracioDir, curlBatch, ensureDir, writeJson, readJson, safeFilename, fileSize, path, fs, CDN } from './lib.mjs'

const adatDir = path.join(migracioDir, 'adat')
const termekek = await readJson(path.join(adatDir, 'termekek.json'))

// amit a termékarchívum már lefedett
const termekKepek = new Set()
for (const t of termekek) for (const u of [...t.kepek, ...t.leiras_kepek]) termekKepek.add(u)

const htmlDir = path.join(cacheDir, 'html')
const fajlok = await fs.readdir(htmlDir)
const pat = /https:\/\/elektromosroller\.cdn\.shoprenter\.hu\/custom\/elektromosroller\/image\/(?:cache\/[^/]+\/)?([^"'\s<>)\\]+)/g

const talalt = new Map() // eredeti URL -> Set(forrasoldal)
for (const fn of fajlok) {
  const h = await fs.readFile(path.join(htmlDir, fn), 'utf8')
  for (const m of h.matchAll(pat)) {
    let rel = m[1].split('?')[0].split('#')[0]
    rel = rel.replace(/^data\//, '').replace(/\.(jpe?g|png|gif|bmp|webp)\.webp$/i, '.$1')
    // sablon- és rendszerelemek nem kellenek
    if (/^catalog\//.test(rel) || !rel) continue
    if (!/\.(jpe?g|png|gif|bmp|webp|svg)$/i.test(rel)) continue
    const url = `${CDN}/image/data/${rel}`
    if (termekKepek.has(url)) continue
    if (!talalt.has(url)) talalt.set(url, new Set())
    talalt.get(url).add(fn)
  }
}

const urlLista = [...talalt.keys()]
process.stderr.write(`Nem termékhez kötött egyedi kép: ${urlLista.length}\n`)

const celDir = path.join(migracioDir, 'kepek', '_tartalmi')
await ensureDir(celDir)

function celNev (u) {
  const rel = decodeURIComponent(u.slice(`${CDN}/image/data/`.length))
  const alap = safeFilename(rel.replace(/\//g, '__'))
  // rövid lenyomat a névben: a csonkolt hosszú útvonalak különben ütköznének
  return `${createHash('sha1').update(u).digest('hex').slice(0, 8)}-${alap}`
}

const jobs = urlLista.map(u => ({ url: u, out: path.join(celDir, celNev(u)) }))
const res = await curlBatch(jobs, { label: 'tartalmi-kepek', concurrency: 10, retries: 4, minBytes: 100 })

const manifest = []; let ok = 0; let bajt = 0; const hibas = []
for (const u of urlLista) {
  const out = path.join(celDir, celNev(u))
  const sz = await fileSize(out)
  if (sz >= 100) {
    ok++; bajt += sz
    manifest.push({ url: u, fajl: path.relative(migracioDir, out), meret: sz })
  } else {
    hibas.push({ url: u, kod: res.get(u)?.code ?? 0 })
    try { await fs.unlink(out) } catch {}
  }
}
await writeJson(path.join(adatDir, 'tartalmi-kepek-manifest.json'), {
  keszult: new Date().toISOString(), egyedi_url: urlLista.length, letoltve: ok, osszes_bajt: bajt, hibas, kepek: manifest
})
process.stderr.write(`Letöltve: ${ok}/${urlLista.length}, ${(bajt / 1048576).toFixed(1)} MB, hibás: ${hibas.length}\n`)
