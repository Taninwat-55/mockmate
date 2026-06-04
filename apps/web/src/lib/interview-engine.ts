import { QuestionStatus } from "@mockmate/db"

import type { AnswerAssessment, InterviewAction } from "@/types/interview"

// ============================================================
// Interview behavior rules (PRD §6), as pure functions
// ============================================================
// These encode the counting, follow-up, and unresolved logic so it lives in one
// reviewable, side-effect-free place. No Prisma queries, no LLM calls, no I/O — the
// caller (the chat route in #4) feeds in counts and the LLM's verdict and acts on the
// result. The interviewer-prompt interpolates these same constants so the prose rules
// and this state machine never drift apart.

// Exactly 5 main questions per session; follow-ups never count toward this.
export const MAX_MAIN_QUESTIONS = 5
// At most 2 follow-ups on any single main question before moving on.
export const MAX_FOLLOWUPS = 2
// An answer under 40 words is treated as too short (a follow-up trigger).
export const MIN_ANSWER_WORDS = 40
// Per-answer server-side cap, enforced before the LLM call (PRD §6). Defined here as
// the single source of truth; #4's chat route enforces it on incoming answers.
export const MAX_ANSWER_CHARS = 2000

// Count words by runs of non-whitespace. Empty / whitespace-only input is 0.
export function countWords(text: string): number {
  const matches = text.trim().match(/\S+/g)
  return matches ? matches.length : 0
}

export function isAnswerTooShort(text: string): boolean {
  return countWords(text) < MIN_ANSWER_WORDS
}

// Combine the deterministic length check with the LLM's semantic verdict (vague, or
// no relevant technical concept — PRD §6) into a single assessment. An answer is weak
// if it is too short OR the model judged it weak.
export function assessAnswer(
  text: string,
  llmJudgedWeak: boolean,
): AnswerAssessment {
  const wordCount = countWords(text)
  const tooShort = wordCount < MIN_ANSWER_WORDS
  return { wordCount, tooShort, isWeak: tooShort || llmJudgedWeak }
}

// True once 5 main questions have been asked — the session ends and grading runs.
export function isSessionComplete(mainQuestionCount: number): boolean {
  return mainQuestionCount >= MAX_MAIN_QUESTIONS
}

// The canonical status for a main question once it is finished: UNRESOLVED if the
// answer was still weak after both follow-ups were used, otherwise RESOLVED.
export function resolveQuestionStatus({
  answerIsWeak,
  followupCount,
}: {
  answerIsWeak: boolean
  followupCount: number
}): QuestionStatus {
  return answerIsWeak && followupCount >= MAX_FOLLOWUPS
    ? QuestionStatus.UNRESOLVED
    : QuestionStatus.RESOLVED
}

// Decide the interviewer's next move after the candidate answers the current main
// question. `mainQuestionCount` is how many main questions have been asked (current
// one included); `followupCount` is how many follow-ups this question has already had.
//
//   ASK_FOLLOWUP    weak answer and a follow-up is still available
//   END_SESSION     the question is finished and it was the 5th (resolved or not)
//   MARK_UNRESOLVED finished unresolved (weak after 2 follow-ups), more questions left
//   NEXT_QUESTION   finished and accepted, more questions left
//
// For the END_SESSION case, use `resolveQuestionStatus` to persist the final status.
export function determineNextAction({
  mainQuestionCount,
  followupCount,
  answerIsWeak,
}: {
  mainQuestionCount: number
  followupCount: number
  answerIsWeak: boolean
}): InterviewAction {
  // Still room to push on a weak answer.
  if (answerIsWeak && followupCount < MAX_FOLLOWUPS) {
    return "ASK_FOLLOWUP"
  }

  // The current main question is finished — answered, or out of follow-ups.
  if (isSessionComplete(mainQuestionCount)) {
    return "END_SESSION"
  }

  // More questions remain; flag whether this one was left unresolved.
  const unresolved =
    resolveQuestionStatus({ answerIsWeak, followupCount }) ===
    QuestionStatus.UNRESOLVED
  return unresolved ? "MARK_UNRESOLVED" : "NEXT_QUESTION"
}
