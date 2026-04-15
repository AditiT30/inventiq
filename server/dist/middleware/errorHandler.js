//middleware catches all errors in the pipeline to prevent server from crashing
import { ZodError } from "zod";
export const errorHandler = (err, req, res, next) => {
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
//# sourceMappingURL=errorHandler.js.map