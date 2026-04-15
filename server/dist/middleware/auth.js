//acts as the "Gatekeeper" for protected routes
//verifies that the person making the request is logged in and using a valid token
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { isSessionActive, refreshSession } from '../lib/sessionStore.js';
export const extractAuthToken = (req, allowQueryToken = false) => {
    // Reuse the same token parsing for normal API requests and SSE stream requests.
    const headerToken = req.headers.authorization?.split(' ')[1];
    if (headerToken) {
        return headerToken;
    }
    if (allowQueryToken && typeof req.query.token === "string" && req.query.token.length > 0) {
        return req.query.token;
    }
    return undefined;
};
export const verifyAuthToken = (token) => jwt.verify(token, process.env.JWT_SECRET);
export const validateAuthenticatedToken = async (token) => {
    const payload = verifyAuthToken(token);
    if (!payload.session_id) {
        throw new Error('Session is missing');
    }
    const active = await isSessionActive(payload.session_id);
    if (!active) {
        throw new Error('Session is inactive');
    }
    await refreshSession(payload.session_id);
    return payload;
};
export const authMiddleware = async (req, res, next) => {
    const token = extractAuthToken(req);
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    try {
        //jwt.verify(token, secretOrPublicKey, [options, callback])
        const payload = await validateAuthenticatedToken(token);
        req.user = payload; //token's data attached to the req object
        next(); //tells Express that the user is authenticated and it's safe to move to the actual route handler
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};
//# sourceMappingURL=auth.js.map