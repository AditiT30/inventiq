import { Router } from 'express';
import { completeBatchHandler, deleteBatchHandler, getAllBatchesHandler, getBatchByHandler, startBatchHandler, updateBatchHandler } from "../controllers/manufacturingController.js";
const router = Router();
// Placeholder route
router.get("/", getAllBatchesHandler);
router.get("/:batch_number", getBatchByHandler);
router.post("/", startBatchHandler);
router.patch("/:batch_number", updateBatchHandler);
router.patch("/:batch_number/complete", completeBatchHandler);
router.delete("/:batch_number", deleteBatchHandler);
export default router;
//# sourceMappingURL=manufacturing.js.map