# ADR-003: Save Every Session Exchange to the Database Immediately

**Date:** 2026-06-02  
**Status:** Accepted

---

## Context

During an active interview session, the user submits answers and receives AI responses across 5 main questions with up to 2 follow-ups each. The question is where this data lives while the session is in progress.

Interview sessions take 15–20 minutes. Interruptions — tab closes, browser crashes, lost connections, accidental navigation — are not edge cases, they are eventual certainties. The persistence strategy determines whether the session is recoverable and whether downstream features like session resume, error recovery, and abandoned session cleanup are possible at all.

---

## Options Considered

- **Client state only (React useState/useReducer)** — zero DB writes during session, fast. Tab close or browser crash means total data loss, no resume possible. Ruled out.
- **LocalStorage** — survives tab closes on the same device. Not queryable, not cross-device, not reliable across browser sessions. Cannot support a resume banner or server-side cleanup. Ruled out.
- **Periodic background saves (e.g., every 60 seconds)** — reduces the data loss window but does not eliminate it. Introduces a state reconciliation problem: on resume, client state and the last DB snapshot may differ. Adds complexity without removing the fundamental fragility.
- **Save on session end only** — one DB write, clean, simple. Makes session resume impossible by definition. Rules out all error-recovery flows. Ruled out.
- **Save every exchange immediately** — each user answer is written to the DB before the LLM call. Each AI response is written to the DB after it completes. The session is always current in the database. Enables resume, error recovery, and cleanup.

---

## Decision

Save every exchange to the database immediately and sequentially:

1. User submits answer → answer written to DB
2. LLM processes → AI response written to DB
3. Evaluation note appended to session's `evaluation_log`

DB writes happen in the background and do not block the user from seeing the streaming AI response. The user's answer is persisted before the LLM call, meaning it is never lost even if the AI call subsequently fails.

---

## Consequences

**Positive**
- Session is always recoverable — the DB is the source of truth at every point in time
- Resume-from-where-you-left-off is possible: dashboard checks for `IN_PROGRESS` sessions on login
- AI failure recovery works cleanly: the answer is already saved, so the retry flow just re-sends to the LLM
- Abandoned session cleanup (Vercel cron) can operate reliably because session state is fully server-side
- Exchange-level PostHog events can be emitted at write time, giving granular analytics

**Negative / trade-offs**
- More DB writes per session compared to save-on-end: approximately 10–15 writes per completed session
- Requires careful ordering — the answer must be written before the LLM call, not after, to guarantee it is preserved on failure
- Session resume adds UI state to manage: the dashboard must check for `IN_PROGRESS` sessions and the interview screen must hydrate from DB state rather than initialising empty
