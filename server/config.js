import 'dotenv/config';

function num(v, fallback) {
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeJson(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

const port = num(process.env.PORT, 8787);

export const config = {
  port,
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',

  /** 'mock' | 'live' – lásd server/README.md */
  wooMode: process.env.WOO_MODE ?? 'mock',
  wooBaseUrl: (process.env.WOO_BASE_URL ?? '').replace(/\/$/, ''),
  wooProductId: process.env.WOO_CUSTOM_PRODUCT_ID ?? '',
  /** { solid, print, custom } -> variáció ID, opcionális */
  wooTierVariationIds: safeJson(process.env.WOO_TIER_VARIATION_IDS, null),
  checkoutUrl: process.env.WOO_CHECKOUT_URL ?? '',

  minCustomImage: {
    width: num(process.env.MIN_CUSTOM_IMAGE_WIDTH, 2000),
    height: num(process.env.MIN_CUSTOM_IMAGE_HEIGHT, 2000),
  },

  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? `http://localhost:${port}`).replace(/\/$/, ''),
};
