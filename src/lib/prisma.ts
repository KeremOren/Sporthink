import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma client.
 * Hem dev (HMR) hem production'da tek instance — gereksiz reconnection önlenir.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    });

globalForPrisma.prisma = prisma;

export default prisma;
