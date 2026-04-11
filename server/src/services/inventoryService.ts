import { prisma } from "../lib/db.js";
import { AppError } from "../errors/AppError.js"; //Custom error class , to send proper HTTP errors

type StockItem = { //Defines shape of input & Prevents invalid data
    product_code: string
    quantity: number
}

//DEDUCT STOCK
export const deductStock = async (items: StockItem[], reason: string, tx = prisma) => {

    //tx=prisma , tx is prisma instance , lets one function work in both modes  - normal queries & transactional mode

    for (const item of items) {
        //Validate quantity
        if (item.quantity <= 0) {
            throw new AppError(`Invalid quantity for ${item.product_code}`, 400)
        }

        if (!reason) {
            throw new AppError("Reason is required for deducting stock", 400)
        }
        //Fetch product
        const product = await tx.product.findUnique({
            where: { product_code: item.product_code }
        })

        //Check existence
        if (!product) {
            throw new AppError(`Product not found: ${item.product_code}`, 404)
        }

        //Business rule - prevent negative stock
        if (product.quantity < item.quantity) {
            throw new AppError(
                `Insufficient stock: ${item.product_code}`,
                400
            )
        }

        //Update stock
        await tx.product.update({
            where: { product_code: item.product_code },
            data: { // Defines what fields to change
                //Prisma provides atomic operators: increment & decrement
                quantity: { decrement: item.quantity } //Reduce stock by item.quantity
            }
        })

        // Log inventory change
        await tx.inventoryLog.create({
            data: {
                product_code: item.product_code,
                change_type: "DEDUCT",
                change: -item.quantity,
                quantity: item.quantity,
                reason
            }
        })
    }
}

// ADD STOCK
export const addStock = async (items: StockItem[], reason: string, tx = prisma) => {
    //Validate reason
    if (!reason) {
        throw new AppError("Reason is required for adding stock", 400)
    }

    for (const item of items) {
        //Validate quantity
        if (item.quantity <= 0) {
            throw new AppError(`Invalid quantity for ${item.product_code}`, 400)
        }

        // Ensure product exists
        const product = await tx.product.findUnique({
            where: { product_code: item.product_code }
        })
        //Vaildate product
        if (!product) {
            throw new AppError(`Product not found: ${item.product_code}`, 404)
        }

        // Update stock
        await tx.product.update({
            where: { product_code: item.product_code },
            data: {
                quantity: { increment: item.quantity }
            }
        })

        //Log inventory change
        await tx.inventoryLog.create({
            data: {
                product_code: item.product_code,
                change_type: "ADD",
                change: item.quantity,
                quantity: item.quantity,
                reason
            }
        })
    }
}


