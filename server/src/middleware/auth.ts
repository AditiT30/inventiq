//acts as the "Gatekeeper" for protected routes
//verifies that the person making the request is logged in and using a valid token

import {type Request, type Response, type NextFunction, Router} from 'express';
import jwt from 'jsonwebtoken';

export const authMiddleware = (req: Request, res: Response, next: NextFunction)=>{
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    try {
        //jwt.verify(token, secretOrPublicKey, [options, callback])
        const payload = jwt.verify(token, process.env.JWT_SECRET!);
        (req as any).user = payload; //token's data attached to the req object
        next(); //tells Express that the user is authenticated and it's safe to move to the actual route handler
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};