// Közös segédfüggvények a Shoprenter -> WooCommerce költözés archiváló scriptjeihez.
// A hálózati forgalom curl-ön keresztül megy, mert a futtatókörnyezet proxyja és
// CA-készlete így van beállítva; a Node beépített fetch-e nem veszi fel a HTTPS_PROXY-t.
import { execFile } from 'node:child_process'
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export const SHOP = 'https://elektromos-roller.net'
export const CDN = 'https://elektromosroller.cdn.shoprenter.hu/custom/elektromosroller'
export const UA = 'Mozilla/5.0 (compatible; WhooshArchiver/1.0; +https://elektromos-roller.net)'

export const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
export const migracioDir = path.join(repoRoot, 'migracio')
export const cacheDir = process.env.SR_CACHE
  || path.join(process.env.SCRATCH || os.tmpdir(), 'sr-cache')

export async function ensureDir (d) { await mkdir(d, { recursive: true }) }

export async function exists (p) {
  try { await stat(p); return true } catch { return false }
}

export async function fileSize (p) {
  try { return (await stat(p)).size } catch { return -1 }
}

const execFileAsync = (cmd, args, opts = {}) => new Promise((resolve) => {
  execFile(cmd, args, { maxBuffer: 1 << 28, ...opts }, (err, stdout, stderr) => {
    resolve({ err, stdout: stdout ?? '', stderr: stderr ?? '' })
  })
})

/**
 * Letölt egy csomó URL-t párhuzamosan, curl config-fájllal.
 * jobs: [{ url, out }]  ->  visszatér: Map(url -> { code, size, out })
 * A már meglévő, nem üres fájlokat kihagyja (újraindíthatóság).
 */
export async function curlBatch (jobs, { concurrency = 8, retries = 3, label = 'letöltés', minBytes = 1 } = {}) {
  const results = new Map()
  let todo = []
  for (const j of jobs) {
    const sz = await fileSize(j.out)
    if (sz >= minBytes) { results.set(j.url, { code: 200, size: sz, out: j.out, cached: true }); continue }
    todo.push(j)
  }
  if (todo.length) process.stderr.write(`[${label}] ${jobs.length} elem, ${jobs.length - todo.length} már megvan, ${todo.length} letöltendő\n`)
  else { process.stderr.write(`[${label}] mind a ${jobs.length} elem megvan a gyorsítótárban\n`); return results }

  for (let attempt = 1; attempt <= retries && todo.length; attempt++) {
    const dirs = new Set(todo.map(j => path.dirname(j.out)))
    for (const d of dirs) await ensureDir(d)

    const cfgLines = []
    for (const j of todo) {
      cfgLines.push(`url = "${j.url.replace(/"/g, '%22')}"`)
      cfgLines.push(`output = "${j.out}"`)
    }
    const cfg = path.join(cacheDir, `curl-cfg-${label.replace(/\W+/g, '_')}-${attempt}.txt`)
    await ensureDir(cacheDir)
    await writeFile(cfg, cfgLines.join('\n'), 'utf8')

    const args = [
      '--parallel', '--parallel-max', String(concurrency),
      '--location', '--fail', '--silent', '--show-error',
      '--compressed',
      '--max-time', '120', '--connect-timeout', '20',
      '--retry', '2', '--retry-delay', '2',
      '-A', UA,
      '-w', '%{url_effective}\\t%{http_code}\\t%{size_download}\\n',
      '-K', cfg
    ]
    const { stdout } = await execFileAsync('curl', args)
    // A -w kimenet a letöltött fájlok mellett a stdout-ra megy.
    for (const line of stdout.split('\n')) {
      const [u, code, size] = line.split('\t')
      if (!u) continue
      results.set(u, { code: Number(code), size: Number(size) })
    }

    const still = []
    for (const j of todo) {
      const sz = await fileSize(j.out)
      if (sz >= minBytes) {
        const r = results.get(j.url) || {}
        results.set(j.url, { code: r.code ?? 200, size: sz, out: j.out })
      } else {
        still.push(j)
      }
    }
    if (still.length && attempt < retries) {
      process.stderr.write(`[${label}] ${still.length} sikertelen, újrapróbálás (${attempt}/${retries - 1}) ${2 ** attempt}s múlva\n`)
      await new Promise(r => setTimeout(r, 2000 * 2 ** attempt))
    }
    todo = still
  }
  for (const j of todo) {
    if (!results.has(j.url) || (await fileSize(j.out)) < minBytes) {
      results.set(j.url, { code: results.get(j.url)?.code ?? 0, size: 0, out: j.out, failed: true })
    }
  }
  return results
}

