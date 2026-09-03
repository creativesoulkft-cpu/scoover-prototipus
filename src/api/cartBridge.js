/**
 * Kliens a saját köztes híd szerverhez (server/) – lásd server/README.md.
 * A híd felel a CUSTOM kép szerverre mentéséért, a felbontás-ellenőrzésért,
 * az ár újraszámolásáért és a WooCommerce Store API hívásért.
 */
const BRIDGE_URL = (import.meta.env.VITE_BRIDGE_URL ?? 'http://localhost:8787').replace(/\/$/, '');

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

class BridgeError extends Error {
  constructor(message, { status, errors } = {}) {
    super(message);
    this.name = 'BridgeError';
    this.status = status;
    this.errors = errors ?? [];
  }
}

/**
 * Feltölti a CUSTOM mintához használt képet a hídra – ez adja vissza a
 * végleges, szerveren tárolt `uploadedImageUrl`-t (a kliens oldali
 * előnézet data-URL-je NEM ez, azt a UploadPanel/App külön kezeli).
 * @returns {Promise<{url:string, width:number, height:number}>}
 */
export async function uploadCustomImage(file) {
  const form = new FormData();
  form.append('image', file);
  let res;
  try {
    res = await fetch(`${BRIDGE_URL}/api/upload`, { method: 'POST', body: form });
  } catch {
    throw new BridgeError('A híd szerver nem elérhető. Ellenőrizd, hogy fut-e (lásd server/README.md).');
  }
  const data = await parseJsonSafe(res);
  if (!res.ok || !data?.ok) {
    throw new BridgeError(data?.message ?? 'A kép feltöltése sikertelen.', { status: res.status, errors: data?.errors });
  }
  return data;
}

/**
 * Elküldi a teljes konfigurációt a hídnak, ami újraszámolja/ellenőrzi az árat
 * és a WooCommerce kosárba helyezi a tételt.
 * @returns {Promise<{ok:true, item:object, price:object, priceAdjusted:boolean, checkoutUrl:string|null, requiresApproval:boolean}>}
 */
export async function addToCart(config) {
  let res;
  try {
    res = await fetch(`${BRIDGE_URL}/api/cart/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  } catch {
    throw new BridgeError('A híd szerver nem elérhető. Ellenőrizd, hogy fut-e (lásd server/README.md).');
  }
  const data = await parseJsonSafe(res);
  if (!res.ok || !data?.ok) {
    throw new BridgeError(data?.message ?? 'A kosárba helyezés sikertelen.', { status: res.status, errors: data?.errors });
  }
  return data;
}

export { BridgeError };
