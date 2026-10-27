// Shared jiti loader for the eval scripts, so the app's TypeScript and "@/..."
// imports resolve. `shimAi` swaps "@/lib/ai" for the usage-logging shim (needed
// only when real model calls are made).
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const here = fileURLToPath(new URL(".", import.meta.url))
const { createJiti } = createRequire(import.meta.url)("jiti")

export function createLoader({ shimAi = false } = {}) {
  return createJiti(import.meta.url, {
    alias: {
      ...(shimAi ? { "@/lib/ai": `${here}usage-shim.mjs` } : {}),
      "@/": fileURLToPath(new URL("../../src/", import.meta.url)),
    },
  })
}

export { here }
