import { Router } from 'express';
import { calculatePrice, validateConfigShape, meetsMinResolution, PricingError } from '../../src/pricing.js';
import { fetchImageDimensions } from '../lib/imageCheck.js';
import { addItemToWooCart } from '../lib/wooClient.js';
import { config } from '../config.js';
import { validateDesignDocument } from '../lib/designValidate.js';
import { createDesign, getDesign, updateDesign, canEdit, setStatus } from '../lib/designStore.js';
import { currentUser } from '../lib/auth.js';

const router = Router();

/**
 * A kosár-csomagban utazó teljes terv-dokumentum (config.design) mentése:
 * a rendelés így egy stabil SCV-… azonosítóra hivatkozik, amiből a nyomdai
 * fájl bármikor újragyártható. Ha a terv már mentett és a hívó módosíthatja,
 * frissítjük; egyébként új azonosítót kap.
 * @returns {Promise<string|null>} a terv azonosítója
 */
async function persistDesign(req, cartConfig) {
  if (!cartConfig.design || typeof cartConfig.design !== 'object') return null;
  const { doc, errors } = await validateDesignDocument(cartConfig.design);
  if (!doc) throw new Error(errors[0]);
  const user = currentUser(req);
  const existing = doc.id ? getDesign(doc.id, { withDoc: false }) : null;
  if (existing && canEdit(existing, { userId: user?.id, editKey: cartConfig.designEditKey })) {
    updateDesign(doc.id, doc);
    setStatus(doc.id, 'in-cart');
    return doc.id;
  }
  const r = createDesign(doc, { ownerUserId: user?.id ?? null });
  setStatus(r.id, 'in-cart');
  return r.id;
}

router.post('/api/cart/add', async (req, res) => {
  const cartConfig = req.body ?? {};

  const shapeErrors = validateConfigShape(cartConfig);
  if (shapeErrors.length) {
    return res.status(400).json({ ok: false, message: shapeErrors[0], errors: shapeErrors });
  }

  if (cartConfig.tier === 'custom') {
    const min = config.minCustomImage;
    let dim;
    try {
      dim = await fetchImageDimensions(cartConfig.uploadedImageUrl);
    } catch (e) {
      return res.status(422).json({
        ok: false,
        message: `A feltöltött kép nem ellenőrizhető: ${e.message}`,
      });
    }
    if (!meetsMinResolution(dim.width, dim.height, min)) {
      return res.status(422).json({
        ok: false,
        message: `A feltöltött kép felbontása túl alacsony (${dim.width}×${dim.height} px). A nyomtatáshoz legalább ${min.width}×${min.height} px szükséges – tölts fel egy nagyobb felbontású képet.`,
      });
    }
  }

  let price;
  try {
    price = calculatePrice(cartConfig);
  } catch (e) {
    if (e instanceof PricingError) {
      return res.status(400).json({ ok: false, message: e.message, errors: e.errors });
    }
    throw e;
  }

  if (!price.minimumOrder.ok) {
    return res.status(400).json({ ok: false, message: price.minimumOrder.message });
  }

  // A kliens becslése (cartConfig.calculatedPrice) csak tájékoztató jellegű –
  // a ténylegesen a WooCommerce-nek küldött ár mindig a fenti, frissen
  // számolt `price.total`. Csak jelezzük, ha eltért, hogy a felület tudjon
  // róla (pl. időközben módosult árlista miatt).
  const priceAdjusted = typeof cartConfig.calculatedPrice === 'number' && cartConfig.calculatedPrice !== price.total;

  let designId = null;
  try {
    designId = await persistDesign(req, cartConfig);
  } catch (e) {
    return res.status(400).json({ ok: false, message: `A terv nem menthető: ${e.message}` });
  }

  try {
    const result = await addItemToWooCart({ ...cartConfig, designId }, price.total);
    return res.status(200).json({
      ok: true,
      item: result.item,
      price,
      priceAdjusted,
      designId,
      checkoutUrl: result.checkoutUrl ?? (config.checkoutUrl || null),
      requiresApproval: cartConfig.tier === 'custom',
    });
  } catch (e) {
    return res.status(502).json({ ok: false, message: `A WooCommerce kosár nem érhető el: ${e.message}` });
  }
});

export default router;
