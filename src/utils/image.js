/**
 * Feltöltött kép előkészítése mintának.
 *
 * - típus- és méretellenőrzés,
 * - kliens oldali kicsinyítés (max. MAX_EDGE px a hosszabb oldalon), hogy a
 *   böngészőnek ne kelljen 20 MP-es fotót raszterizálnia minden újrarajzolásnál,
 * - data-URL-t ad vissza, amit az SVG <image> közvetlenül használ.
 *
 * A végleges rendszerben ide kerül a nyomdai validáció is (min. felbontás a
 * darab valós méretéhez képest, színprofil, tiltott tartalom stb.).
 */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
export const MAX_EDGE = 2048;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export async function prepareUploadedImage(file) {
  if (!ACCEPTED.includes(file.type)) {
    throw new Error('Csak JPG, PNG vagy WebP kép tölthető fel.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('A fájl túl nagy (max. 12 MB).');
  }

  const bitmap = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  const luminance = measureLuminance(ctx, width, height);

  // PNG-t átlátszóság miatt megtartjuk, minden mást JPEG-re tömörítünk.
  const href = file.type === 'image/png'
    ? canvas.toDataURL('image/png')
    : canvas.toDataURL('image/jpeg', 0.9);

  return { href, width, height, luminance, originalWidth: bitmap.width, originalHeight: bitmap.height };
}

/** Átlagos világosság 0..1 – ritkított mintavétellel, a felirat auto-színéhez. */
function measureLuminance(ctx, width, height) {
  const { data } = ctx.getImageData(0, 0, width, height);
  const step = 4 * Math.max(1, Math.floor((width * height) / 20000));
  let sum = 0, n = 0;
  for (let i = 0; i < data.length; i += step) {
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    n++;
  }
  return n ? sum / n / 255 : 0.5;
}

function loadImage(file) {
  if ('createImageBitmap' in window) return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('A kép nem olvasható.')); };
    img.src = url;
  });
}
