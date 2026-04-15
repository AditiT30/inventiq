import type { Response } from "express";
export type LiveChannel = "products" | "orders" | "batches" | "history" | "dashboard" | "customers" | "suppliers";
export type LiveEvent = {
    action: string;
    entity: string;
    channels: LiveChannel[];
    timestamp: string;
    id?: string;
};
export declare const subscribeLiveEvents: (//Called when user connects
res: Response, channels: Iterable<LiveChannel>) => () => void;
export declare const publishLiveEvent: (event: Omit<LiveEvent, "timestamp">) => void;
//# sourceMappingURL=liveEvents.d.ts.map