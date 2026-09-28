/**
 * Kliens a saját köztes híd szerverhez (server/) – lásd server/README.md.
 * A híd felel a CUSTOM kép szerverre mentéséért, a felbontás-ellenőrzésért,
 * az ár újraszámolásáért, a tervek mentéséért, a fiókokért és a WooCommerce
 * Store API hívásért.
 *
 * Minden hívás `credentials: 'include'`-dal megy (fiók-süti), és egy saját
 * fejlécet visel (X-Requested-With) – ez a CSRF-védelem alapja: idegen
 * oldalról indított űrlap ezt a fejlécet nem tudja beállítani, a böngésző
 * pedig csak a híd CORS-listáján lévő origónak engedi.
 */
export const BRIDGE_URL = (import.meta.env.VITE_BRIDGE_URL ?? 'http://localhost:8787').replace(/\/$/, '');

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export class BridgeError extends Error {
  constructor(message, { status, errors, code } = {}) {
    super(message);
    this.name = 'BridgeError';
    this.status = status;
    this.code = code ?? null;
    this.errors = errors ?? [];
  }
}

export const OFFLINE_MESSAGE = 'A híd szerver nem elérhető. Ellenőrizd, hogy fut-e (lásd server/README.md).';

/**
 * Közös hívó: JSON törzs vagy FormData, hibakezelés egy helyen.
 * @param {string} path pl. '/api/designs'
 * @param {{method?:string, body?:object, form?:FormData, headers?:object}} [opts]
 */
export async function bridgeFetch(path, { method = 'GET', body, form, headers = {} } = {}) {
  const init = {
    method,
    credentials: 'include',
    headers: { 'X-Requested-With': 'scoover', ...headers },
  };
  if (form) init.body = form;
  else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`${BRIDGE_URL}${path}`, init);
  } catch {
    throw new BridgeError(OFFLINE_MESSAGE, { code: 'offline' });
  }
  const data = await parseJsonSafe(res);
  if (!res.ok || !data?.ok) {
    throw new BridgeError(data?.message ?? 'A kérés sikertelen.', { status: res.status, errors: data?.errors, code: data?.code });
  }
  return data;
}

/**
 * Feltölti a CUSTOM mintához használt képet a hídra – az EREDETI fájlt (nem a
 * kliens oldali, kicsinyített előnézetet), mert a nyomdai render ebből dolgozik.
 * @returns {Promise<{url:string, width:number, height:number}>}
 */
export async function uploadCustomImage(file) {
  const form = new FormData();
  form.append('image', file);
  return bridgeFetch('/api/upload', { method: 'POST', form });
}

/**
 * Elküldi a teljes konfigurációt a hídnak, ami újraszámolja/ellenőrzi az árat
 * és a WooCommerce kosárba helyezi a tételt.
 * @returns {Promise<{ok:true, item:object, price:object, priceAdjusted:boolean, checkoutUrl:string|null, requiresApproval:boolean, designId:string|null}>}
 */
export async function addToCart(config) {
  return bridgeFetch('/api/cart/add', { method: 'POST', body: config });
}

/** Egyszerű elérhetőség-ellenőrzés (a felület ebből tudja, kínálhat-e szerveres mentést). */
export async function bridgeHealth() {
  try {
    return await bridgeFetch('/api/health');
  } catch {
    return null;
  }
}
