import { randomUUID } from "node:crypto";
import { redis } from "./redis.js";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const ACTIVE_SESSION_SET = "inventiq:active_sessions";
const MAX_CONCURRENT_USERS = 5;
const getExpiryScore = () => Date.now() + SESSION_TTL_SECONDS * 1000;
export const cleanupExpiredSessions = async () => {
    await redis.zremrangebyscore(ACTIVE_SESSION_SET, 0, Date.now());
};
export const createSession = async () => {
    await cleanupExpiredSessions();
    const activeCount = await redis.zcard(ACTIVE_SESSION_SET);
    if (activeCount >= MAX_CONCURRENT_USERS) {
        return null;
    }
    const sessionId = randomUUID();
    await redis.zadd(ACTIVE_SESSION_SET, getExpiryScore(), sessionId);
    return sessionId;
};
export const isSessionActive = async (sessionId) => {
    await cleanupExpiredSessions();
    const score = await redis.zscore(ACTIVE_SESSION_SET, sessionId);
    if (!score) {
        return false;
    }
    return Number(score) > Date.now();
};
export const refreshSession = async (sessionId) => {
    const exists = await isSessionActive(sessionId);
    if (!exists) {
        return false;
    }
    await redis.zadd(ACTIVE_SESSION_SET, getExpiryScore(), sessionId);
    return true;
};
export const releaseSession = async (sessionId) => {
    await redis.zrem(ACTIVE_SESSION_SET, sessionId);
};
export const getActiveSessionCount = async () => {
    await cleanupExpiredSessions();
    return redis.zcard(ACTIVE_SESSION_SET);
};
//# sourceMappingURL=sessionStore.js.map