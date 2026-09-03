/**
 * Scoover kosár-híd – köztes szerver a React konfigurátor és a
 * WooCommerce Store API között. Lásd server/README.md a teljes leírásért,
 * a környezeti változókért és a helyi teszteléshez (WOO_MODE=mock).
 */
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import cartRouter from './routes/cart.js';
import uploadRouter from './routes/upload.js';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(config.uploadDir));

app.get('/api/health', (req, res) => res.json({ ok: true, wooMode: config.wooMode }));

app.use(cartRouter);
app.use(uploadRouter);

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
  console.error(err);
  res.status(500).json({ ok: false, message: 'Váratlan szerverhiba.' });
});

app.listen(config.port, () => {
  console.log(`Scoover kosár-híd fut: http://localhost:${config.port} (WOO_MODE=${config.wooMode})`);
  if (config.wooMode !== 'live') {
    console.log('MOCK mód: nem hív valódi WooCommerce-t, a válaszok szimuláltak.');
  }
});
