import { google } from "@ai-sdk/google"

// Per-session model tiering (#16 / docs/monetization.md). Free sessions run
// entirely on 2.5 Flash. Paid (credit) sessions upgrade the live flow to the
// faster 3.5 Flash and the grading to the higher-reasoning 2.5 Pro. Selection is
// driven by InterviewSession.isPaid — never a global switch. Every call still
// goes through the Vercel AI SDK (ADR-002), so swapping a provider stays a
// one-line change here.

const FREE_CHAT = google("gemini-2.5-flash")
const PRO_CHAT = google("gemini-3.5-flash")
const FREE_GRADING = google("gemini-2.5-flash")
const PRO_GRADING = google("gemini-2.5-pro")

// Live interview flow — streaming chat + the inline weak-answer judge.
// Latency-sensitive, so paid uses 3.5 Flash (faster than Pro, sharper than 2.5).
export function chatModel(isPaid: boolean) {
  return isPaid ? PRO_CHAT : FREE_CHAT
}

// Assessment — hidden per-question eval notes + the final grading matrix. Off the
// critical path and where quality is most visible, so paid uses 2.5 Pro.
export function gradingModel(isPaid: boolean) {
  return isPaid ? PRO_GRADING : FREE_GRADING
}

// Output limits for one call (#48). Gemini "thinks" before it answers, and those
// hidden tokens count against `maxOutputTokens` — a bare cap lets thinking eat the
// whole budget and truncate the answer. So every call bounds thinking explicitly
// and gets a cap of thinking headroom + the tokens its answer needs: the answer
// always fits, and spend per call stays capped (#42).
// - "light": latency-sensitive calls (chat, judge, per-question note)
// - "deep":  the end-of-session grading matrix, where quality shows most
const THINKING = {
  light: { budget: 512, level: "low", headroom: 1024 },
  deep: { budget: 2048, level: "medium", headroom: 4096 },
} as const

export function outputLimits(
  model: ReturnType<typeof google>,
  answerTokens: number,
  depth: keyof typeof THINKING = "light",
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
