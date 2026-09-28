// Interview eval harness (#63). Plays scripted candidates through the real
// interview loop, prompts and helpers, and writes one JSON result per session.
//
//   pnpm --filter web eval:interview [tiers] [scenarios] [repeats]
//   e.g. pnpm --filter web eval:interview FREE,PAID all 2
//
// Loads run.mjs through jiti (load.mjs) with "@/lib/ai" swapped for the
// usage-logging shim. Makes real Gemini calls (GOOGLE_GENERATIVE_AI_API_KEY from
// .env.local); never touches the database.
import { createLoader, here } from "./load.mjs"

await createLoader({ shimAi: true }).import(`${here}run.mjs`)
