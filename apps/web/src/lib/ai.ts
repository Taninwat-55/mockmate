import { google } from "@ai-sdk/google"

// Single entry point for the LLM. Every call goes through the Vercel AI SDK
// (`streamText` / `generateObject` from `ai`) using the model exported here —
// never the Gemini SDK directly (see docs/decisions/002-vercel-ai-sdk-abstraction.md).
// Swapping providers later is a one-line change: import a different `@ai-sdk/*`
// package and update the model id below. `@ai-sdk/google` reads
// GOOGLE_GENERATIVE_AI_API_KEY from the environment.
export const interviewModel = google("gemini-2.5-flash")
