import { AppError } from "../errors/AppError.js";
import { prisma } from "../lib/db.js";
import { publishLiveEvent } from "../lib/liveEvents.js";
import { completeBatch, startBatch } from "../services/wipService.js";
import { z } from "zod";
const getSingleParam = (value, name) => {
    if (typeof value !== "string" || value.length === 0) {
        throw new AppError(`${name} is required`, 400);
    }
    return value;
};
const stockItemSchema = z.object({
    product_code: z.string().min(1, "product_code is required"),
    quantity: z.number().int().positive("quantity must be greater than 0"),
});
const startBatchSchema = z.object({
    batch_number: z.string().min(1, "batch_number is required"),
    raw_materials: z.array(stockItemSchema).min(1, "raw_materials must contain at least one item"),
    output: z.array(stockItemSchema).min(1, "output must contain at least one item"),
});
const updateBatchSchema = z.object({
    raw_materials: z.array(stockItemSchema).min(1).optional(),
    output: z.array(stockItemSchema).min(1).optional(),
    status: z.string().min(1).optional(),
    end_date: z.string().nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided for update",
});
export const startBatchHandler = async (req, res, next) => {
    try {
        const payload = startBatchSchema.parse(req.body);
        const batch = await startBatch(payload);
        // Batch creation affects manufacturing, dashboard, history, and sometimes product stock.
        publishLiveEvent({
            action: "created",
            entity: "batch",
            channels: ["batches", "products", "dashboard", "history"],
            id: batch.batch_number,
        });
        res.status(201).json(batch);
    }
    catch (error) {
        next(error);
    }
};
export const completeBatchHandler = async (req, res, next) => {
    try {
        const batch_number = getSingleParam(req.params.batch_number, "batch_number");
        const batch = await completeBatch(batch_number);
        // Completion can add finished stock, so products are refreshed too.
        publishLiveEvent({
            action: "completed",
            entity: "batch",
            channels: ["batches", "products", "dashboard", "history"],
            id: batch.batch_number,
        });
        res.json(batch);
    }
    catch (error) {
        next(error);
    }
};
export const updateBatchHandler = async (req, res, next) => {
    try {
        const batch_number = getSingleParam(req.params.batch_number, "batch_number");
        const { raw_materials, output, status, end_date } = updateBatchSchema.parse(req.body);
        const existingBatch = await prisma.manufacturing.findUnique({
            where: { batch_number }
        });
        if (!existingBatch) {
            throw new AppError("Batch not found", 404);
        }
        const updatedBatch = await prisma.manufacturing.update({
            where: { batch_number },
            data: {
                ...(raw_materials !== undefined ? { raw_materials } : {}),
                ...(output !== undefined ? { output } : {}),
                ...(status !== undefined ? { status } : {}),
                ...(end_date !== undefined ? { end_date: end_date ? new Date(end_date) : null } : {}),
            }
        });
        // Manual batch edits still feed live manufacturing and reporting surfaces.
        publishLiveEvent({
            action: "updated",
            entity: "batch",
            channels: ["batches", "dashboard", "history"],
            id: updatedBatch.batch_number,
        });
        res.json(updatedBatch);
    }
    catch (error) {
        next(error);
    }
};
export const deleteBatchHandler = async (req, res, next) => {
    try {
        const batch_number = getSingleParam(req.params.batch_number, "batch_number");
        const existingBatch = await prisma.manufacturing.findUnique({
            where: { batch_number }
        });
        if (!existingBatch) {
            throw new AppError("Batch not found", 404);
        }
        await prisma.manufacturing.delete({
            where: { batch_number }
        });
        // Send the delete event only once the batch is actually gone.
        publishLiveEvent({
            action: "deleted",
            entity: "batch",
            channels: ["batches", "dashboard", "history"],
            id: batch_number,
        });
        res.json({ message: "Batch deleted successfully" });
    }
    catch (error) {
        next(error);
    }
};
export const getAllBatchesHandler = async (req, res, next) => {
    try {
        const batches = await prisma.manufacturing.findMany({
            orderBy: {
                start_date: "desc"
            }
        });
        res.json(batches);
    }
    catch (error) {
        next(error);
    }
};
export const getBatchByHandler = async (req, res, next) => {
    try {
        const batch_number = getSingleParam(req.params.batch_number, "batch_number");
        const batch = await prisma.manufacturing.findUnique({
            where: { batch_number }
        });
        if (!batch) {
            res.status(404).json({ error: "No batch found" });
            return;
        }
        res.json(batch);
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=manufacturingController.js.map