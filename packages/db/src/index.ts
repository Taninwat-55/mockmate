import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

// Singleton: in dev, Next.js hot-reload would otherwise spawn a new
// PrismaClient on every reload and exhaust the DB connection pool.
// We cache one instance on globalThis and reuse it.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Prisma 7 driver adapter. The schema datasource has no `url` (it lives in
// prisma.config.ts for CLI commands), so the runtime client connects through the
// Neon serverless driver, reading DATABASE_URL from the environment — keeping
// .env.local the single source of truth.
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Re-export Prisma's generated types and enums so consumers only ever
// import from '@mockmate/db' — never directly from '@prisma/client'.
export * from '@prisma/client'