/** URL -> gyorsítótárbeli fájlnév */
export function cachePath (url, sub = 'html', ext = '.html') {
  const slug = url.replace(/^https?:\/\//, '').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 150)
  return path.join(cacheDir, sub, slug + ext)
}

// ---------- HTML segédek ----------

export function decodeEntities (s) {
  if (!s) return s
  return s
    .replace(/&(?:#([0-9]+)|#x([0-9a-fA-F]+)|([a-zA-Z][a-zA-Z0-9]*));/g, (m, dec, hex, name) => {
      if (dec) return String.fromCodePoint(Number(dec))
      if (hex) return String.fromCodePoint(parseInt(hex, 16))
      const map = {
        amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
        aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
        ouml: 'ö', uuml: 'ü', odblac: 'ő', udblac: 'ű', szlig: 'ß',
        Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
        Ouml: 'Ö', Uuml: 'Ü', Odblac: 'Ő', Udblac: 'Ű',
        hellip: '…', ndash: '–', mdash: '—', laquo: '«', raquo: '»',
        bdquo: '„', ldquo: '“', rdquo: '”', eur: '€', euro: '€', deg: '°',
        times: '×', middot: '·', bull: '•', reg: '®', copy: '©', trade: '™'
      }
      return name in map ? map[name] : m
    })
}

export function stripTags (html) {
  if (!html) return ''
  return decodeEntities(
    html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/[ \t ]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim()
}

export function metaContent (html, key) {
  const re = new RegExp(`<meta[^>]*(?:name|property)=["']${key}["'][^>]*content=["']([\\s\\S]*?)["'][^>]*>`, 'i')
  const re2 = new RegExp(`<meta[^>]*content=["']([\\s\\S]*?)["'][^>]*(?:name|property)=["']${key}["'][^>]*>`, 'i')
  const m = html.match(re) || html.match(re2)
  return m ? decodeEntities(m[1]).trim() : null
}

/** Egy adott id-jű vagy class-ú blokk kivágása a nyitó tagtől a párjáig. */
export function extractBlock (html, attrRe, tag = 'div') {
  const open = html.search(attrRe)
  if (open < 0) return null
  // vissza a tag nyitásáig
  let start = html.lastIndexOf('<' + tag, open)
  if (start < 0) return null
  const openRe = new RegExp(`<${tag}\\b`, 'gi')
  const closeRe = new RegExp(`</${tag}>`, 'gi')
  let depth = 0
  let i = start
  const len = html.length
  while (i < len) {
    openRe.lastIndex = i; closeRe.lastIndex = i
    const o = openRe.exec(html); const c = closeRe.exec(html)
    if (!c) break
    if (o && o.index < c.index) { depth++; i = o.index + 1 }
    else {
      depth--; i = c.index + 1
      if (depth === 0) return html.slice(start, c.index + `</${tag}>`.length)
    }
  }
  return null
}

// ---------- slug ----------
const HU = { á: 'a', é: 'e', í: 'i', ó: 'o', ö: 'o', ő: 'o', ú: 'u', ü: 'u', ű: 'u', Á: 'a', É: 'e', Í: 'i', Ó: 'o', Ö: 'o', Ő: 'o', Ú: 'u', Ü: 'u', Ű: 'u' }
export function slugify (s) {
  return String(s || '')
    .replace(/[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/g, c => HU[c] || c)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 190)
}

export function safeFilename (s) {
  return String(s || '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'kep'
}

export async function writeJson (p, data) {
  await ensureDir(path.dirname(p))
  await writeFile(p, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

export async function readJson (p) {
  return JSON.parse(await readFile(p, 'utf8'))
}

export { fs, path }
