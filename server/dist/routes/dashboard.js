import { Router } from "express";
import { getDashboardSummaryHandler } from "../controllers/dashboardController.js";
const router = Router();
router.get("/summary", getDashboardSummaryHandler);
export default router;
//# sourceMappingURL=dashboard.js.map