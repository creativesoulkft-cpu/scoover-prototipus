import sizeOf from 'image-size';

/**
 * Letölti a képet a megadott URL-ről, és a valódi pixelméretét adja vissza.
 * Ez a szerver oldali, hitelesített ellenőrzés a `uploadedImageUrl`-hez –
 * sosem bízunk a kliens által állított szélesség/magasság mezőkben.
 */
export async function fetchImageDimensions(url) {
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error(`A kép nem érhető el (${e.message}).`);
  }
  if (!res.ok) {
    throw new Error(`A kép nem érhető el (HTTP ${res.status}).`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  let dim;
  try {
    dim = sizeOf(buf);
  } catch {
    throw new Error('A fájl nem olvasható be képként.');
  }
  return { width: dim.width, height: dim.height };
}
