import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Single source of truth for env lives in the web app (.env.local).
// Prisma CLI commands run from this package, so we load that file
// explicitly rather than duplicating the DATABASE_URL secret here.
const here = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(here, '../../apps/web/.env.local') })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})
