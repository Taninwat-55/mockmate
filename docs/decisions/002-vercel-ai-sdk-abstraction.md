# ADR-002: Vercel AI SDK as the LLM Abstraction Layer

**Date:** 2026-06-02  
**Status:** Accepted

---

## Context

Having chosen Google Gemini Flash as the MVP LLM provider (see ADR-001), the next decision is how to call it from the application code. The choice of integration pattern determines how difficult it will be to swap providers in the future, how streaming is handled in the UI, and how much boilerplate we write for every AI interaction.

The constraint: the provider choice should be a config value, not a hard dependency woven through the codebase.

---

## Options Considered

- **Google Gemini SDK directly (`@google/generative-ai`)** — straightforward, no extra layer. But provider-specific code spreads across every file that calls the LLM. Swapping providers later requires touching every call site.
- **LangChain** — the most widely-known AI abstraction library. Supports many providers, includes chains, agents, and memory primitives. Ruled out: too heavy for this use case, opinionated API that has broken across versions, unnecessary complexity for straightforward completions and structured outputs.
- **Custom wrapper** — write a consistent interface and wrap each provider SDK behind it. Technically sound but means writing and maintaining infrastructure instead of product.
- **Vercel AI SDK** — lightweight, built specifically for Next.js and streaming AI responses. Provider packages (`@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic`) expose identical interfaces. The `streamText`, `generateObject`, and `useChat` primitives work the same regardless of which provider is underneath.

---

## Decision

Use **Vercel AI SDK** as the single interface for all LLM calls. The application code imports from `ai` and `@ai-sdk/google` — never from the provider's own SDK directly.

Switching providers in the future requires changing one import and one model string. No business logic changes.

---

## Consequences

**Positive**
- Provider abstraction is enforced by the architecture, not by convention
- `useChat` hook handles streaming, loading states, and error handling in the frontend out of the box
- `generateObject` with a Zod schema produces validated structured JSON from the LLM — ideal for the grading matrix output
- Streaming works natively with React's server component model on Next.js App Router
- If Gemini Flash quality proves insufficient, migrating to GPT-5x or Claude is a one-line change

**Negative / trade-offs**
- Vercel AI SDK is primarily built and maintained by Vercel — there is implicit vendor alignment, though the SDK itself is open-source and works outside Vercel's hosting
- The SDK's abstraction means some provider-specific features (e.g., Gemini's multimodal file input) require dropping down to the provider SDK directly, which creates inconsistency if used
- One more dependency to keep updated; breaking changes in the SDK would affect all AI calls simultaneously
