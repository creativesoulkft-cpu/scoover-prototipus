/** Ideiglenes csonk – a nyomdai pipeline (server/print) a következő lépésben kerül ide. */
import { Router } from 'express';
const router = Router();
router.all('/api/print-jobs*', (req, res) => res.status(501).json({ ok: false, message: 'A nyomdai fájl generálás még nincs bekapcsolva.' }));
export default router;
