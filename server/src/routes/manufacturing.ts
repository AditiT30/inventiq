import { Router } from 'express';
import {
    completeBatchHandler,
    getAllBatchesHandler,
    getBatchByHandler,
    startBatchHandler
} from "../controllers/manufacturingController.js";

const router = Router();

// Placeholder route
router.get("/", getAllBatchesHandler);
router.get("/:batch_number", getBatchByHandler);
router.post("/", startBatchHandler);
router.patch("/:batch_number/complete", completeBatchHandler);

export default router;