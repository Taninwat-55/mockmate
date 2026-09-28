import { google } from "@ai-sdk/google"
import type { ModelTier } from "@mockmate/db"

// Per-session model tiers (#52 / docs/monetization.md) — the one place that maps a
// tier to models. Every tier runs 3.8 Flash in the live interview: the free
// session is the product demo, and a side-by-side test showed the Flash-Lite
// models lose track of the interview. Paid sessions think deeper on the
// per-question notes; MAX (owner only) grades with 3.1 Pro. The tier is stored on
// InterviewSession.modelTier, never a global switch. Every call still goes
// through the Vercel AI SDK (ADR-002), so swapping a provider stays a change here.

const FLASH = google("gemini-3.8-flash")
const PRO = google("gemini-3.1-pro-preview")

const TIER_MODELS = {
  FREE: { chat: FLASH, grading: FLASH, noteDepth: "light" },
  PAID: { chat: FLASH, grading: FLASH, noteDepth: "deep" },
  MAX: { chat: FLASH, grading: PRO, noteDepth: "deep" },
} as const satisfies Record<
  ModelTier,
  { chat: LanguageModel; grading: LanguageModel; noteDepth: ThinkingDepth }
>

// Live interview flow — streaming chat + the inline weak-answer judge.
export function chatModel(tier: ModelTier) {
  return TIER_MODELS[tier].chat
}

// Assessment — hidden per-question eval notes + the final grading matrix.
export function gradingModel(tier: ModelTier) {
  return TIER_MODELS[tier].grading
}

// Thinking depth for the per-question evaluation note (the grading matrix is
// always "deep").
export function noteDepth(tier: ModelTier): ThinkingDepth {
  return TIER_MODELS[tier].noteDepth
}

// Output limits for one call (#48). Gemini "thinks" before it answers, and those
// hidden tokens count against `maxOutputTokens` — a bare cap lets thinking eat the
// whole budget and truncate the answer. So every call bounds thinking explicitly
// and gets a cap of thinking headroom + the tokens its answer needs: the answer
// always fits, and spend per call stays capped (#42).
// - "light": latency-sensitive calls (chat, judge; the free-tier per-question note)
// - "deep":  the end-of-session grading matrix, where quality shows most
const THINKING = {
  light: { budget: 512, level: "low", headroom: 1024 },
  deep: { budget: 2048, level: "medium", headroom: 4096 },
} as const

type ThinkingDepth = keyof typeof THINKING
type LanguageModel = ReturnType<typeof google>

export function outputLimits(
  model: LanguageModel,
  answerTokens: number,
  depth: ThinkingDepth = "light",
) {
  const { budget, level, headroom } = THINKING[depth]
  // Gemini 3.x takes a thinking level; 2.5 takes a token budget (Pro's minimum is 128).
  const thinkingConfig = model.modelId.startsWith("gemini-3")
    ? { thinkingLevel: level }
    : { thinkingBudget: budget }
  return {
    maxOutputTokens: headroom + answerTokens,
    providerOptions: { google: { thinkingConfig } },
  }
}
