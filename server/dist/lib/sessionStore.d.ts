export declare const cleanupExpiredSessions: () => Promise<void>;
export declare const createSession: () => Promise<`${string}-${string}-${string}-${string}-${string}` | null>;
export declare const isSessionActive: (sessionId: string) => Promise<boolean>;
export declare const refreshSession: (sessionId: string) => Promise<boolean>;
export declare const releaseSession: (sessionId: string) => Promise<void>;
export declare const getActiveSessionCount: () => Promise<number>;
//# sourceMappingURL=sessionStore.d.ts.map