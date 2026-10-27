import { QuestionStatus, type Stage } from "@mockmate/db"

import type { AnswerAssessment, InterviewAction } from "@/types/interview"

// ============================================================
// Interview behavior rules (PRD §6), as pure functions
// ============================================================
// These encode the counting, follow-up, and unresolved logic so it lives in one
// reviewable, side-effect-free place. No Prisma queries, no LLM calls, no I/O — the
// caller (the chat route in #4) feeds in counts and the LLM's verdict and acts on the
// result. The interviewer-prompt interpolates these same constants so the prose rules
// and this state machine never drift apart.

// Exactly 5 main questions in a single-round (free) session; follow-ups never count
// toward this. Multi-round loops set their own per-round counts (STAGE_PLANS).
export const MAX_MAIN_QUESTIONS = 5
// At most 2 follow-ups on any single main question before moving on.
export const MAX_FOLLOWUPS = 2
// An answer under 40 words is treated as too short (a follow-up trigger).
export const MIN_ANSWER_WORDS = 40
// Per-answer server-side cap, enforced before the LLM call (PRD §6). Defined here as
// the single source of truth; #4's chat route enforces it on incoming answers.
export const MAX_ANSWER_CHARS = 2000

// Fewer answered main questions than this and the grade gets no hiring verdict
// (OverallSignal.INCOMPLETE) — two answers are not enough to judge (#63).
export const MIN_QUESTIONS_FOR_VERDICT = 3

// Count words by runs of non-whitespace. Empty / whitespace-only input is 0.
export function countWords(text: string): number {
  const matches = text.trim().match(/\S+/g)
  return matches ? matches.length : 0
}

export function isAnswerTooShort(text: string): boolean {
  return countWords(text) < MIN_ANSWER_WORDS
}

// Combine the deterministic length check with the LLM's semantic verdict (vague, or
// no role-relevant substance — PRD §6) into a single assessment. An answer is weak
// if it is too short OR the model judged it weak.
export function assessAnswer(
  text: string,
  llmJudgedWeak: boolean,
  minWords: number = MIN_ANSWER_WORDS,
): AnswerAssessment {
  const wordCount = countWords(text)
  const tooShort = wordCount < minWords
  return { wordCount, tooShort, isWeak: tooShort || llmJudgedWeak }
}

// ============================================================
// Rounds (#46)
// ============================================================
// A session's plan is the ordered list of its rounds (InterviewSession.stages),
// fixed at creation. A single round is today's interview: 5 hiring-manager
// questions. The full loop splits its questions across three rounds.
const SINGLE_ROUND_QUESTIONS = MAX_MAIN_QUESTIONS
const LOOP_ROUND_QUESTIONS: Record<Stage, number> = {
  SCREENING: 3,
  HIRING_MANAGER: 4,
  ASSESSMENT: 3,
  FINAL: 2,
}

export const STAGE_PLANS = {
  SINGLE: ["HIRING_MANAGER"],
  LOOP: ["SCREENING", "HIRING_MANAGER", "ASSESSMENT", "FINAL"],
} as const satisfies Record<string, readonly Stage[]>

// How many main questions a round has within its plan.
export function questionsInRound(stages: readonly Stage[], stage: Stage): number {
  return stages.length === 1 ? SINGLE_ROUND_QUESTIONS : LOOP_ROUND_QUESTIONS[stage]
}

// Total main questions in a plan: 5 for a single round, 12 for the loop.
export function plannedQuestions(stages: readonly Stage[]): number {
  return stages.reduce((sum, stage) => sum + questionsInRound(stages, stage), 0)
}

// Where the interview is: the current round (the round of the latest question, or
// the first round before any question exists) and the position inside it.
export type StageProgress = {
  stage: Stage
  round: number // 1-based
  rounds: number
  question: number // main questions asked in this round, current one included
  questions: number // main questions this round has
  isLastStage: boolean
}

export function stageProgress(
  stages: readonly Stage[],
  questions: readonly { stage: Stage }[],
): StageProgress {
  const stage = questions.at(-1)?.stage ?? stages[0]
  const index = stages.indexOf(stage)
  return {
    stage,
    round: index + 1,
    rounds: stages.length,
    question: questions.filter((q) => q.stage === stage).length,
    questions: questionsInRound(stages, stage),
    isLastStage: index === stages.length - 1,
  }
}

// The "too short" floor for an answer in this round (#73). Screening answers to
// practical questions ("I can start on 1 March") are short but fine, and final-round
// answers are often the candidate's own questions. A single round keeps 40.
export function minAnswerWords(progress: Pick<StageProgress, "stage" | "rounds">): number {
  if (progress.rounds === 1) return MIN_ANSWER_WORDS
  if (progress.stage === "SCREENING") return 15
  if (progress.stage === "FINAL") return 20
  return MIN_ANSWER_WORDS
}

// What the progress indicator shows once the interviewer's reply to `action` is out:
// a new main question moves it on; a follow-up or a closing leaves it where it is.
export function progressAfter(progress: StageProgress, action: InterviewAction): StageProgress {
  return action === "NEXT_QUESTION" || action === "MARK_UNRESOLVED"
    ? { ...progress, question: progress.question + 1 }
    : progress
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
// question. `progress` says where the interview is; `followupCount` is how many
// follow-ups this question has already had.
//
//   ASK_FOLLOWUP    weak answer and a follow-up is still available
//   END_STAGE       the question is finished, it was the round's last, more rounds follow
//   END_SESSION     the question is finished and it was the last of the last round
//   MARK_UNRESOLVED finished unresolved (weak after 2 follow-ups), more questions left
//   NEXT_QUESTION   finished and accepted, more questions left
//
// For END_STAGE / END_SESSION, use `resolveQuestionStatus` to persist the final status.
export function determineNextAction({
  progress,
  followupCount,
  answerIsWeak,
}: {
  progress: Pick<StageProgress, "question" | "questions" | "isLastStage">
  followupCount: number
  answerIsWeak: boolean
}): InterviewAction {
  // Still room to push on a weak answer.
  if (answerIsWeak && followupCount < MAX_FOLLOWUPS) {
    return "ASK_FOLLOWUP"
  }

  // The current main question is finished — answered, or out of follow-ups.
  if (progress.question >= progress.questions) {
    return progress.isLastStage ? "END_SESSION" : "END_STAGE"
  }

  // More questions remain; flag whether this one was left unresolved.
  const unresolved =
    resolveQuestionStatus({ answerIsWeak, followupCount }) ===
    QuestionStatus.UNRESOLVED
  return unresolved ? "MARK_UNRESOLVED" : "NEXT_QUESTION"
}
