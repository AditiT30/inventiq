import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
type StockItem = {
    product_code: string;
    quantity: number;
};
type PrismaExecutor = Prisma.TransactionClient | typeof prisma;
export declare const deductStock: (items: StockItem[], reason: string, tx?: PrismaExecutor) => Promise<void>;
export declare const addStock: (items: StockItem[], reason: string, tx?: PrismaExecutor) => Promise<void>;
export {};
//# sourceMappingURL=inventoryService.d.ts.map