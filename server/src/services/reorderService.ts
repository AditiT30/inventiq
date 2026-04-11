import {prisma} from "../lib/db.js";

const LOW_STOCK_THRESHOLD = 5;

export const detectLowStock = async ()=> {
    return prisma.product.findMany({
        where: {
            quantity: {
                lte: LOW_STOCK_THRESHOLD, //lte = less than or equal to
            }
        },
        orderBy:{ //resulting quantities in asc order
            quantity: "asc"
        }
    });
};

export const suggestPurchase = async ()=> {
    const lowStock = await detectLowStock();
    return lowStock.map((product) => ({
        product_code: product.product_code,
        name: product.name,
        current: product.quantity,
        suggested_order: LOW_STOCK_THRESHOLD * 5
    }));
};