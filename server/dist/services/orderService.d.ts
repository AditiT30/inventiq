type OrderProduct = {
    product_code: string;
    quantity: number;
    unit_price?: number | undefined;
};
type CreateOrderInput = {
    type: string;
    products: OrderProduct[];
    status?: string | undefined;
    notes?: string | null | undefined;
    customer_id?: string | null | undefined;
    supplier_id?: string | null | undefined;
};
export declare const createOrder: (data: CreateOrderInput) => Promise<{
    products: import("@prisma/client/runtime/library").JsonValue;
    order_id: string;
    type: string;
    status: string;
    date: Date;
    notes: string | null;
    customer_id: string | null;
    supplier_id: string | null;
}>;
export declare const updateStatus: (order_id: string, newStatus: string) => Promise<{
    products: import("@prisma/client/runtime/library").JsonValue;
    order_id: string;
    type: string;
    status: string;
    date: Date;
    notes: string | null;
    customer_id: string | null;
    supplier_id: string | null;
}>;
export {};
//# sourceMappingURL=orderService.d.ts.map