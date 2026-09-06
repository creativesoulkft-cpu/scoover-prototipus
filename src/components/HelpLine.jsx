/**
 * "Nem boldogulsz?" – minden képernyő alján, állandóan látható segítség-sor.
 * A telefonszám és a helyszín a src/data/contact.js-ből jön (egy helyen).
 */
import { CONTACT_PHONE, CONTACT_PHONE_HREF, CONTACT_PLACE } from '../data/contact.js';

export default function HelpLine() {
  return (
    <p className="help-line">
      Nem boldogulsz? Hívj:{' '}
      {CONTACT_PHONE_HREF
        ? <a href={CONTACT_PHONE_HREF}><strong>{CONTACT_PHONE}</strong></a>
        : <strong>{CONTACT_PHONE}</strong>}
      {' '}— vagy gyere be hozzánk {CONTACT_PLACE}.
    </p>
  );
}
