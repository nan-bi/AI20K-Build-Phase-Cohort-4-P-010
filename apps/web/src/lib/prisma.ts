import { PrismaClient } from "@prisma/client";

// Standard Next.js singleton pattern: avoids exhausting the Postgres
// connection pool from a new PrismaClient being created on every hot reload
// in development.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
