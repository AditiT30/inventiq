/*
create order
update status
fetch order history
*/
import type { Request, Response, NextFunction } from "express";
import { createOrder, updateStatus } from "../services/orderService.js";
import { prisma } from "../lib/db.js";

export const createOrderHandler = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const order = await createOrder(req.body);
        res.status(201).json(order);
    }
    catch(error){
        next(error);
    }
};

export const updateOrderStatusHandler = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const {order_id}= req.params;
        const {status} = req.body;
        if (typeof order_id === "string") {
            const updatedOrder = await updateStatus(order_id, status);
            res.json(updatedOrder);
        }
        res.status(404).json( {error:`check data type for ${order_id}`});
    }
    catch(error){
        next(error);
    }
}

export const getAllOrdersHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orders = await prisma.order.findMany({
            include: {
                customer: true,
                supplier: true
            },
            orderBy: {
                date: "desc"
            }
        });

        res.json(orders);
    } catch (error) {
        next(error);
    }
};

export const getOrderByIdHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { order_id } = req.params;
        let order;
        if(typeof order_id==="string"){

        order = await prisma.order.findUnique({
            where: { order_id },
            include: {
                customer: true,
                supplier: true
            }
        });
        }

        if (!order) {
            res.status(404).json({ error: "Order not found" });
            return;
        }

        res.json(order);
    } catch (error) {
        next(error);
    }
};

