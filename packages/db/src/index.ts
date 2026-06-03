import { PrismaClient } from '@prisma/client'

// Singleton: in dev, Next.js hot-reload would otherwise spawn a new
// PrismaClient on every reload and exhaust the DB connection pool.
// We cache one instance on globalThis and reuse it.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Re-export Prisma's generated types and enums so consumers only ever
// import from '@mockmate/db' — never directly from '@prisma/client'.
export * from '@prisma/client'
