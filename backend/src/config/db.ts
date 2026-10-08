import { PrismaClient } from '@prisma/client';

type PrismaGlobal = typeof globalThis & { pelitaPrisma?: PrismaClient };
const prismaGlobal = globalThis as PrismaGlobal;
export const prisma = prismaGlobal.pelitaPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') prismaGlobal.pelitaPrisma = prisma;
