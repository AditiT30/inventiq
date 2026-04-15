import { Router } from "express";
import { detectLowStockHandler, suggestPurchaseHandler } from "../controllers/reorderController.js";
const router = Router();
router.get("/low-stock", detectLowStockHandler);
router.post("/suggestions", suggestPurchaseHandler);
export default router;
//# sourceMappingURL=reorder.js.map