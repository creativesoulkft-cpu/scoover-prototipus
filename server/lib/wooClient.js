/**
 * WooCommerce Store API kliens.
 *
 * MOCK mód (WOO_MODE=mock, alapértelmezett): nem hív ki semmilyen valódi
 * WooCommerce-t, hanem szimulálja a válaszát – így a teljes lánc (kép
 * feltöltés -> felbontás-ellenőrzés -> árazás -> "kosárba helyezés")
 * helyi WordPress-telepítés nélkül tesztelhető.
 *
 * LIVE mód (WOO_MODE=live): a szabvány WooCommerce Store API-t hívja
 * (natívan a WooCommerce mag része 8.9-től, nincs plugin-függőség):
 *   1. GET  /wp-json/wc/store/v1/cart         – friss vendégkosár + Cart-Token
 *   2. POST /wp-json/wc/store/v1/cart/add-item – tétel hozzáadása
 *
 * A tétel egyedi adatait (modell, szint, kategória, szín, feltöltött kép,
 * felirat, taposó-extra, a HITELESÍTETT egységár) a request body egy
 * `scoover` nevű, nem szabványos mezőjében küldjük. A Store API add-item
 * végpontja NEM korlátozza a request törzsét csak a saját (id/quantity/
 * variation) mezőire, ezért ez az extra mező átjut a WordPress oldalra,
 * ahol a `woocommerce_store_api_add_to_cart_data` szűrő (lásd
 * server/wordpress/scoover-store-api-extension.php) olvassa ki és
 * csatolja kosár-item meta adatként. Ez a dokumentált, hivatalos
 * kiterjesztési pont – forrás: a WooCommerce core CartAddItem route és a
 * woocommerce/woocommerce-blocks#7252 PR, ami bevezette.
 */
import { config } from '../config.js';

function pickProductId(tier) {
  const variationId = config.wooTierVariationIds?.[tier];
  if (variationId) return variationId;
  return config.wooProductId;
}

function buildScooverPayload(cartConfig, unitPriceHuf) {
  return {
    model: cartConfig.model,
    tier: cartConfig.tier,
    category: cartConfig.category ?? null,
    colorway: cartConfig.colorway ?? null,
    density: cartConfig.density ?? null,
    uploadedImageUrl: cartConfig.uploadedImageUrl ?? null,
    imageTransform: cartConfig.imageTransform ?? null,
    labels: cartConfig.labels ?? [],
    includeFootboard: Boolean(cartConfig.includeFootboard),
    installation: cartConfig.installation ?? 'none',
    unitPriceHuf,
    currency: 'HUF',
    requiresApproval: cartConfig.tier === 'custom',
  };
}

async function getGuestCartSession() {
  const res = await fetch(`${config.wooBaseUrl}/wp-json/wc/store/v1/cart`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`A WooCommerce Store API nem érhető el (HTTP ${res.status}).`);
  }
  return { cartToken: res.headers.get('cart-token') };
}

async function addItemLive(cartConfig, unitPriceHuf) {
  if (!config.wooBaseUrl) {
    throw new Error('A híd szerver nincs konfigurálva: hiányzik a WOO_BASE_URL.');
  }
  const productId = pickProductId(cartConfig.tier);
  if (!productId) {
    throw new Error('A híd szerver nincs konfigurálva: hiányzik a WooCommerce termék-/variáció-azonosító.');
  }

  const { cartToken } = await getGuestCartSession();

  const res = await fetch(`${config.wooBaseUrl}/wp-json/wc/store/v1/cart/add-item`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(cartToken ? { 'Cart-Token': cartToken } : {}),
    },
    body: JSON.stringify({
      id: productId,
      quantity: 1,
      scoover: buildScooverPayload(cartConfig, unitPriceHuf),
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message ?? `A WooCommerce elutasította a kosártételt (HTTP ${res.status}).`);
  }

  const finalCartToken = res.headers.get('cart-token') ?? cartToken;
  return {
    item: data,
    cartToken: finalCartToken,
    // Lásd server/README.md "Kosár-átadás a pénztárnak" szakasza: a klasszikus,
    // cookie-alapú WooCommerce checkout oldalnak külön át kell adni ezt a
    // Cart-Token-t egy WordPress-oldali hidalóval (mu-plugin), mert a Store
    // API tokenje önmagában nem ismerődik fel a normál checkout oldalon.
    checkoutUrl: config.checkoutUrl
      ? `${config.checkoutUrl}${config.checkoutUrl.includes('?') ? '&' : '?'}scoover_cart_token=${encodeURIComponent(finalCartToken ?? '')}`
      : null,
  };
}

async function addItemMock(cartConfig, unitPriceHuf) {
  const scoover = buildScooverPayload(cartConfig, unitPriceHuf);
  return {
    item: {
      key: `mock-${Date.now().toString(36)}`,
      name: 'Egyedi roller-fólia (MOCK – nincs valódi WooCommerce)',
      quantity: 1,
      totals: { line_total: String(unitPriceHuf * 100), currency_code: 'HUF', currency_minor_unit: 2 },
      extensions: { scoover },
    },
    cartToken: 'mock-cart-token',
    checkoutUrl: null,
  };
}

export async function addItemToWooCart(cartConfig, unitPriceHuf) {
  return config.wooMode === 'live' ? addItemLive(cartConfig, unitPriceHuf) : addItemMock(cartConfig, unitPriceHuf);
}
