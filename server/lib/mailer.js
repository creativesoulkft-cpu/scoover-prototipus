/**
 * E-mail küldés (megerősítő és jelszó-visszaállító linkek).
 *
 * - Nincs SMTP_URL → "console" mód: a levél a szerver naplójába íródik.
 *   Fejlesztéshez tökéletes, élesben az SMTP_URL kötelező.
 * - SMTP_URL (pl. smtps://user:pass@smtp.example.com:465) → nodemailer.
 */
import { config } from '../config.js';

let transporter = null;
async function getTransporter() {
  if (!config.smtpUrl) return null;
  if (!transporter) {
    const nodemailer = await import('nodemailer');
    transporter = nodemailer.default.createTransport(config.smtpUrl);
  }
  return transporter;
}

export async function sendMail({ to, subject, text }) {
  const t = await getTransporter();
  if (!t) {
    console.log(`\n[MAIL – console mód] Címzett: ${to}\nTárgy: ${subject}\n${text}\n`); // eslint-disable-line no-console
    return { delivered: false, mode: 'console' };
  }
  await t.sendMail({ from: config.mailFrom, to, subject, text });
  return { delivered: true, mode: 'smtp' };
}

export const verifyLink = (token) => `${config.appUrl}#verify=${encodeURIComponent(token)}`;
export const resetLink = (token) => `${config.appUrl}#reset=${encodeURIComponent(token)}`;

export function verificationMail(user, token) {
  return {
    to: user.email,
    subject: 'Scoover – erősítsd meg az e-mail címed',
    text: `Szia${user.name ? ` ${user.name}` : ''}!\n\nKöszönjük a regisztrációt a Scoover konfigurátorban. Erősítsd meg az e-mail címed ezen a linken (24 óráig érvényes):\n\n${verifyLink(token)}\n\nHa nem te regisztráltál, ezt a levelet nyugodtan törölheted.\n\nScoover · Veszprém`,
  };
}

/** "Elkészült a fólia a rolleredhez" – a kívánságlistán várakozóknak. */
export function wishAvailableMail(wish, { link = null, message = null } = {}) {
  const model = `${wish.brand} ${wish.modelName}${wish.year ? ` (${wish.year})` : ''}`;
  return {
    to: wish.email,
    subject: `Scoover – elérhető a fólia: ${model}`,
    text: `Szia${wish.name ? ` ${wish.name}` : ''}!\n\nJó hír: elkészült a Scoover fóliaszett ehhez a modellhez: ${model}.\n${message ? `\n${message}\n` : ''}\nTervezd meg a sajátodat a konfigurátorban:\n${link ?? config.appUrl}\n\nEzt a levelet azért kaptad, mert a kívánságlistánkon kérted az értesítést. Több levelet nem küldünk erről a modellről.\n\nScoover · Veszprém`,
  };
}

export function passwordResetMail(user, token) {
  return {
    to: user.email,
    subject: 'Scoover – új jelszó beállítása',
    text: `Szia${user.name ? ` ${user.name}` : ''}!\n\nÚj jelszót kértél a Scoover fiókodhoz. Ezen a linken állíthatod be (1 óráig érvényes):\n\n${resetLink(token)}\n\nHa nem te kérted, nincs teendőd – a jelszavad nem változik.\n\nScoover · Veszprém`,
  };
}
