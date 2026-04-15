import { detectLowStock, suggestPurchase } from "../services/reorderService.js";
//detect Low Stock & suggest Purchase
export const detectLowStockHandler = async (req, res, next) => {
    try {
        const products = await detectLowStock();
        res.json(products);
    }
    catch (error) {
        next(error);
    }
};
export const suggestPurchaseHandler = async (req, res, next) => {
    try {
        const suggestions = await suggestPurchase();
        res.json(suggestions);
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=reorderController.js.map