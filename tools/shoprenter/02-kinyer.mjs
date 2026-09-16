// 2. fázis: a gyorsítótárazott HTML-ekből strukturált adat kinyerése.
// Kimenet: migracio/adat/*.json  (a scriptek nem írnak a konzolra termékadatot, csak összesítést)
import {
  cacheDir, cachePath, migracioDir, writeJson, readJson, stripTags, decodeEntities,
  metaContent, extractBlock, slugify, path, fs, CDN
} from './lib.mjs'

const { bejegyzesek } = await readJson(path.join(cacheDir, 'sitemap-urls.json'))

/** Shoprenter CDN cache-URL -> eredeti (image/data/...) URL */
export function eredetiKepUrl (u) {
  if (!u) return null
  let s = String(u).trim().replace(/&amp;/g, '&')
  s = s.split('?')[0].split('#')[0]
  if (!/shoprenter\.hu/.test(s)) return null
  // csak a bolt saját képtára érdekes, a sablon-/rendszerelemek nem
  const m = s.match(/\/custom\/elektromosroller\/image\/(?:cache\/[^/]+\/)?(.+)$/)
  if (!m) return null
  let rel = m[1]
  // a hivatkozás lehet eleve az eredetire mutató /image/data/... alak
  rel = rel.replace(/^data\//, '')
  // a cache réteg .webp-re konvertál: kep.jpg.webp -> kep.jpg
  rel = rel.replace(/\.(jpe?g|png|gif|bmp|webp)\.webp$/i, '.$1')
  if (/^catalog\/|^\.\.|^$/.test(rel)) return null
  return `${CDN}/image/data/${rel}`
}

function osszesKepBlokkbol (blokk) {
  if (!blokk) return []
  const out = []
  for (const m of blokk.matchAll(/(?:src|href|data-src|data-image|data-zoom-image)\s*=\s*["']([^"']+)["']/gi)) {
    const o = eredetiKepUrl(m[1])
    if (o) out.push(o)
  }
  return out
}

function paramSorok (html) {
  const sorok = []
  for (const m of html.matchAll(/<tr[^>]*class="[^"]*product-parameter-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const tr = m[0]
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(c => c[1])
    const cls = (tr.match(/class="([^"]*)"/) || [])[1] || ''
    if (cells.length >= 2) {
      const cimke = stripTags(cells[0])
      // képes attribútum-érték (pl. szín) esetén a title/alt hordozza az értéket
      let ertek = stripTags(cells[1])
      if (!ertek) {
        const t = cells[1].match(/(?:title|alt)=["']([^"']+)["']/i)
        if (t) ertek = decodeEntities(t[1])
      }
      if (cimke || ertek) sorok.push({ cimke, ertek, sor_osztaly: cls.trim() })
    } else if (cells.length === 1) {
      const ertek = stripTags(cells[0])
      if (ertek) sorok.push({ cimke: null, ertek, sor_osztaly: cls.trim() })
    }
  }
  return sorok
}

function morzsa (html) {
  const out = []
  for (const m of html.matchAll(/itemprop=["']itemListElement["'][\s\S]{0,400}?<\/li>/gi)) {
    const blk = m[0]
    const nev = (blk.match(/itemprop=["']name["'][^>]*>([\s\S]*?)</i) || [])[1]
    const nev2 = (blk.match(/<span[^>]*itemprop=["']name["'][^>]*>([\s\S]*?)<\/span>/i) || [])[1]
    const href = (blk.match(/href=["']([^"']+)["']/i) || [])[1]
    const poz = (blk.match(/itemprop=["']position["'][^>]*content=["'](\d+)["']/i) || [])[1]
    const cimke = decodeEntities((nev2 || nev || '').replace(/<[^>]+>/g, '')).trim()
    if (cimke) out.push({ nev: cimke, url: href || null, pozicio: poz ? Number(poz) : null })
  }
  return out
}

const termekek = []; const kategoriak = []; const oldalak = []; const hianyzo = []
const kepIndex = new Map() // eredeti kép URL -> { termekek: [] }

for (const be of bejegyzesek) {
  const p = cachePath(be.loc)
  let html
  try { html = await fs.readFile(p, 'utf8') } catch { hianyzo.push(be.loc); continue }

  const utvonal = new URL(be.loc).pathname.replace(/^\/|\/$/g, '')
  const kozos = {
    url: be.loc,
    utvonal: '/' + utvonal,
    slug: utvonal.split('/').pop() || '',
    lastmod: be.lastmod,
    sitemap_prioritas: be.priority,
    cim: decodeEntities((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '').trim() || null,
    meta_leiras: metaContent(html, 'description'),
    meta_kulcsszavak: metaContent(html, 'keywords'),
    meta_robots: metaContent(html, 'robots'),
    kanonikus: (html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || [])[1] || null,
    og: {
      cim: metaContent(html, 'og:title'),
      tipus: metaContent(html, 'og:type'),
      url: metaContent(html, 'og:url'),
      kep: metaContent(html, 'og:image'),
      leiras: metaContent(html, 'og:description')
    }
  }

  const prodM = html.match(/ShopRenter\.product\s*=\s*(\{[\s\S]*?\});/)
  if (prodM) {
    let sr = null
    try { sr = JSON.parse(prodM[1]) } catch { /* marad null */ }

    const galeriaFo = extractBlock(html, /id=["']product-image-container["']/, 'div')
    const galeriaTobbi = extractBlock(html, /id=["']productimages_wrapper["']/, 'div')
    const kepek = [...new Set([...osszesKepBlokkbol(galeriaFo), ...osszesKepBlokkbol(galeriaTobbi)])]

    // "Kép 1/5" -> ellenőrző szám. A főkép számlálója a galériába tett videót is
    // beleszámolja, a bélyegképeké nem, ezért a legkisebb érték a tényleges képszám.
    const jelzettek = [...html.matchAll(/K[ée]p\s*\d+\s*\/\s*(\d+)/gi)].map(m => Number(m[1]))
    const kepDb = jelzettek.length ? Math.min(...jelzettek) : null

    // Beágyazott termékvideók. Csak az iframe-ek számítanak: a lábléc/közösségi
    // YouTube-linkek minden oldalon ott vannak, azok nem a termékhez tartoznak.
    const videok = [...new Set(
      [...html.matchAll(/<iframe[^>]+src=["']((?:https?:)?\/\/[^"']*(?:youtube\.com|youtu\.be|vimeo\.com)[^"']*)["']/gi)]
        .map(m => (m[1].startsWith('//') ? 'https:' + m[1] : m[1]))
    )]

    const leirasBlokk = extractBlock(html, /class=["'][^"']*module-productdescription-wrapper[^"']*["']/, 'div')
      || extractBlock(html, /class=["'][^"']*tab-productdescription[^"']*["']/, 'div')
    const leirasHtml = leirasBlokk ? leirasBlokk.replace(/<script[\s\S]*?<\/script>/gi, '') : null

    const sorok = paramSorok(html)
    const rovidLeiras = sorok.find(s => /short-description/.test(s.sor_osztaly))?.ertek || null
    const keszletSor = sorok.find(s => /productstock-param/.test(s.sor_osztaly))
    const szallitasSor = sorok.find(s => /productshipping-param/.test(s.sor_osztaly))
    const stockStatusId = (html.match(/stock_status_id-(\d+)/) || [])[1] || null

    const availability = (html.match(/itemprop=["']availability["'][^>]*href=["']([^"']+)["']/i) || [])[1] || null
    const arItemprop = (html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/content=["']([^"']+)["'][^>]*itemprop=["']price["']/i) || [])[1] || null
    const penznem = (html.match(/itemprop=["']pricecurrency["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/content=["']([^"']+)["'][^>]*itemprop=["']pricecurrency["']/i) || [])[1] || null

    const bc = morzsa(html)
    // az utolsó morzsa maga a termék
    const kategoriaUt = bc.filter(x => x.url && !x.url.startsWith(be.loc)).map(x => x.nev)

    const leirasKepek = leirasHtml ? [...new Set(osszesKepBlokkbol(leirasHtml))] : []

    const t = {
      ...kozos,
      tipus: 'termek',
      shoprenter_id: sr?.id ?? null,
      cikkszam: sr?.sku ?? null,
      nev: sr?.name ?? kozos.og.cim ?? kozos.cim,
      marka: sr?.brand ?? null,
      mertekegyseg: sr?.unitName ?? null,
      ar: {
        brutto: sr?.price ?? null,
        penznem: sr?.currency ?? penznem ?? null,
        microdata_ar: arItemprop,
        megjelenitett: sorok.find(s => /price/i.test(s.sor_osztaly))?.ertek || null
      },
      keszlet: {
        elerhetoseg_schema: availability,
        raktaron: availability ? /InStock/i.test(availability) : null,
        elerhetoseg_szoveg: keszletSor?.ertek || null,
        stock_status_id: stockStatusId ? Number(stockStatusId) : null
      },
      szallitasi_dij: szallitasSor?.ertek || null,
      szulo: sr?.parent ?? null,
      valtozat: sr?.currentVariant ?? null,
      kategoria_utvonal: kategoriaUt,
      morzsa: bc,
      rovid_leiras: rovidLeiras,
      leiras_html: leirasHtml,
      leiras_szoveg: leirasHtml ? stripTags(leirasHtml) : null,
      attributumok: sorok.filter(s => s.cimke && !/short-description/.test(s.sor_osztaly)),
      kepek,
      kep_db_jelzett: kepDb,
      videok,
      leiras_kepek: leirasKepek
    }
    termekek.push(t)
    for (const k of [...kepek, ...leirasKepek]) {
      if (!kepIndex.has(k)) kepIndex.set(k, [])
      kepIndex.get(k).push(t.slug)
    }
    continue
  }

  // kategória?
  const katM = html.match(/ShopRenter\.category\s*=\s*(\{[\s\S]*?\});/)
  const kategoriaBody = /<body[^>]*class="[^"]*(category-list-body|category_list_body)/i.test(html)
  if (katM || kategoriaBody) {
    let sr = null
    if (katM) { try { sr = JSON.parse(katM[1]) } catch {} }
    kategoriak.push({
      ...kozos,
      tipus: 'kategoria',
      shoprenter_id: sr?.id ?? null,
      nev: kozos.og.cim || kozos.cim,
      morzsa: morzsa(html),
      alkategoriak: [...new Set([...html.matchAll(/class="category-list-link[^"]*"[^>]*href="([^"]+)"/gi)].map(m => m[1]))],
      listazott_termek_db: (html.match(/<[^>]*class="[^"]*product-item/gi) || []).length,
      leiras_html: (extractBlock(html, /class=["'][^"']*category-description[^"']*["']/, 'div') || null)
    })
    continue
  }

  oldalak.push({ ...kozos, tipus: 'oldal', tartalom_szoveg: null })
}

const adatDir = path.join(migracioDir, 'adat')
await writeJson(path.join(adatDir, 'termekek.json'), termekek)
await writeJson(path.join(adatDir, 'kategoriak.json'), kategoriak)
await writeJson(path.join(adatDir, 'oldalak.json'), oldalak)

const kepLista = [...kepIndex.entries()].map(([url, slugok]) => ({ url, termekek: [...new Set(slugok)] }))
await writeJson(path.join(adatDir, 'kepek-index.json'), kepLista)

const gond = {
  nev_nelkul: termekek.filter(t => !t.nev).length,
  ar_nelkul: termekek.filter(t => t.ar.brutto == null).length,
  cikkszam_nelkul: termekek.filter(t => !t.cikkszam).length,
  leiras_nelkul: termekek.filter(t => !t.leiras_html).length,
  kep_nelkul: termekek.filter(t => t.kepek.length === 0).length,
  kepszam_elteres: termekek.filter(t => t.kep_db_jelzett != null && t.kep_db_jelzett !== t.kepek.length)
    .map(t => ({ slug: t.slug, jelzett: t.kep_db_jelzett, talalt: t.kepek.length })).slice(0, 40)
}
await writeJson(path.join(adatDir, 'ellenorzes.json'), gond)

process.stderr.write(
  `Termék: ${termekek.length}  Kategória: ${kategoriak.length}  Egyéb oldal: ${oldalak.length}  Hiányzó HTML: ${hianyzo.length}\n` +
  `Egyedi termékkép (eredeti URL): ${kepLista.length}\n` +
  `Ellenőrzés: név nélkül ${gond.nev_nelkul}, ár nélkül ${gond.ar_nelkul}, cikkszám nélkül ${gond.cikkszam_nelkul}, leírás nélkül ${gond.leiras_nelkul}, kép nélkül ${gond.kep_nelkul}, képszám-eltérés ${gond.kepszam_elteres.length}\n`
)
