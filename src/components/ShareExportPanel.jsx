/**
 * "Mentsd le a tervedet!" – a látható roller-konfigurációt vízjelezett,
 * megosztható PNG-vé alakítja (src/utils/exportImage.js) és letölti a
 * felhasználó eszközére. Nincs szerver oldali mentés/tárolás – ez kizárólag
 * kliens oldali kép-export (lásd a fájl végi megjegyzést a fiókos mentésről).
 *
 * A "Megosztás" gyorsgombok a natív Web Share API-t használják (`navigator.share`
 * fájllal) – ez nyitja meg a mobil OS saját megosztó-lapját, amin a telepített
 * appok (WhatsApp, Instagram, Messenger stb.) automatikusan felkínálódnak.
 * FONTOS, ÁTLÁTHATÓSÁG KEDVÉÉRT: a Web Share API nem tud egy adott appot
 * (pl. kifejezetten "Instagram Story" módot) közvetlenül megnyitni – mindkét
 * gomb ugyanazt a natív választólapot nyitja meg, csak más előre kitöltött
 * szöveggel; a végső célalkalmazást mindig a felhasználó/az OS dönti el. Ott,
 * ahol a böngésző nem támogatja a fájlos megosztást (pl. legtöbb desktop
 * böngésző), a gombok automatikusan elrejtődnek – a letöltés gomb ilyenkor is
 * működik.
 */
import { useState } from 'react';
import { renderConfigToPng, downloadBlob, blobToFile } from '../utils/exportImage.js';

function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
}

export default function ShareExportPanel({ canvasWrapRef, modelName, tierLabel, patternName, priceText }) {
  const [status, setStatus] = useState('idle'); // idle | working | error
  const [error, setError] = useState(null);

  async function buildFile() {
    const svgEl = canvasWrapRef.current?.querySelector('svg.scooter-canvas');
    if (!svgEl) throw new Error('A vászon jelenleg nem érhető el.');
    const blob = await renderConfigToPng(svgEl, { modelName, tierLabel, patternName, priceText });
    const filename = `scoover-${slugify(modelName)}-${slugify(tierLabel)}.png`;
    return { blob, filename };
  }

  async function handleDownload() {
    setStatus('working');
    setError(null);
    try {
      const { blob, filename } = await buildFile();
      downloadBlob(blob, filename);
      setStatus('idle');
    } catch (e) {
      setStatus('error');
      setError(e.message);
    }
  }

  async function handleShare(caption) {
    setStatus('working');
    setError(null);
    try {
      const { blob, filename } = await buildFile();
      const file = blobToFile(blob, filename);
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Scoover roller-fólia terv',
          text: caption,
        });
      } else {
        // nincs natív megosztás (pl. desktop) – essünk vissza letöltésre
        downloadBlob(blob, filename);
      }
      setStatus('idle');
    } catch (e) {
      // a felhasználó megszakíthatja a natív megosztást (AbortError) – ez nem hiba
      if (e.name === 'AbortError') { setStatus('idle'); return; }
      setStatus('error');
      setError(e.message);
    }
  }

  const canShareFiles = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function';

  return (
    <div className="share-panel">
      <button type="button" className="btn btn-primary" disabled={status === 'working'} onClick={handleDownload}>
        {status === 'working' ? 'Kép készítése…' : '📸 Mentsd le a tervedet!'}
      </button>

      {canShareFiles && (
        <div className="share-quick-row">
          <button type="button" className="btn" disabled={status === 'working'}
            onClick={() => handleShare(`Ezt terveztem a Scooverrel: ${modelName} · ${tierLabel}. Tervezd meg a tiédet: scoover.hu`)}>
            Megosztás WhatsAppon
          </button>
          <button type="button" className="btn" disabled={status === 'working'}
            onClick={() => handleShare(`Nézd, ezt terveztem! Tervezd meg a tiédet: scoover.hu`)}>
            Megosztás Instagram Story-ban
          </button>
        </div>
      )}

      {error && <p className="error small">{error}</p>}
    </div>
  );
}

/**
 * FIÓKOS MENTÉS – VÁZLAT, NINCS MEGVALÓSÍTVA EBBEN A KÖRBEN.
 *
 * Ez a kör csak kliens oldali kép-exportot valósít meg, szerver oldali
 * mentés/adatbázis nélkül. A "Mentsd el a fiókodba" funkció külön kör lesz,
 * amikor a WooCommerce-fiókrendszer bekötése megtörténik. Tervezett működés:
 *
 * 1. Bejelentkezett vásárló a konfigurátorban egy "Mentsd el a fiókodba"
 *    gombra kattint (csak akkor jelenik meg, ha van érvényes WP/WooCommerce
 *    session – lásd server/ a kosár-híd meglévő session-kezeléséről).
 * 2. A konfigurátor NEM a képet, hanem a teljes állapot-JSON-t küldi el a
 *    hídnak – ugyanazt a szerkezetet, amit a kosárba helyezés is használ
 *    (lásd src/utils/cartConfig.js buildCartConfig): modell, szint, minta/
 *    feltöltött kép URL-je, transzformáció, feliratok, taposó-extra,
 *    darabonkénti kiválasztás.
 * 3. A híd szerver egy hitelesített WooCommerce REST/Store API hívással a
 *    vásárló felhasználói fiókjához (user meta vagy egyedi táblázat) menti
 *    ezt a JSON-t, egy névvel/időbélyeggel ellátva ("Mentett tervek" lista).
 * 4. Visszatöltéskor a konfigurátor ugyanebből a JSON-ból állítja vissza a
 *    teljes állapotot (App.jsx useState hívások kezdőértékei), pontosan
 *    onnan folytatva, ahol a vásárló abbahagyta – vagy egy gombbal
 *    közvetlenül kosárba is teheti a mentett tervet (a meglévő
 *    /api/cart/add végpont újrafelhasználásával).
 *
 * Ehhez a körhöz NEM készült kód – sem backend-mentés, sem adatbázis.
 */
