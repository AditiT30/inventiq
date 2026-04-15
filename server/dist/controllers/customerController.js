import { z } from "zod";
import { AppError } from "../errors/AppError.js";
import { prisma } from "../lib/db.js";
import { publishLiveEvent } from "../lib/liveEvents.js";
const getSingleParam = (value, name) => {
    if (typeof value !== "string" || value.length === 0) {
        throw new AppError(`${name} is required`, 400);
    }
    return value;
};
const customerCreateSchema = z.object({
    customer_id: z.string().min(1, "customer_id is required"),
    name: z.string().min(1, "name is required"),
    contact: z.string().min(1, "contact is required"),
    address: z.string().min(1, "address is required"),
});
const customerUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    contact: z.string().min(1).optional(),
    address: z.string().min(1).optional(),
}).refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided for update",
});
export const getAllCustomersHandler = async (req, res, next) => {
    try {
        const customers = await prisma.customer.findMany({
            orderBy: { name: "asc" },
        });
        res.json(customers);
    }
    catch (error) {
        next(error);
    }
};
export const getCustomerByIdHandler = async (req, res, next) => {
    try {
        const customer_id = getSingleParam(req.params.customer_id, "customer_id");
        const customer = await prisma.customer.findUnique({
            where: { customer_id },
            include: {
                orders: {
                    orderBy: { date: "desc" },
                },
            },
        });
        if (!customer) {
            throw new AppError("Customer not found", 404);
        }
        res.json(customer);
    }
    catch (error) {
        next(error);
    }
};
export const createCustomerHandler = async (req, res, next) => {
    try {
        const { customer_id, name, contact, address } = customerCreateSchema.parse(req.body);
        const customer = await prisma.customer.create({
            data: { customer_id, name, contact, address },
        });
        // Order forms subscribe to customer changes for auto-fill and reference freshness.
        publishLiveEvent({
            action: "created",
            entity: "customer",
            channels: ["customers", "orders"],
            id: customer.customer_id,
        });
        res.status(201).json(customer);
    }
    catch (error) {
        next(error);
    }
};
export const updateCustomerHandler = async (req, res, next) => {
    try {
        const customer_id = getSingleParam(req.params.customer_id, "customer_id");
        const { name, contact, address } = customerUpdateSchema.parse(req.body);
        const existingCustomer = await prisma.customer.findUnique({
            where: { customer_id },
        });
        if (!existingCustomer) {
            throw new AppError("Customer not found", 404);
        }
        const customer = await prisma.customer.update({
            where: { customer_id },
            data: {
                ...(name !== undefined ? { name } : {}),
                ...(contact !== undefined ? { contact } : {}),
                ...(address !== undefined ? { address } : {}),
            },
        });
        // Customer edits should refresh both the customer page and sales-side lookup data.
        publishLiveEvent({
            action: "updated",
            entity: "customer",
            channels: ["customers", "orders"],
            id: customer.customer_id,
        });
        res.json(customer);
    }
    catch (error) {
        next(error);
    }
};
export const deleteCustomerHandler = async (req, res, next) => {
    try {
        const customer_id = getSingleParam(req.params.customer_id, "customer_id");
        const existingCustomer = await prisma.customer.findUnique({
            where: { customer_id },
        });
        if (!existingCustomer) {
            throw new AppError("Customer not found", 404);
        }
        await prisma.customer.delete({
            where: { customer_id },
        });
        // Broadcast after delete to avoid clients refreshing against a still-existing row.
        publishLiveEvent({
            action: "deleted",
            entity: "customer",
            channels: ["customers", "orders"],
            id: customer_id,
        });
        res.json({ message: "Customer deleted successfully" });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=customerController.js.map