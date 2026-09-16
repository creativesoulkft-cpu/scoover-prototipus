// 1. fázis: a sitemap alapján minden publikus oldal HTML-jének letöltése a gyorsítótárba.
// Használat: node tools/shoprenter/01-oldalak.mjs
import { SHOP, cacheDir, cachePath, curlBatch, ensureDir, writeJson, migracioDir, path, fs } from './lib.mjs'

const sitemapOut = path.join(cacheDir, 'sitemap.xml')
await ensureDir(cacheDir)

const kepSitemapOut = path.join(cacheDir, 'image-sitemap.xml')
await curlBatch([
  { url: `${SHOP}/sitemap.xml`, out: sitemapOut },
  { url: `${SHOP}/image-sitemap.xml`, out: kepSitemapOut }
], { label: 'sitemap', concurrency: 2 })
const xml = await fs.readFile(sitemapOut, 'utf8')
// A bolt képsitemapje néhány olyan oldalt is felsorol, ami a fő sitemapből kimarad.
let kepXml = ''
try { kepXml = await fs.readFile(kepSitemapOut, 'utf8') } catch { /* nem kötelező */ }

const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map(m => m[1].trim())
  .filter(Boolean)

// lastmod az oldal mellé, ha van
const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => {
  const b = m[1]
  const loc = (b.match(/<loc>([^<]+)<\/loc>/) || [])[1]?.trim()
  const lastmod = (b.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1]?.trim() || null
  const priority = (b.match(/<priority>([^<]+)<\/priority>/) || [])[1]?.trim() || null
  return { loc, lastmod, priority }
}).filter(e => e.loc)

const kepSitemapUrls = [...kepXml.matchAll(/<url><loc>([^<]+)<\/loc>/g)].map(m => m[1].trim())
const ismert = new Set(entries.map(e => e.loc))
const extra = kepSitemapUrls.filter(u => !ismert.has(u)).map(loc => ({ loc, lastmod: null, priority: null, forras: 'image-sitemap' }))

const uniq = [...new Map([...entries, ...extra].map(e => [e.loc, e])).values()]
process.stderr.write(`Sitemap: ${urls.length} <loc>, képsitemapből ${extra.length} további oldal, összesen ${uniq.length} egyedi URL\n`)

const jobs = uniq.map(e => ({ url: e.loc, out: cachePath(e.loc) }))
const res = await curlBatch(jobs, { label: 'oldalak', concurrency: 8, minBytes: 500 })

let ok = 0; const failed = []
for (const j of jobs) {
  const r = res.get(j.url)
  if (r && !r.failed && r.size >= 500) ok++
  else failed.push({ url: j.url, code: r?.code ?? 0 })
}
process.stderr.write(`Letöltve: ${ok}/${jobs.length}, hibás: ${failed.length}\n`)

await writeJson(path.join(cacheDir, 'sitemap-urls.json'), { forras: `${SHOP}/sitemap.xml`, letoltve: new Date().toISOString(), darab: uniq.length, bejegyzesek: uniq, hibas: failed })
process.stderr.write(`Kész. Gyorsítótár: ${cacheDir}\n`)
