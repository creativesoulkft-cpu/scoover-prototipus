import { Router } from 'express';
import { calculatePrice, validateConfigShape, meetsMinResolution, PricingError } from '../../src/pricing.js';
import { fetchImageDimensions } from '../lib/imageCheck.js';
import { addItemToWooCart } from '../lib/wooClient.js';
import { config } from '../config.js';

const router = Router();

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

  try {
    const result = await addItemToWooCart(cartConfig, price.total);
    return res.status(200).json({
      ok: true,
      item: result.item,
      price,
      priceAdjusted,
      checkoutUrl: result.checkoutUrl ?? (config.checkoutUrl || null),
      requiresApproval: cartConfig.tier === 'custom',
    });
  } catch (e) {
    return res.status(502).json({ ok: false, message: `A WooCommerce kosár nem érhető el: ${e.message}` });
  }
});

export default router;
