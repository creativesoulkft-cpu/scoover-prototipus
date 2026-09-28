/**
 * Nyomdai képforrások feloldása: textúra-mesterek és feltöltött képek.
 *
 * Textúrák: server/print/assets/patterns/<mintaId>.png|.jpg|.webp a NYOMDAI
 * minőségű mester (nem publikus). Ha nincs, a kliens előnézeti WebP-jét
 * (public/patterns/<id>.webp, 1024 px) használjuk – ilyenkor a manifest és a
 * munkalap FIGYELMEZTET, mert 1024 px egy 240–320 mm-es csempére ~80–110 dpi.
 *
 * Feltöltött kép: a híd saját uploads mappájából közvetlenül (ha az URL a
 * saját PUBLIC_BASE_URL alá mutat), különben HTTP-n letöltve.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sizeOf from 'image-size';
import sharp from 'sharp';
import { config } from '../config.js';

const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };

/**
 * A render (resvg) csak PNG-t és JPEG-et dekódol – a WebP-t (és minden mást)
 * a sharp alakítja PNG-vé. A méretet a kész bufferből olvassuk.
 * @returns {Promise<{buf:Buffer, ext:string, width:number, height:number}>}
 */
async function normalizeImage(buf, ext) {
  let out = buf, outExt = ext;
  if (!MIME[ext]) { out = await sharp(buf).png().toBuffer(); outExt = 'png'; }
  const dim = sizeOf(out);
  return { buf: out, ext: outExt, width: dim.width, height: dim.height };
}

function toDataUri(buf, ext) {
  return `data:${MIME[ext] ?? 'application/octet-stream'};base64,${buf.toString('base64')}`;
}

/**
 * @param {{ src: string, id: string }} pattern image-tile minta (src: 'patterns/x.webp')
 * @returns {{ href: string, width: number, height: number, isMaster: boolean, file: string }|null}
 */
export async function resolveTextureAsset(pattern) {
  const base = pattern.id;
  for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
    const p = join(config.print.assetsDir, 'patterns', `${base}.${ext}`);
    if (existsSync(p)) {
      const img = await normalizeImage(readFileSync(p), ext);
      return { href: toDataUri(img.buf, img.ext), width: img.width, height: img.height, isMaster: true, file: p };
    }
  }
  const preview = join(config.print.previewAssetsDir, pattern.src);
  if (existsSync(preview)) {
    const img = await normalizeImage(readFileSync(preview), preview.split('.').pop());
    return { href: toDataUri(img.buf, img.ext), width: img.width, height: img.height, isMaster: false, file: preview };
  }
  return null;
}

/**
 * @param {string} url a feltöltött kép URL-je (uploadedImageUrl)
 * @returns {Promise<{ href: string, width: number, height: number, bytes: number }>}
 */
export async function resolveUploadedImage(url) {
  let buf;
  const localPrefix = `${config.publicBaseUrl}/uploads/`;
  if (url.startsWith(localPrefix)) {
    const name = url.slice(localPrefix.length).split('?')[0];
    if (!/^[\w.-]+$/.test(name)) throw new Error('Érvénytelen kép-hivatkozás.');
    const p = join(config.uploadDir, name);
    if (!existsSync(p)) throw new Error(`A feltöltött kép nem található a szerveren (${name}).`);
    buf = readFileSync(p);
  } else {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`A kép nem tölthető le (${res.status}).`);
    buf = Buffer.from(await res.arrayBuffer());
  }
  const dim = sizeOf(buf);
  const img = await normalizeImage(buf, dim.type === 'jpg' ? 'jpg' : dim.type);
  return { href: toDataUri(img.buf, img.ext), width: img.width, height: img.height, bytes: buf.length };
}
