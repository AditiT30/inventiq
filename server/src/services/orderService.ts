import { prisma } from "../lib/db.js";
import { addStock, deductStock } from "./inventoryService.js";

// Flow:-
// Sale: Quotation -> Dispatched -> Completed
// Purchase: Quotation -> Completed

type OrderProduct = {
    product_code: string;
    quantity: number;
};

type CreateOrderInput = {
    type: string;
    products: OrderProduct[];
    status?: string;
    notes?: string;
    customer_id?: string;
    supplier_id?: string;
};

export const createOrder = async (data: CreateOrderInput) => {
    return prisma.order.create({
        data:{
            ...data,
            status:data.status ?? "Quotation"
        }
    })
}

export const updateStatus = async(order_id: string, newStatus: string)=>{
    /*
    Starts a database transaction (either all DB operations inside it succeed together or everything fails and is rolled back)
    So, Prisma ensures atomicity.
    */
    //tx object behaves like prisma but all queries using tx are part of the SAME transaction
    return prisma.$transaction(
        async (tx) => {
        const order = await tx.order.findUnique({
            where: {order_id}
        });
        if (!order) {
            throw new Error(`Order not found: ${order_id}`);
        }
        const products = order.products as OrderProduct[];

        if(order.type === "sale" && newStatus === "Dispatched") {
            await deductStock(products,`Sale Order ${order_id}`,tx);
        };

        if(order.type==="purchase" && newStatus === "Completed") {
            await addStock(products,`Purchase Order ${order_id}`,tx);
        }
        return tx.order.update({
            where: {order_id},
            data: { status: newStatus }
        })
    };
};