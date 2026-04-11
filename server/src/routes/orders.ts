import { Router } from "express";
import {
    createOrderHandler,
    getAllOrdersHandler,
    getOrderByIdHandler,
    updateOrderStatusHandler
} from "../controllers/orderController.js";

const router = Router();

router.get("/", getAllOrdersHandler);
router.get("/:order_id", getOrderByIdHandler);
router.post("/", createOrderHandler);
router.patch("/:order_id/status", updateOrderStatusHandler);

export default router;
