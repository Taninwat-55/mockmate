# Product Requirements Document

**Project:** MockMate  
**Author:** Taninwat Kaewpankan (Ice)  
**Phase:** 1 — MVP Specification  
**Last Updated:** 2026-05-27  
**Status:** Draft

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

**Resume + JD Upload**  
Users paste or upload their resume (PDF or plain text) and paste the job description they are targeting. These two inputs become the AI's context for the entire session.

**Interactive Chat Session**  
A multi-turn chat interface where the AI acts as a technical interviewer. The AI uses the JD and resume to ask relevant questions, follow up on answers, and challenge vague or incomplete responses. Sessions are bounded (e.g., 5–8 questions) to keep the experience focused.

**Single AI Interviewer Persona**  
One well-tuned persona for MVP: a senior engineer conducting a technical screening round. Grounded, direct, and realistic. A second persona (e.g., behavioral/HR focus) is deferred to Phase 2 once we validate the core loop.

**Structured Grading Matrix**  
An assessment screen generated at session end. Grades the user across three dimensions: technical accuracy, communication clarity, and problem-solving approach. Includes a mock "Hire / No Hire" signal and specific written notes on where the user was strong or broke down.

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
| Stripe billing | Deferred until the core lifecycle works flawlessly |
| Job description library / presets | Nice to have, not essential to the core loop |
| Team or group workspaces | Enterprise feature, irrelevant at MVP scale |
| Mobile-native app | Web-first is sufficient for target persona |

---

## 6. Core User Journey

This single journey covers the entire application lifecycle for Phase 1.

```
[Landing Page]
    ↓
[Google Login]
    ↓
[Dashboard]
  — Upload resume (PDF or paste text)
  — Paste job description
  — Click "Start Interview"
    ↓
[Active Interview Screen]
  — Multi-turn AI chat session
  — AI asks questions, follows up, challenges weak answers
  — User types responses in real time
  — Session ends after 5–8 exchanges or user ends early
    ↓
[Feedback & Score Page]
  — Grading matrix across 3 dimensions
  — Written notes per dimension
  — Hire / No Hire signal
  — Option to save, restart, or return to dashboard
    ↓
[Dashboard]
  — Session saved to history
  — Start a new session
```

---

## 7. Open Questions

These need to be resolved before or during development:

- Which LLM provider for MVP? (Claude API, OpenAI GPT-4o, or Gemini — affects cost and quality)
- What is the session token budget per interview? (Affects free tier sustainability)
- How do we handle resume PDF parsing reliably? (PDF text extraction can be inconsistent)
- What is the exact rubric for the grading matrix? (Needs to be defined before the prompt is written)
