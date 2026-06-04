import { z } from "zod"

// ============================================================
// Hidden evaluation note (PRD §6 — "Evaluation logging")
// ============================================================
// After each main question the AI produces a private note. The grading matrix at
// session end is built from these notes — not by re-reading the transcript
// (see CLAUDE.md, "Grading uses evaluationNote fields"). The three signal fields map
// to the grading dimensions in PRD §5 so the final matrix can be assembled directly.
// This is the schema passed to `generateObject` and validated before persistence.
export const evaluationNoteSchema = z.object({
  // How fully the candidate resolved the question across its follow-ups.
  resolution: z.enum(["FULL", "PARTIAL", "UNRESOLVED"]),
  // One or two private sentences summarising how the question went.
  summary: z.string().min(1),
  // Per-dimension observations (PRD §5 grading rubric). Kept short; private.
  technicalSignal: z.string().min(1),
  communicationSignal: z.string().min(1),
  problemSolvingSignal: z.string().min(1),
})

export type EvaluationNote = z.infer<typeof evaluationNoteSchema>

// ============================================================
// Interview state machine (PRD §6 — counting / follow-up / unresolved)
// ============================================================
// The decision returned by `determineNextAction` after the AI judges an answer.
// - ASK_FOLLOWUP    weak answer, follow-ups still available
// - MARK_UNRESOLVED weak answer after 2 follow-ups — log unresolved, then move on
// - NEXT_QUESTION   answer accepted (or unresolved), more main questions remain
// - END_SESSION     this was the 5th main question — end and trigger grading
export type InterviewAction =
  | "ASK_FOLLOWUP"
  | "MARK_UNRESOLVED"
  | "NEXT_QUESTION"
  | "END_SESSION"

// Result of assessing a single answer. `tooShort` is deterministic (word count);
// `isWeak` combines `tooShort` with the LLM's semantic judgment (vague / no relevant
// technical concept, PRD §6).
export type AnswerAssessment = {
  wordCount: number
  tooShort: boolean
  isWeak: boolean
}

// A single prior turn in the conversation, used to assemble the message array.
// Only AI ("assistant") and candidate ("user") turns exist; the system prompt is
// added separately and is never part of history.
export type InterviewTurn = {
  role: "assistant" | "user"
  content: string
}
