import { AppError } from "../errors/AppError.js";
import { publishLiveEvent } from "../lib/liveEvents.js";
import { createOrder, updateStatus } from "../services/orderService.js";
import { prisma } from "../lib/db.js";
import { z } from "zod";
const salesStatuses = ["Quotation", "Packing", "Dispatch", "History"];
const purchaseStatuses = ["Quotations Received", "Unpaid", "Paid", "Order Completion", "History"];
const getSingleParam = (value, name) => {
    if (typeof value !== "string" || value.length === 0) {
        throw new AppError(`${name} is required`, 400);
    }
    return value;
};
const orderLineSchema = z.object({
    product_code: z.string().min(1, "product_code is required"),
    quantity: z.number().int().positive("quantity must be greater than 0"),
    unit_price: z.number().min(0, "unit_price must be non-negative").optional(),
});
const createOrderSchema = z.object({
    type: z.enum(["sale", "purchase"]),
    products: z.array(orderLineSchema).min(1, "products must contain at least one line"),
    status: z.string().min(1).optional(),
    notes: z.string().nullable().optional(),
    customer_id: z.string().min(1).nullable().optional(),
    supplier_id: z.string().min(1).nullable().optional(),
}).superRefine((value, ctx) => {
    if (value.type === "sale" && !value.customer_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "customer_id is required for sale orders", path: ["customer_id"] });
    }
    if (value.type === "purchase" && !value.supplier_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "supplier_id is required for purchase orders", path: ["supplier_id"] });
    }
    if (value.status) {
        const validStatuses = value.type === "sale" ? salesStatuses : purchaseStatuses;
        if (!validStatuses.includes(value.status)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `invalid status for ${value.type} order`, path: ["status"] });
        }
    }
});
const updateOrderSchema = z.object({
    type: z.enum(["sale", "purchase"]).optional(),
    products: z.array(orderLineSchema).min(1).optional(),
    status: z.string().min(1).optional(),
    notes: z.string().nullable().optional(),
    customer_id: z.string().min(1).nullable().optional(),
    supplier_id: z.string().min(1).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided for update",
});
const updateStatusSchema = z.object({
    status: z.string().min(1, "status is required"),
});
export const createOrderHandler = async (req, res, next) => {
    try {
        const payload = createOrderSchema.parse(req.body);
        const order = await createOrder(payload);
        // Orders affect the order views directly and also feed dashboard/history summaries.
        publishLiveEvent({
            action: "created",
            entity: "order",
            channels: ["orders", "dashboard", "history"],
            id: order.order_id,
        });
        res.status(201).json(order);
    }
    catch (error) {
        next(error);
    }
};
export const updateOrderStatusHandler = async (req, res, next) => {
    try {
        const order_id = getSingleParam(req.params.order_id, "order_id");
        const { status } = updateStatusSchema.parse(req.body);
        const updatedOrder = await updateStatus(order_id, status);
        // Status transitions can change stock, history, and dashboard metrics in one move.
        publishLiveEvent({
            action: "status-updated",
            entity: "order",
            channels: ["orders", "products", "dashboard", "history"],
            id: updatedOrder.order_id,
        });
        res.json(updatedOrder);
    }
    catch (error) {
        next(error);
    }
};
export const getAllOrdersHandler = async (req, res, next) => {
    try {
        const type = typeof req.query.type === "string" ? req.query.type.toLowerCase() : undefined;
        if (type && !["sale", "purchase"].includes(type)) {
            throw new AppError("type query must be either 'sale' or 'purchase'", 400);
        }
        const orders = await prisma.order.findMany({
            ...(type ? { where: { type } } : {}),
            include: {
                customer: true,
                supplier: true
            },
            orderBy: {
                date: "desc"
            }
        });
        res.json(orders);
    }
    catch (error) {
        next(error);
    }
};
export const getOrderByIdHandler = async (req, res, next) => {
    try {
        const order_id = req.params.order_id;
        if (typeof order_id !== "string" || order_id.length === 0) {
            throw new AppError("order_id is required", 400);
        }
        const order = await prisma.order.findUnique({
            where: { order_id },
            include: {
                customer: true,
                supplier: true
            }
        });
        if (!order) {
            res.status(404).json({ error: "Order not found" });
            return;
        }
        res.json(order);
    }
    catch (error) {
        next(error);
    }
};
export const updateOrderHandler = async (req, res, next) => {
    try {
        const order_id = getSingleParam(req.params.order_id, "order_id");
        const { products, status, notes, customer_id, supplier_id } = updateOrderSchema.parse(req.body);
        const existingOrder = await prisma.order.findUnique({
            where: { order_id },
        });
        if (!existingOrder) {
            throw new AppError("Order not found", 404);
        }
        const validStatuses = existingOrder.type === "sale" ? salesStatuses : purchaseStatuses;
        if (status !== undefined && !validStatuses.includes(status)) {
            throw new AppError(`Invalid status for ${existingOrder.type} order`, 400);
        }
        const updatedOrder = await prisma.order.update({
            where: { order_id },
            data: {
                ...(products !== undefined ? { products } : {}),
                ...(status !== undefined ? { status } : {}),
                ...(notes !== undefined ? { notes } : {}),
                ...(customer_id !== undefined ? { customer_id } : {}),
                ...(supplier_id !== undefined ? { supplier_id } : {}),
            },
            include: {
                customer: true,
                supplier: true,
            }
        });
        // Plain order edits still need to refresh downstream operational views.
        publishLiveEvent({
            action: "updated",
            entity: "order",
            channels: ["orders", "dashboard", "history"],
            id: updatedOrder.order_id,
        });
        res.json(updatedOrder);
    }
    catch (error) {
        next(error);
    }
};
export const deleteOrderHandler = async (req, res, next) => {
    try {
        const order_id = getSingleParam(req.params.order_id, "order_id");
        const existingOrder = await prisma.order.findUnique({
            where: { order_id },
        });
        if (!existingOrder) {
            throw new AppError("Order not found", 404);
        }
        await prisma.order.delete({
            where: { order_id },
        });
        // Broadcast after the delete succeeds so clients can safely refetch.
        publishLiveEvent({
            action: "deleted",
            entity: "order",
            channels: ["orders", "dashboard", "history"],
            id: order_id,
        });
        res.json({ message: "Order deleted successfully" });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=orderController.js.map