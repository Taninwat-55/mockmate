# Product Requirements Document

**Project:** MockMate  
**Author:** Taninwat Kaewpankan (Ice)  
**Phase:** 1 — MVP Specification  
**Last Updated:** 2026-06-01  
**Status:** Final

---

## 1. Executive Summary & Problem Statement

Job seekers — especially junior developers and career changers — frequently underperform in technical interviews not because they lack knowledge, but because they lack realistic practice. Reading LeetCode solutions and watching YouTube breakdowns does not simulate being put on the spot. When the pressure is real, most people freeze.

Existing tools don't solve this well. Static question banks have no feedback loop. Human mock interviewers cost money and require scheduling. AI chatbots exist but treat interviews like Q&A sessions — they ask one question, accept any answer, and move on. None of them simulate the actual dynamic: an interviewer who follows up, challenges weak answers, and holds you accountable.

MockMate solves this by combining three things in one flow: a job description the user is actually targeting, their resume as context, and an AI interviewer that conducts a realistic multi-turn session and delivers structured, graded feedback at the end.

---

## 2. Target Persona

**Name:** Alex  
**Age:** 24–28  
**Background:** Junior to mid-level developer. Recently graduated or 1–2 years into their first role. Applying for their next position — something more senior, or at a company they actually want to work at.

**The situation:** Alex has a job posting open in one tab and their resume in another. They've read the JD three times. They think they're qualified. But when they imagine being asked "walk me through how you'd design a URL shortener" out loud, in real time, to a stranger — they go blank.

**What they're doing today instead:** Skimming interview prep lists, re-reading their own resume, maybe watching a YouTube walkthrough. None of it simulates the pressure of a real session. None of it tells them where they actually broke down.

**What success looks like:** Alex walks into the real interview having already been "interrogated" for 20 minutes by an AI that knew the JD, challenged vague answers, and then told them exactly where they were weak and what to fix.

**Secondary note:** This persona is especially relevant for non-native English speakers, who face the additional pressure of communicating technical ideas clearly in a second language. MockMate's text-first format lowers the barrier while still building the skill.

---

## 3. Success Metrics

These are the conditions that define a successful MVP. If we hit these, Phase 1 is done and Phase 2 planning begins.

| Metric | Target | How to measure |
|---|---|---|
| Full session completion | 10 unique users complete a session end-to-end | PostHog event: `session_completed` |
| Return rate | 30% of users return for a second session within 7 days | PostHog retention report |
| Feedback usefulness | Average rating ≥ 4/5 on end-of-session prompt | In-app rating collected post-session |
| Organic reach | 5+ users share or mention MockMate externally | Manual tracking (LinkedIn, Discord, GitHub stars) |

---

## 4. Why This Approach

**Why AI chat instead of flashcard tools or question banks?**  
Because the bottleneck is not knowing the answer — it is performing under pressure. A static list cannot follow up on a weak answer or push back on a vague explanation. An AI interviewer can. The multi-turn conversation is the product.

**Why job description input as the core context?**  
Most interview prep tools are generic. MockMate is not. When the AI knows which role you are targeting, it can ask the questions that actually matter for that position — not a random mix of LeetCode mediums. This is the primary differentiator from existing tools.

**Why text-first for MVP?**  
Audio and video processing add infrastructure cost, latency, and complexity. Text-first lets us ship on the $0 free tier, validate the core loop, and reach a broader audience — including non-native speakers who benefit from being able to read and compose answers carefully. Audio is a Phase 2 feature, not a Phase 1 requirement.

---

## 5. Scope & MVP Features

### In Scope — Phase 1

**Resume + JD Input**  
Users paste their resume as plain text and paste the job description they are targeting. Both inputs are saved to the database and become the AI's context for the entire session. PDF upload is deferred to Phase 2.

**Interactive Chat Session**  
A multi-turn chat interface where the AI acts as a technical interviewer. The AI uses the JD and resume to generate relevant questions, follow up on answers, and challenge vague or incomplete responses. Full AI behavior rules are defined in Section 6.

