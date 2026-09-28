import 'dotenv/config';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = dirname(fileURLToPath(import.meta.url));

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

const list = (v) => String(v ?? '').split(',').map((s) => s.trim()).filter(Boolean);

const port = num(process.env.PORT, 8787);
const corsOrigins = list(process.env.CORS_ORIGIN).length ? list(process.env.CORS_ORIGIN) : ['http://localhost:5173'];
const dataDir = resolve(SERVER_DIR, process.env.DATA_DIR ?? 'data');

export const config = {
  port,
  serverDir: SERVER_DIR,
  /** Engedélyezett frontend origók (vesszővel elválasztva) – sütis kérésekhez pontos egyezés kell. */
  corsOrigins,
  /** A konfigurátor nyilvános URL-je – az e-mailekben küldött linkek (megerősítés, jelszó) ide mutatnak. */
  appUrl: (process.env.APP_URL ?? corsOrigins[0]).replace(/\/$/, ''),

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

  /** Adatmappa: SQLite adatbázis, terv-előnézetek, nyomdai feladatok. Rendszeres mentés alá vonandó! */
  dataDir,
  dbPath: process.env.DB_PATH ?? resolve(dataDir, 'scoover.sqlite'),
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? `http://localhost:${port}`).replace(/\/$/, ''),

  /** Fiók / munkamenet */
  sessionSameSite: process.env.SESSION_SAMESITE ?? 'Lax',   // 'None', ha a frontend és a híd más site-on fut (HTTPS kell)
  cookieSecure: process.env.COOKIE_SECURE === '1' || (process.env.PUBLIC_BASE_URL ?? '').startsWith('https://'),
  /** Admin: fejlécben (x-admin-token) küldött titok az ügyfélszolgálati nézethez, vagy admin szerepű fiókok e-mailjei. */
  adminToken: process.env.ADMIN_TOKEN ?? '',
  adminEmails: list(process.env.ADMIN_EMAILS).map((e) => e.toLowerCase()),

  /** Levelezés: SMTP_URL nélkül a levelek a konzolra íródnak. */
  smtpUrl: process.env.SMTP_URL ?? '',
  mailFrom: process.env.MAIL_FROM ?? 'Scoover <no-reply@scoover.hu>',

  /** Nyomdai render (server/print) */
  print: {
    rollWidthMm: num(process.env.PRINT_ROLL_WIDTH_MM, 610),
    dpi: num(process.env.PRINT_DPI, 300),
    bleedMm: num(process.env.PRINT_BLEED_MM, 3),
    gapMm: num(process.env.PRINT_GAP_MM, 6),
    marginMm: num(process.env.PRINT_MARGIN_MM, 10),
    minDpiWarn: num(process.env.PRINT_MIN_DPI_WARN, 150),
    /** Nyomdai minőségű textúra-mesterek (nem publikus): <id>.png / .jpg */
    assetsDir: resolve(SERVER_DIR, process.env.PRINT_ASSETS_DIR ?? 'print/assets'),
    /** A kliens előnézeti textúrái – tartalék, ha nincs mester (figyelmeztetéssel) */
    previewAssetsDir: resolve(SERVER_DIR, '..', 'public'),
    fontsDir: resolve(SERVER_DIR, process.env.PRINT_FONTS_DIR ?? 'print/fonts'),
  },
};
