import { Router } from "express";
import { createOrderHandler, deleteOrderHandler, getAllOrdersHandler, getOrderByIdHandler, updateOrderHandler, updateOrderStatusHandler } from "../controllers/orderController.js";
const router = Router();
router.get("/", getAllOrdersHandler);
router.get("/:order_id", getOrderByIdHandler);
router.post("/", createOrderHandler);
router.patch("/:order_id", updateOrderHandler);
router.patch("/:order_id/status", updateOrderStatusHandler);
router.delete("/:order_id", deleteOrderHandler);
export default router;
//# sourceMappingURL=orders.js.map