**Single AI Interviewer Persona**  
One well-tuned persona for MVP: a senior engineer conducting a technical screening round. Grounded, direct, and realistic. A second persona (e.g., behavioral/HR focus) is deferred to Phase 2 once we validate the core loop.

**Structured Grading Matrix**  
An assessment screen generated at session end. Grades the user across three dimensions, each scored 1–5:

| Dimension | What it measures |
|---|---|
| Technical Accuracy | Correctness, use of right terminology, depth of explanation |
| Communication Clarity | Structure, ability to explain concepts simply, use of examples |
| Problem-solving Approach | How the user breaks down the problem, edge case thinking, clarifying questions |

Each dimension includes one written strength observation, one weakness observation, and one actionable improvement tip. The overall output includes a **Hire / No Hire / Strong Hire** signal with a 2-sentence summary. The AI returns this as structured JSON so the frontend renders it predictably.

**Core Authentication**  
Google login via NextAuth. Users need an account to save and revisit past sessions.

**Session History**  
Users can view their past sessions and feedback from their dashboard. No comparison or analytics — just access to the record.

---

### Out of Scope — Deferred to Phase 2

| Feature | Reason deferred |
|---|---|
| Live audio/voice input | Adds cost and complexity; validates after text loop is proven |
| Multiple AI interviewer personas | One excellent persona beats two mediocre ones |
| PDF resume upload | Plain text textarea validates the core loop first |
| Stripe billing | Deferred until the core lifecycle works flawlessly |
| Job description library / presets | Nice to have, not essential to the core loop |
| Team or group workspaces | Enterprise feature, irrelevant at MVP scale |
| Mobile-native app | Web-first is sufficient for target persona |

---

## 6. AI Interviewer Behavior Rules

These rules define exactly how the AI behaves during a session. They are the basis for the system prompt and must be precise enough to implement directly.

**Session structure**  
Every session consists of exactly 5 main questions. The AI selects questions based on the JD and resume — it does not use a static list. Once `main_question_count` reaches 5, the AI ends the interview and triggers the grading flow regardless of how the last answer was scored.

**Follow-up rules**  
The AI may follow up on a main question a maximum of 2 times before moving on.

- Follow-up 1 is triggered when the answer is vague, too short (under 40 words), or fails to mention any technical concept relevant to the question. The follow-up challenges: "Can you be more specific?" or "What was your reasoning there?"
- Follow-up 2 is triggered if follow-up 1 also produces a weak answer. This follow-up may include a light nudge or hint to avoid complete deadlock: "Think about how the system would behave under load — does that change your answer?"
- If the answer is still weak after 2 follow-ups, the AI logs the question as **unresolved** and moves to the next main question. It does not follow up a third time.
- Follow-up exchanges do not increment `main_question_count`.

**Evaluation logging**  
After each main question (including its follow-ups), the AI appends a hidden evaluation note to the session's `evaluation_log`. This note records whether the question was answered fully, partially, or left unresolved. The grading matrix is generated from this log at the end of the session — not re-evaluated from scratch.

**Prompt injection resilience**  
User input is always passed as a `user` message, never injected into the system prompt. The system prompt containing the interviewer persona and rules is immutable and separated from user content. This partitioning makes the AI resilient to prompt injection attempts without additional filtering logic.

**Input length limit**  
User answers are capped at 2,000 characters server-side before being sent to the LLM. Resume and JD inputs are each capped at 6,000 characters. Inputs exceeding these limits are rejected with a 400 error and a clear message to the user. This controls token cost and prevents abuse.

**Session end triggers**  
A session ends under three conditions:
1. `main_question_count` reaches 5 (normal completion)
2. The user clicks "End Interview Early" (early completion — triggers grading from whatever was logged)
3. The session has been inactive for 24 hours (system marks it `ABANDONED` via a scheduled Vercel cron job)

---

## 7. Error States

These are first-class requirements, not edge cases. Each must be handled before the feature is considered complete.

**AI call failure (429 rate limit or 5xx server error)**  
The user's answer is saved to the database before the LLM call is made. If the call fails, the backend retries with exponential backoff: 1 second, then 2 seconds, then 4 seconds. After 3 failed attempts, the API returns a structured error payload. The frontend displays a non-destructive toast: "We're experiencing high traffic. Your progress is saved — click Retry to continue." The chat input remains enabled. The session is not terminated.

