type StockItem = {
    product_code: string;
    quantity: number;
};
type StartBatchInput = {
    batch_number: string;
    raw_materials: StockItem[];
    output: StockItem[];
};
export declare const startBatch: (data: StartBatchInput) => Promise<{
    status: string;
    output: import("@prisma/client/runtime/library").JsonValue;
    batch_number: string;
    raw_materials: import("@prisma/client/runtime/library").JsonValue;
    start_date: Date;
    end_date: Date | null;
}>;
export declare const completeBatch: (batch_number: string) => Promise<{
    status: string;
    output: import("@prisma/client/runtime/library").JsonValue;
    batch_number: string;
    raw_materials: import("@prisma/client/runtime/library").JsonValue;
    start_date: Date;
    end_date: Date | null;
}>;
export {};
//# sourceMappingURL=wipService.d.ts.map