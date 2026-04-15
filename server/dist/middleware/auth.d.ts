import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
type AuthPayload = jwt.JwtPayload & {
    user?: string;
    session_id?: string;
};
export declare const extractAuthToken: (req: Request, allowQueryToken?: boolean) => string | undefined;
export declare const verifyAuthToken: (token: string) => AuthPayload;
export declare const validateAuthenticatedToken: (token: string) => Promise<AuthPayload>;
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export {};
//# sourceMappingURL=auth.d.ts.map