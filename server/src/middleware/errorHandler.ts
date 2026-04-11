//middleware catches all errors in the pipeline to prevent server from crashing

import type { Request, Response, NextFunction } from 'express';//imports the necessary Type Definitions from the Express library since using TypeScript

// Define the interface as Property 'status' does not exist on type 'Error'
interface AppError extends Error {
    status?: number;
}

export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack); //prints the Stack Trace
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({
        success: false,
        error: message
    });
};