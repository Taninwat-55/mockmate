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
