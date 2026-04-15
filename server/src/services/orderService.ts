import { prisma } from "../lib/db.js";
import { AppError } from "../errors/AppError.js";
import { addStock, deductStock } from "./inventoryService.js";

const SALES_STATUSES = ["Quotation", "Packing", "Dispatch", "History"] as const;
const PURCHASE_STATUSES = ["Quotations Received", "Unpaid", "Paid", "Order Completion", "History"] as const;
const SALES_TRANSITIONS: Record<(typeof SALES_STATUSES)[number], (typeof SALES_STATUSES)[number] | null> = {
    Quotation: "Packing",
    Packing: "Dispatch",
    Dispatch: "History",
    History: null,
};
const PURCHASE_TRANSITIONS: Record<(typeof PURCHASE_STATUSES)[number], (typeof PURCHASE_STATUSES)[number] | null> = {
    "Quotations Received": "Unpaid",
    Unpaid: "Paid",
    Paid: "Order Completion",
    "Order Completion": "History",
    History: null,
};

type OrderProduct = {
    product_code: string;
    quantity: number;
    unit_price?: number | undefined;
};

type CreateOrderInput = {
    type: string;
    products: OrderProduct[];
    status?: string | undefined;
    notes?: string | null | undefined;
    customer_id?: string | null | undefined;
    supplier_id?: string | null | undefined;
};

const ORDER_PREFIX: Record<"sale" | "purchase", string> = {
    sale: "SO",
    purchase: "PO",
};

const ORDER_PADDING: Record<"sale" | "purchase", number> = {
    sale: 4,
    purchase: 4,
};

const isValidStatusForType = (type: "sale" | "purchase", status: string) =>
    type === "sale"
        ? SALES_STATUSES.includes(status as (typeof SALES_STATUSES)[number])
        : PURCHASE_STATUSES.includes(status as (typeof PURCHASE_STATUSES)[number]);

const getDefaultStatus = (type: "sale" | "purchase") =>
    type === "sale" ? "Quotation" : "Quotations Received";

const buildNextOrderId = async (type: "sale" | "purchase") => {
    const prefix = ORDER_PREFIX[type];
    const latestOrder = await prisma.order.findFirst({
        where: {
            type,
            order_id: {
                startsWith: `${prefix}-`,
            },
        },
        orderBy: {
            order_id: "desc",
        },
        select: {
            order_id: true,
        },
    });

    const currentSequence = latestOrder?.order_id.match(new RegExp(`^${prefix}-(\\d+)$`));
    const nextSequence = currentSequence ? Number(currentSequence[1]) + 1 : type === "sale" ? 1000 : 4000;

    return `${prefix}-${String(nextSequence).padStart(ORDER_PADDING[type], "0")}`;
};

export const createOrder = async (data: CreateOrderInput) => {
    if (!data.type || !["sale", "purchase"].includes(data.type)) {
        throw new AppError("type must be either 'sale' or 'purchase'", 400);
    }

    if (!Array.isArray(data.products) || data.products.length === 0) {
        throw new AppError("products must be a non-empty array", 400);
    }

    const type = data.type as "sale" | "purchase";
    const order_id = await buildNextOrderId(type);
    const status = data.status ?? getDefaultStatus(type);

    if (!isValidStatusForType(type, status)) {
        throw new AppError(`Invalid status '${status}' for ${type} order`, 400);
    }

    return prisma.order.create({
        data:{
            order_id,
            type,
            products: data.products,
            status,
            ...(data.notes !== undefined ? { notes: data.notes } : {}),
            ...(data.customer_id !== undefined ? { customer_id: data.customer_id } : {}),
            ...(data.supplier_id !== undefined ? { supplier_id: data.supplier_id } : {}),
        }
    })
}

export const updateStatus = async(order_id: string, newStatus: string)=>{
    /*
    Starts a database transaction (either all DB operations inside it succeed together or everything fails and is rolled back)
    So, Prisma ensures atomicity.
    */
    //tx object behaves like prisma but all queries using tx are part of the SAME transaction
    return prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
            where: {order_id}
        });
        if (!order) {
            throw new AppError(`Order not found: ${order_id}`, 404);
        }

        if (!newStatus) {
            throw new AppError("status is required", 400);
        }

        const products = order.products as OrderProduct[];
        const type = order.type as "sale" | "purchase";

        if (!isValidStatusForType(type, newStatus)) {
            throw new AppError(`Invalid status '${newStatus}' for ${type} order`, 400);
        }

        const nextAllowedStatus =
            type === "sale"
                ? SALES_TRANSITIONS[order.status as (typeof SALES_STATUSES)[number]]
                : PURCHASE_TRANSITIONS[order.status as (typeof PURCHASE_STATUSES)[number]];

        if (nextAllowedStatus !== newStatus) {
            throw new AppError(`Invalid stage transition from '${order.status}' to '${newStatus}'`, 400);
        }

        if(order.type === "sale" && newStatus === "Dispatch") {
            await deductStock(products,`Sale Order ${order_id}`,tx);
        }

        if(order.type==="purchase" && newStatus === "Order Completion") {
            await addStock(products,`Purchase Order ${order_id}`,tx);
        }

        return tx.order.update({
            where: {order_id},
            data: { status: newStatus }
        });
    });
};
