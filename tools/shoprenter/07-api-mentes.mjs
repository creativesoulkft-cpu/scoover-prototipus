// 7. fázis: teljes mentés a Shoprenter API-ból.
// Ez látja a NEM PUBLIKÁLT termékeket és azok képeit is, amiket a boltoldalakról
// nem lehet elérni – plusz a beszerzési árat, a pontos készletet és a GTIN-t.
import { apiOsszes, dekodolId, API_URL } from './sr-api.mjs'
import { migracioDir, writeJson, ensureDir, path } from './lib.mjs'

const apiDir = path.join(migracioDir, 'adat', 'api')
await ensureDir(apiDir)

const GYUJTEMENYEK = [
  'products', 'productImages', 'productDescriptions', 'categories',
  'categoryDescriptions', 'manufacturers', 'productSpecials', 'stockStatuses',
  'productClasses', 'productAttributeValues'
]

const eredmeny = {}
for (const gy of GYUJTEMENYEK) {
  process.stderr.write(`[${gy}] `)
  try {
    const elemek = await apiOsszes(gy, {
      onPage: ({ page, pageCount, osszesen }) => {
        if (page % 5 === 0 || page + 1 === pageCount) process.stderr.write(`${osszesen}… `)
      }
    })
    eredmeny[gy] = elemek.length
    await writeJson(path.join(apiDir, `${gy}.json`), elemek)
    process.stderr.write(`kész: ${elemek.length}\n`)
  } catch (e) {
    eredmeny[gy] = `hiba: ${e.message}`
    process.stderr.write(`HIBA: ${e.message}\n`)
  }
}

await writeJson(path.join(apiDir, '_meta.json'), {
  keszult: new Date().toISOString(),
  api_url: API_URL,
  darabszamok: eredmeny
})
process.stderr.write('\n' + JSON.stringify(eredmeny, null, 2) + '\n')
