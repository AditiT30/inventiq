import type { Request, Response, NextFunction } from 'express';
interface AppError extends Error {
    status?: number;
}
export declare const errorHandler: (err: AppError, req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=errorHandler.d.ts.map