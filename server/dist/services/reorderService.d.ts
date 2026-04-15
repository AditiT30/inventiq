export declare const detectLowStock: () => Promise<{
    product_code: string;
    name: string;
    weight: number;
    price: number;
    quantity: number;
    description: string | null;
    last_updated: Date;
}[]>;
export declare const suggestPurchase: () => Promise<{
    product_code: string;
    name: string;
    current: number;
    suggested_order: number;
}[]>;
//# sourceMappingURL=reorderService.d.ts.map