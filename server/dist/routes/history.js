import { Router } from 'express';
import { getHistoryHandler } from "../controllers/historyController.js";
const router = Router();
router.get('/', getHistoryHandler);
export default router;
//# sourceMappingURL=history.js.map