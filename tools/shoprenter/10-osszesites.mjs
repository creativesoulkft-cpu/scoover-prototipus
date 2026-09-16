// 10. fázis: az API-gyűjtemények összefűzése egyetlen, importálható termékképbe,
// és a teljes webcím-térkép elkészítése (a nem publikált termékekre is).
import { migracioDir, writeJson, readJson, ensureDir, slugify, path, fs } from './lib.mjs'
import { dekodolId } from './sr-api.mjs'

const adatDir = path.join(migracioDir, 'adat')
const apiDir = path.join(adatDir, 'api')
const be = async n => { try { return await readJson(path.join(apiDir, `${n}.json`)) } catch { return [] } }

const [termekek, leirasok, kepek, kategoriak, katLeirasok, katRelaciok,
  gyartok, gyartoLeirasok, akciok, keszletLeirasok, cimek] = await Promise.all([
  be('products'), be('productDescriptions'), be('productImages'), be('categories'),
  be('categoryDescriptions'), be('productCategoryRelations'), be('manufacturers'),
  be('manufacturerDescriptions'), be('productSpecials'), be('stockStatusDescriptions'), be('urlAliases')
])

const hrefId = h => String(h || '').split('/').pop().split('?')[0] || null
const hrefQuery = h => { const m = String(h || '').match(/=([^=]+)$/); return m ? m[1] : null }

// --- keresők ---
const leirasSzerint = new Map()          // termék-id -> első nyelvű leírás
for (const l of leirasok) {
  const pid = hrefId(l.product?.href)
  if (pid && !leirasSzerint.has(pid)) leirasSzerint.set(pid, l)
}
const katNev = new Map()                 // kategória-id -> név
for (const k of katLeirasok) {
  const cid = hrefId(k.category?.href)
  if (cid && !katNev.has(cid)) katNev.set(cid, k.name)
}
const katSzuloje = new Map(kategoriak.map(k => [k.id, hrefId(k.parentCategory?.href)]))
const termekKategoriai = new Map()       // termék-id -> [kategória-id]
for (const r of katRelaciok) {
  const pid = hrefId(r.product?.href); const cid = hrefId(r.category?.href)
  if (!pid || !cid) continue
  if (!termekKategoriai.has(pid)) termekKategoriai.set(pid, [])
  termekKategoriai.get(pid).push(cid)
}
const gyartoNev = new Map(gyartok.map(g => [g.id, g.name]))
const keszletNev = new Map()             // stockStatus-id -> név
for (const s of keszletLeirasok) {
  const sid = hrefId(s.stockStatus?.href)
  if (sid && !keszletNev.has(sid)) keszletNev.set(sid, s.name)
}
const termekAkciok = new Map()
for (const a of akciok) {
  const pid = hrefId(a.product?.href)
  if (!pid) continue
  if (!termekAkciok.has(pid)) termekAkciok.set(pid, [])
  termekAkciok.get(pid).push({ ar: a.price, tol: a.dateFrom, ig: a.dateTo, prioritas: a.priority })
}
const termekCim = new Map()              // termék-id -> slug
const katCim = new Map()
const oldalCim = []
for (const c of cimek) {
  const eid = hrefId(c.urlAliasEntity?.href)
  if (c.type === 'PRODUCT' && eid) termekCim.set(eid, c.urlAlias)
  else if (c.type === 'CATEGORY' && eid) katCim.set(eid, c.urlAlias)
  else if (c.type === 'INFORMATION') oldalCim.push({ slug: c.urlAlias, entitas: eid })
}

// képmanifest (ha már lefutott a 8-9. fázis)
let kepManifest = null
try { kepManifest = await readJson(path.join(adatDir, 'kepek-manifest-teljes.json')) } catch {}
const kepekSzerint = new Map((kepManifest?.termekek || []).map(t => [t.api_id, t]))

function kategoriaUt (cid, mely = 0) {
  const nevek = []
  let akt = cid
  while (akt && mely++ < 8) { const n = katNev.get(akt); if (n) nevek.unshift(n); akt = katSzuloje.get(akt) }
  return nevek
}

