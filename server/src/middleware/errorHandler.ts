//middleware catches all errors in the pipeline to prevent server from crashing

import type { Request, Response, NextFunction } from 'express';//imports the necessary Type Definitions from the Express library since using TypeScript
import { ZodError } from "zod";

// Define the interface as Property 'status' does not exist on type 'Error'
interface AppError extends Error {
    status?: number;
}

export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack); //prints the Stack Trace

    if (err instanceof ZodError) {
        const firstIssue = err.issues[0];
        res.status(400).json({
            success: false,
            error: firstIssue?.message ?? "Validation failed"
        });
        return;
    }

    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({
        success: false,
        error: message
    });
};
