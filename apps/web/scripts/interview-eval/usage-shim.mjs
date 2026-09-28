// Stands in for "@/lib/ai" during an eval run (see boot.mjs). Re-exports the real
// tier map and outputLimits unchanged; the only addition is a middleware that logs
// tokens, latency and finish reason per call, keyed to the running session.
import { AsyncLocalStorage } from "node:async_hooks"
import { wrapLanguageModel } from "ai"
import * as real from "../../src/lib/ai.ts"

export const session = new AsyncLocalStorage()

const tokens = (v) => (typeof v === "number" ? v : (v?.total ?? 0))

function withUsageLog(model) {
  return wrapLanguageModel({
    model,
    middleware: {
      wrapGenerate: async ({ doGenerate }) => {
        const store = session.getStore()
        const started = Date.now()
        const result = await doGenerate()
        const fr = result.finishReason
        store.calls.push({
          kind: store.kind,
          model: model.modelId,
          ms: Date.now() - started,
          inputTokens: tokens(result.usage?.inputTokens),
          // Includes thinking tokens, which Gemini bills as output.
          outputTokens: tokens(result.usage?.outputTokens),
          finishReason: typeof fr === "string" ? fr : (fr?.unified ?? String(fr)),
        })
        return result
      },
    },
  })
}

const cache = new Map()
function logged(model) {
  if (!cache.has(model)) cache.set(model, withUsageLog(model))
  return cache.get(model)
}

export const chatModel = (tier) => logged(real.chatModel(tier))
export const gradingModel = (tier) => logged(real.gradingModel(tier))
export const noteDepth = real.noteDepth
export const outputLimits = real.outputLimits
