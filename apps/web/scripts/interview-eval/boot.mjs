// Interview eval harness (#63). Plays scripted candidates through the real
// interview loop, prompts and helpers, and writes one JSON result per session.
//
//   pnpm --filter web eval:interview [tiers] [scenarios] [repeats]
//   e.g. pnpm --filter web eval:interview FREE,PAID all 2
//
// Loads run.mjs through jiti so the app's TypeScript and "@/..." imports resolve,
// with "@/lib/ai" swapped for the usage-logging shim. Makes real Gemini calls
// (GOOGLE_GENERATIVE_AI_API_KEY from .env.local); never touches the database.
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const here = fileURLToPath(new URL(".", import.meta.url))
const { createJiti } = createRequire(import.meta.url)("jiti")

const jiti = createJiti(import.meta.url, {
  alias: {
    "@/lib/ai": `${here}usage-shim.mjs`,
    "@/": fileURLToPath(new URL("../../src/", import.meta.url)),
  },
})

await jiti.import(`${here}run.mjs`)