**Client-side timeout**  
If the AI response has not begun streaming within 5 seconds of the request being sent, the UI shows a loading timeout state and offers a Retry button. Progress is not lost.

**Mid-session tab close or connection loss**  
Because every exchange is saved to the database immediately after submission, the session persists as `IN_PROGRESS`. On next login, the dashboard checks for any `IN_PROGRESS` session and displays a resume banner: "You have an unfinished interview. Click here to continue." The user resumes from where they left off.

**Session abandonment**  
A Vercel cron job runs daily and sets any `IN_PROGRESS` session with a `last_active_at` timestamp older than 24 hours to `ABANDONED`. Abandoned sessions appear in history as incomplete, with whatever feedback could be generated from the logged exchanges.

---

## 8. Non-Functional Requirements

| Requirement | Target | Notes |
|---|---|---|
| AI first token latency | ≤ 3 seconds | Time from user submitting answer to first token appearing on screen |
| Response rendering | Streaming, not spinner | Vercel AI SDK streams tokens as they arrive; user sees words appearing in real time |
| Database write latency | ≤ 500ms | Exchange saved in background; user is not blocked waiting for DB confirmation |
| Input validation | Server-side, before LLM call | Character limits enforced in the API route, not just the frontend |
| Session token budget | ~5,000 tokens per session | System prompt (~600) + resume (~600) + JD (~400) + exchanges (~2,400) + grading (~800) |
| Free tier sustainability | ≤ 300 sessions/day | Well within Gemini Flash free tier ceiling (1,500 requests/day) |
| Authentication | Required for all session data | Unauthenticated users cannot start or view sessions |

---

## 9. Core User Journey

This single journey covers the entire application lifecycle for Phase 1.

```
[Landing Page]
    ↓
[Google Login]
    ↓
[Dashboard]
  — Paste resume (plain text)
  — Paste job description
  — Click "Start Interview"
    ↓
[Active Interview Screen]
  — AI asks 5 main questions based on JD + resume
  — AI may follow up max 2 times per question
  — Every exchange saved to DB immediately
  — User can click "End Early" at any time
    ↓
[Feedback & Score Page]
  — Grading matrix: 3 dimensions, scored 1–5
  — Written notes per dimension (strength, weakness, tip)
  — Hire / No Hire / Strong Hire signal
  — 2-sentence overall summary
  — Option to restart or return to dashboard
    ↓
[Dashboard]
  — Session saved to history
  — Resume banner shown if a session is IN_PROGRESS
```

---

## 10. Resolved Decisions

| Question | Decision | Reasoning |
|---|---|---|
| Which LLM provider? | **Google Gemini Flash** | Most generous free tier (1,500 req/day), good quality for structured tasks, first-class Vercel AI SDK support via `@ai-sdk/google`. Provider abstraction via Vercel AI SDK means swapping to Claude or OpenAI later is a one-line change. |
| Session token budget? | **~5,000 tokens per session** | Breakdown: system prompt (~600) + resume (~600) + JD (~400) + 6 interview exchanges (~2,400) + grading output (~800). At Gemini Flash free tier this supports 300+ sessions/day — well above MVP needs. |
| Resume input? | **Plain text textarea for MVP** | Removes parsing complexity entirely. Users paste resume text. PDF upload via Gemini Files API deferred to Phase 2 when S3 file storage is added. |
| Grading matrix rubric? | **3 dimensions, scored 1–5** | Technical Accuracy, Communication Clarity, Problem-solving Approach. Each dimension returns a score, one strength observation, one weakness observation, and one actionable tip. Overall output includes a Hire / No Hire / Strong Hire signal. AI returns structured JSON. |
| Session end condition? | **Exactly 5 main questions** | Removes ambiguity. Follow-ups don't count toward the limit. User can also end early. |
| Abandoned session threshold? | **24 hours of inactivity** | Balances UX (user might return same day) against data hygiene. Cleanup runs via Vercel cron, not Lambda. |
