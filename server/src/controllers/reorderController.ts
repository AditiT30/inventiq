import type { Request, Response, NextFunction } from "express";
import { detectLowStock, suggestPurchase } from "../services/reorderService.js";

//detect Low Stock & suggest Purchase

export const detectLowStockHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try{
    const products = await detectLowStock();
    res.json(products);
}
catch (error) {
    next(error);
}
};

export const suggestPurchaseHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
)=> {
    try {
        const suggestions = await suggestPurchase();
        res.json(suggestions);
    }
    catch (error) {
        next(error);
    }
};