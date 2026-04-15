//"Singleton" instance that prevents server from opening too many connections to Docker PostgreSQL container
import { PrismaClient } from '@prisma/client';
// This prevents multiple instances of Prisma Client in development
const globalForPrisma = global;
export const prisma = globalForPrisma.prisma || new PrismaClient({
    log: ['query'], // Logs SQL to terminal to help with debugging
});
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = prisma;
//# sourceMappingURL=db.js.map