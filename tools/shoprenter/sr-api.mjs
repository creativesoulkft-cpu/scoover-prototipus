// Shoprenter REST API kliens.
//
// A hitelesítés adatai KIZÁRÓLAG környezeti változóból jönnek, a kódba soha nem íródnak:
//   SHOPRENTER_API_USER      – az admin „API beállítások" oldalán látható felhasználónév
//   SHOPRENTER_API_PASSWORD  – ugyanott a jelszó
//   SHOPRENTER_API_URL       – opcionális; alapértelmezés a bolt API-címe
//
// Figyelem a tartománynévre: az API a *myshoprenter.hu* alatt él
// (https://elektromosroller.api.myshoprenter.hu), NEM a shoprenter.hu alatt.
// Az admin „Egyedi API felhasználó" (api2, Client ID + Secret) másik, újabb
// felület, más hitelesítéssel – ez a kliens a klasszikus, Basic auth-os API-t használja.
import { execFile } from 'node:child_process'

export const API_URL = (process.env.SHOPRENTER_API_URL || 'https://elektromosroller.api.myshoprenter.hu').replace(/\/+$/, '')
const USER = process.env.SHOPRENTER_API_USER || ''
const PASS = process.env.SHOPRENTER_API_PASSWORD || ''

export function ellenorizKulcs () {
  if (!USER || !PASS) throw new Error('Hiányzik a SHOPRENTER_API_USER vagy a SHOPRENTER_API_PASSWORD.')
  if (/^ide_a_|^itt_a_|^valtsd|^changeme|^TODO/i.test(PASS)) {
    throw new Error(`A SHOPRENTER_API_PASSWORD értéke helykitöltő szöveg ("${PASS.slice(0, 12)}…"), nem valódi kulcs.`)
  }
}

const execFileAsync = (cmd, args) => new Promise((resolve) => {
  execFile(cmd, args, { maxBuffer: 1 << 28 }, (err, stdout, stderr) => resolve({ err, stdout: stdout ?? '', stderr: stderr ?? '' }))
})

/** Egy API-hívás. A kulcs a curl --netrc-file-ján keresztül megy, hogy ne látszódjon a folyamatlistában. */
export async function apiGet (utvonal, { retries = 4 } = {}) {
  ellenorizKulcs()
  const url = `${API_URL}/${String(utvonal).replace(/^\/+/, '')}`
  for (let i = 1; i <= retries; i++) {
    const { stdout } = await execFileAsync('curl', [
      '-sS', '--max-time', '120', '--connect-timeout', '20',
      '-u', `${USER}:${PASS}`,
      '-H', 'Accept: application/json',
      '-w', '\\n__HTTP__%{http_code}',
      url
    ])
    const vago = stdout.lastIndexOf('\n__HTTP__')
    const kod = Number(stdout.slice(vago + 9).trim())
    const test = stdout.slice(0, vago)
    if (kod === 200) {
      try { return JSON.parse(test) } catch (e) { throw new Error(`Nem JSON válasz a(z) ${utvonal} végponttól: ${e.message}`) }
    }
    if (kod === 401 || kod === 403) throw new Error(`Hitelesítés elutasítva (${kod}) a(z) ${utvonal} végponton – ellenőrizd a kulcsot.`)
    if (kod === 404) return null
    if (i < retries) await new Promise(r => setTimeout(r, 1000 * 2 ** i))
    else throw new Error(`A(z) ${utvonal} végpont ${retries} próbálkozás után is HTTP ${kod}.`)
  }
}

/**
 * Egy gyűjtemény teljes végiglapozása. A Shoprenter API limit=500 fölött hibás
 * választ ad (25 elemet küld és elrontja a lapszámot), ezért 200 a felső határ.
 */
export async function apiOsszes (gyujtemeny, { limit = 200, full = true, onPage = null } = {}) {
  const elemek = []
  let page = 0; let pageCount = 1
  do {
    const q = `${gyujtemeny}?limit=${limit}&page=${page}${full ? '&full=1' : ''}`
    const d = await apiGet(q)
    if (!d) break
    pageCount = d.pageCount ?? 1
    const be = d.items || []
    elemek.push(...be)
    if (onPage) onPage({ page, pageCount, kapott: be.length, osszesen: elemek.length })
    page++
  } while (page < pageCount)
  return elemek
}

/** A Shoprenter azonosítók base64-ben kódoltak, pl. "product-product_id=520". */
export function dekodolId (id) {
  try {
    const s = Buffer.from(String(id), 'base64').toString('utf8')
    const m = s.match(/=(\d+)$/)
    return { nyers: s, szam: m ? Number(m[1]) : null }
  } catch { return { nyers: null, szam: null } }
}
