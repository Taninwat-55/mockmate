# ADR-001: LLM Provider — Google Gemini Flash

**Date:** 2026-06-02  
**Status:** Accepted

---

## Context

MockMate requires an LLM for two core tasks: generating interview questions from a job description and resume, and producing a structured grading matrix at the end of each session. Both tasks require reliable structured JSON output and consistent reasoning quality.

The project operates on a $0 budget during MVP. Any provider requiring payment from the first API request is a blocker at this stage.

The secondary constraint is maintainability: hardcoding a specific provider's SDK throughout the codebase means any future cost or quality change requires widespread refactoring.

---

## Options Considered

- **OpenAI GPT-5x** — industry-standard quality, excellent structured output, first-class Vercel AI SDK support. Ruled out: no free tier, paid from first request.
- **Anthropic Claude API** — strong reasoning, reliable JSON output. Ruled out: no free tier, same cost problem as OpenAI.
- **Groq** — free tier, extremely fast inference. Ruled out: open-source models are less consistent on nuanced evaluation tasks; grading structured JSON reliably was considered too risky for the session feedback feature.
- **Google Gemini Flash** — solid quality for structured tasks, most generous free tier of any major provider (1,500 requests/day, 1M tokens/minute), first-class support in Vercel AI SDK via `@ai-sdk/google`.

---

## Decision

Use **Google Gemini Flash** as the LLM provider for MVP, accessed exclusively through the **Vercel AI SDK** (`@ai-sdk/google`) rather than the Gemini SDK directly.

The provider is a free-tier choice. The abstraction layer is an architecture choice. Both matter.

---

## Consequences

**Positive**
- Zero API cost during MVP and validation phase
- 1,500 requests/day free tier supports 300+ full sessions/day — well above any realistic MVP load
- Provider is fully swappable by changing one import and one model string; no business logic changes required
- Vercel AI SDK's streaming primitives work identically across providers — streaming responses work out of the box

**Negative / trade-offs**
- Gemini Flash is less well-known than GPT-5x; if the project is ever demoed live, some audiences may not recognize the model name
- Free tier has rate limits that could throttle under unexpected traffic spikes — acceptable for MVP, must be revisited before any production launch
- Gemini's structured JSON output (function calling) behaves slightly differently from OpenAI's — prompt tuning is required and may not transfer directly if the provider is swapped later
