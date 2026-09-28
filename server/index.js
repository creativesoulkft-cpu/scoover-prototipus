/**
 * Scoover híd szerver – a React konfigurátor mögötti API:
 *   - kép feltöltés (CUSTOM), ár-hitelesítés, WooCommerce kosártétel (routes/cart, upload)
 *   - mentett tervek SCV-… azonosítóval (routes/designs)
 *   - fiókok: regisztráció, belépés, terveim, rollereim (routes/account)
 *   - nyomdai feladatok: PDF + CutContour + munkalap (routes/print)
 * Lásd server/README.md a környezeti változókért és a helyi teszteléshez.
 */
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { openDb } from './lib/db.js';
import { attachUser, csrfGuard } from './lib/auth.js';
import cartRouter from './routes/cart.js';
import uploadRouter from './routes/upload.js';
import designsRouter from './routes/designs.js';
import accountRouter from './routes/account.js';
import printRouter from './routes/print.js';

openDb(config.dbPath);

const app = express();
app.set('trust proxy', 1);

app.use(cors({
  origin: (origin, cb) => {
    // eszközök (curl, Postman) origin nélkül jönnek – ezeket engedjük; böngészőből csak a listát
    if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`Nem engedélyezett origó: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(csrfGuard);
app.use(attachUser);
app.use('/uploads', express.static(config.uploadDir));

app.get('/api/health', (req, res) => res.json({ ok: true, wooMode: config.wooMode, accounts: true, designs: true, print: true }));

app.use(cartRouter);
app.use(uploadRouter);
app.use(designsRouter);
app.use(accountRouter);
app.use(printRouter);

app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'Ismeretlen végpont.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ ok: false, message: 'A fájl túl nagy (max. 12 MB).' });
  }
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({ ok: false, message: 'A kérés túl nagy.' });
  }
  if (String(err?.message ?? '').startsWith('Nem engedélyezett origó')) {
    return res.status(403).json({ ok: false, message: err.message });
  }
  console.error(err);
  res.status(500).json({ ok: false, message: 'Váratlan szerverhiba.' });
});

app.listen(config.port, () => {
  console.log(`Scoover híd fut: http://localhost:${config.port} (WOO_MODE=${config.wooMode}, DB=${config.dbPath})`);
  if (config.wooMode !== 'live') console.log('MOCK mód: nem hív valódi WooCommerce-t, a válaszok szimuláltak.');
  if (!config.smtpUrl) console.log('Levelezés: console mód (SMTP_URL nincs beállítva) – a linkek ide, a naplóba íródnak.');
  if (!config.adminToken && !config.adminEmails.length) console.log('FIGYELEM: nincs ADMIN_TOKEN / ADMIN_EMAILS – a nyomdai végpontok nem érhetők el.');
});
