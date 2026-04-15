import { prisma } from "../lib/db.js";
import { addStock, deductStock } from "./inventoryService.js";

type StockItem = {
    product_code: string;
    quantity: number;
};

type StartBatchInput = {
    batch_number: string;
    raw_materials: StockItem[];
    output: StockItem[];
};

//startBatch & completeBatch

export const startBatch = async (data: StartBatchInput) => {
    return prisma.$transaction(
        async (tx) => {
            await deductStock(data.raw_materials,`Manufacturing Batch ${data.batch_number} started`,tx);

            return tx.manufacturing.create({
                data:{
                    ...data,
                    status:"WIP"
                }
            });
        });
};

export const completeBatch = async(batch_number:string) => {
    return prisma.$transaction(async (tx) => {
        const batch = await tx.manufacturing.findUnique({
            where: { batch_number }
        });

        if(!batch) {
            throw new Error(`Batch not found: ${batch_number}`);
        }

        await addStock(
            batch.output as StockItem[],
            `Manufacturing Batch ${batch_number} completed`,
            tx
        );
        return tx.manufacturing.update({
            where: {batch_number},
            data:{
                status:"Completed",
                end_date: new Date()
            }
        });

    });
};
