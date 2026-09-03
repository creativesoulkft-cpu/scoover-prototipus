import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sizeOf from 'image-size';
import { config } from '../config.js';
import { meetsMinResolution } from '../../src/pricing.js';

const ACCEPTED_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const MAX_BYTES = 12 * 1024 * 1024;

if (!existsSync(config.uploadDir)) mkdirSync(config.uploadDir, { recursive: true });

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES } });

const router = Router();

/**
 * A CUSTOM mintához feltöltött kép fogadása. Ez adja a valódi, szerver
 * oldali `uploadedImageUrl`-t, amit a /api/cart/add később függetlenül
 * újra ellenőriz (sosem bízunk kizárólag ebben a korai visszajelzésben).
 *
 * Éles környezetben ez a végpont cserélhető: a fájl helyben tárolás helyett
 * mehet objektumtárolóba (S3-kompatibilis) vagy a WordPress média-
 * könyvtárba (wp/v2/media) – a válasz szerződése (url/width/height) marad.
 */
router.post('/api/upload', upload.single('image'), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ ok: false, message: 'Hiányzó kép a kérésből.' });

  const ext = ACCEPTED_EXT[file.mimetype];
  if (!ext) {
    return res.status(400).json({ ok: false, message: 'Csak JPG, PNG vagy WebP kép tölthető fel.' });
  }

  let dim;
  try {
    dim = sizeOf(file.buffer);
  } catch {
    return res.status(400).json({ ok: false, message: 'A kép nem olvasható be.' });
  }

  const min = config.minCustomImage;
  if (!meetsMinResolution(dim.width, dim.height, min)) {
    return res.status(422).json({
      ok: false,
      message: `A kép felbontása túl alacsony (${dim.width}×${dim.height} px). Egyedi (CUSTOM) mintához legalább ${min.width}×${min.height} px szükséges.`,
    });
  }

  const filename = `${randomUUID()}${ext}`;
  writeFileSync(join(config.uploadDir, filename), file.buffer);

  return res.status(200).json({
    ok: true,
    url: `${config.publicBaseUrl}/uploads/${filename}`,
    width: dim.width,
    height: dim.height,
  });
});

export default router;