// --- konszolidált termékek ---
const ki = []
for (const t of termekek) {
  const id = t.id
  const l = leirasSzerint.get(id) || {}
  const katok = (termekKategoriai.get(id) || []).map(cid => ({
    nev: katNev.get(cid) || null, utvonal: kategoriaUt(cid), slug: katCim.get(cid) || null
  }))
  const km = kepekSzerint.get(id)
  const slug = termekCim.get(id) || slugify(l.name || '') || slugify(t.sku || '') || null
  ki.push({
    shoprenter_id: dekodolId(id).szam,
    api_id: id,
    cikkszam: t.sku || null,
    modellszam: t.modelNumber || null,
    gtin: t.gtin || null,
    nev: l.name || null,
    publikalt: String(t.status) === '1',
    regi_slug: termekCim.get(id) || null,
    regi_url: termekCim.get(id) ? `https://elektromos-roller.net/${termekCim.get(id)}` : null,
    javasolt_uj_utvonal: slug ? `/termek/${slug}/` : null,
    ar: {
      netto: t.price != null ? Number(t.price) : null,
      beszerzesi: t.cost != null && Number(t.cost) > 0 ? Number(t.cost) : null,
      akciok: termekAkciok.get(id) || [],
      adokulcs: hrefQuery(t.taxClass?.href) || null
    },
    keszlet: {
      darab: t.quantity != null ? Number(t.quantity) : null,
      rendelheto: t.orderable,
      keszletbol_levon: t.subtractStock,
      raktaron_statusz: keszletNev.get(hrefId(t.inStockStatus?.href)) || null,
      nincs_raktaron_statusz: keszletNev.get(hrefId(t.noStockStatus?.href)) || null
    },
    meretek: { szelesseg: t.width, magassag: t.height, hosszusag: t.length, suly: t.weight, suly_egyseg: hrefQuery(t.weightUnit?.href) },
    gyarto: gyartoNev.get(hrefId(t.manufacturer?.href)) || null,
    kategoriak: katok,
    leiras: {
      rovid: l.shortDescription || null,
      teljes: l.description || null,
      parameterek: l.parameters || null,
      egyedi_cim: l.customContentTitle || null,
      egyedi_tartalom: l.customContent || null,
      video: l.videoCode || null
    },
    meta: { cim: l.metaTitle || null, leiras: l.metaDescription || null, kulcsszavak: l.metaKeywords || null },
    kepek: (km?.kepek || []).map(k => ({ fajl: k.fajl, url: k.url, fo_kep: k.fo_kep, szerep: k.szerep })),
    ingyenes_szallitas: t.freeShipping,
    letrehozva: t.dateCreated,
    modositva: t.dateUpdated
  })
}
await writeJson(path.join(adatDir, 'termekek-teljes.json'), ki)

// --- teljes webcím-térkép ---
const sorok = []
for (const t of ki) {
  if (!t.regi_slug) continue
  sorok.push({
    regi_url: t.regi_url, regi_utvonal: `/${t.regi_slug}`, tipus: 'termek', nev: t.nev,
    shoprenter_id: t.shoprenter_id, cikkszam: t.cikkszam, publikalt_a_lekapcsolaskor: t.publikalt,
    uj_slug: t.regi_slug, javasolt_uj_utvonal: t.javasolt_uj_utvonal,
    megjegyzes: t.publikalt ? null : 'a lekapcsoláskor nem volt publikálva, de a régi címre érkezhet forgalom'
  })
}
for (const [cid, slug] of katCim) {
  sorok.push({
    regi_url: `https://elektromos-roller.net/${slug}`, regi_utvonal: `/${slug}`, tipus: 'kategoria',
    nev: katNev.get(cid) || null, shoprenter_id: dekodolId(cid).szam, cikkszam: null,
    publikalt_a_lekapcsolaskor: String(kategoriak.find(k => k.id === cid)?.status) === '1',
    uj_slug: slug, javasolt_uj_utvonal: `/termek-kategoria/${slug}/`, megjegyzes: null
  })
}
for (const o of oldalCim) {
  sorok.push({
    regi_url: `https://elektromos-roller.net/${o.slug}`, regi_utvonal: `/${o.slug}`, tipus: 'oldal',
    nev: null, shoprenter_id: null, cikkszam: null, publikalt_a_lekapcsolaskor: null,
    uj_slug: o.slug, javasolt_uj_utvonal: `/${o.slug}/`, megjegyzes: null
  })
}

const atDir = path.join(migracioDir, 'atiranyitas')
await ensureDir(atDir)
await writeJson(path.join(atDir, '301-terkep-teljes.json'), { keszult: new Date().toISOString(), forras: 'Shoprenter API urlAliases', darab: sorok.length, sorok })

const esc = v => { const s = v == null ? '' : String(v); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
const fej = ['regi_url', 'regi_utvonal', 'tipus', 'nev', 'shoprenter_id', 'cikkszam', 'publikalt_a_lekapcsolaskor', 'uj_slug', 'javasolt_uj_utvonal', 'megjegyzes']
await fs.writeFile(path.join(atDir, '301-terkep-teljes.csv'),
  '﻿' + [fej.join(';'), ...sorok.map(r => fej.map(f => esc(r[f])).join(';'))].join('\n') + '\n', 'utf8')
const atir = sorok.filter(r => r.regi_utvonal !== r.javasolt_uj_utvonal)
await fs.writeFile(path.join(atDir, 'redirects-nginx-teljes.conf'),
  ['# Whoosh – teljes 301 térkép (API urlAliases alapján)', '',
    ...atir.map(r => `location = ${r.regi_utvonal} { return 301 ${r.javasolt_uj_utvonal}; }`)].join('\n') + '\n', 'utf8')
await fs.writeFile(path.join(atDir, 'redirection-plugin-teljes.csv'),
  ['source,target,regex,code', ...atir.map(r => `${esc(r.regi_utvonal)},${esc(r.javasolt_uj_utvonal)},0,301`)].join('\n') + '\n', 'utf8')

const sz = sorok.reduce((a, r) => (a[r.tipus] = (a[r.tipus] || 0) + 1, a), {})
process.stderr.write(
  `Konszolidált termék: ${ki.length} (publikált: ${ki.filter(t => t.publikalt).length}, rejtett: ${ki.filter(t => !t.publikalt).length})\n` +
  `  kategóriával: ${ki.filter(t => t.kategoriak.length).length}, képpel: ${ki.filter(t => t.kepek.length).length}, ` +
  `pontos készlettel: ${ki.filter(t => t.keszlet.darab != null).length}, beszerzési árral: ${ki.filter(t => t.ar.beszerzesi).length}\n` +
  `Webcím-térkép: ${sorok.length} sor (${Object.entries(sz).map(([k, v]) => `${k}: ${v}`).join(', ')})\n`
)
