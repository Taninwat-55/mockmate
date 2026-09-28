import { generateObject } from "ai"
import type { ModelTier, OverallSignal } from "@mockmate/db"

import { gradingModel, outputLimits } from "@/lib/ai"
import { buildCandidateProfile } from "@/lib/interview-context"
import { MAX_MAIN_QUESTIONS, MIN_QUESTIONS_FOR_VERDICT } from "@/lib/interview-engine"
import { feedbackSchema, type GradingFeedback } from "@/types/feedback"
import type { EvaluationNote, InterviewContext } from "@/types/interview"

// Focused prompt for the end-of-session grading pass. The model receives only the
// private evaluation notes — not the full conversation — so it grades from the
// same summarised signals that were captured question-by-question. Candidate content
// therefore appears only as already-abstracted signals, not as raw text that could
// inject instructions. How many questions the notes cover is stated in the user
// message: after an early exit there are fewer than MAX_MAIN_QUESTIONS.
const GRADING_SYSTEM_PROMPT = `You are an experienced hiring manager writing a structured end-of-session assessment for a job interview for the role described in the interview block. You have your own private evaluation notes, one per main question answered. The message says how many questions they cover.

Produce the grading matrix based solely on those notes. Do not invent information not present in the notes, and judge only what the notes show — fewer questions means less evidence, not a better score.

Scoring scale, against the candidate's level as given in the calibration line:
- 1 poor: missing the basics for this role
- 2 fair: mostly generic or vague; little that was concrete
- 3 good: solid and relevant, with some concrete examples, but clear gaps
- 4 great: consistently concrete — specific situations, their own actions and results — with only minor gaps
- 5 excellent: exceptional for this level, with strong concrete evidence across several questions. Rare.
A polished, fluent answer without a concrete example, actions or outcome is a 2 or 3, not a 4 or 5. If the notes record a real weakness in a dimension, that dimension scores at most 3. When unsure between two scores, pick the lower one.

Dimensions:
- Role Knowledge: understanding of the job, relevant skills and correct practice for this role (technical depth only if the role is technical)
- Communication Clarity: structure, ability to explain simply, use of examples, and getting to the point — rambling or off-topic detours keep this at 3 or below even when the content is good
- Problem-Solving Approach: breaking a situation down, thinking ahead about what could go wrong, asking the right questions

For each dimension: one concrete strength observation, one concrete weakness observation, one actionable improvement tip (each 1–2 sentences).

The candidate reads this report. Write every strength, weakness, tip and the summary to them directly as "you" ("You gave a concrete example…"). Never refer to them as he, she, they or "the candidate", and never guess their gender from their name.

Overall signal:
- STRONG_HIRE: strong, concrete answers on nearly every question and no real weakness in any dimension. Rare.
- HIRE: a solid candidate with clear gaps in one or two areas
- NO_HIRE: struggled on several questions, stayed generic throughout, or lacked the basics for this role

Overall summary: exactly 2 sentences — one on what went well, one on the most important thing to improve.`

// The grading pass's result, with the verdict possibly overridden by `finalSignal`.
export type FeedbackResult = Omit<GradingFeedback, "overallSignal"> & {
  overallSignal: OverallSignal
}

// Deterministic guards on the model's verdict (#63). The model proved too generous
// (Strong Hire after 2 AI-written answers), so the rules that matter most are code:
// - fewer than MIN_QUESTIONS_FOR_VERDICT answered questions → no verdict at all
// - STRONG_HIRE needs every score 4+, nothing unresolved and at most one partial
export function finalSignal(
  grade: GradingFeedback,
  notes: EvaluationNote[],
): OverallSignal {
  if (notes.length < MIN_QUESTIONS_FOR_VERDICT) return "INCOMPLETE"
  if (grade.overallSignal !== "STRONG_HIRE") return grade.overallSignal
  const minScore = Math.min(
    grade.roleKnowledgeScore,
    grade.communicationClarityScore,
    grade.problemSolvingScore,
  )
  const unresolved = notes.some((n) => n.resolution === "UNRESOLVED")
  const partial = notes.filter((n) => n.resolution === "PARTIAL").length
  return minScore >= 4 && !unresolved && partial <= 1 ? "STRONG_HIRE" : "HIRE"
}

export async function generateFeedback(
  notes: EvaluationNote[],
  context: InterviewContext,
  tier: ModelTier,
): Promise<FeedbackResult> {
  const notesText = notes
    .map(
      (note, i) =>
        `Question ${i + 1}: ${note.resolution}\nSummary: ${note.summary}\nRole knowledge signal: ${note.roleSignal}\nCommunication signal: ${note.communicationSignal}\nProblem-solving signal: ${note.problemSolvingSignal}`,
    )
    .join("\n\n")
  const coverage =
    notes.length < MAX_MAIN_QUESTIONS
      ? `These notes cover ${notes.length} of ${MAX_MAIN_QUESTIONS} main questions: the candidate ended the interview early. Grade only what the notes show, and say in the summary that it is based on ${notes.length} of ${MAX_MAIN_QUESTIONS} questions.`
      : `These notes cover all ${MAX_MAIN_QUESTIONS} main questions.`

  const model = gradingModel(tier)
  const { object } = await generateObject({
    model,
    schema: feedbackSchema,
    system: GRADING_SYSTEM_PROMPT,
    maxRetries: 2,
    ...outputLimits(model, 2000, "deep"),
    messages: [
      {
        role: "user",
        content: `Interview:\n${buildCandidateProfile(context)}\n\n${coverage}\n\nPrivate evaluation notes from the session:\n\n${notesText}`,
      },
    ],
  })

  return { ...object, overallSignal: finalSignal(object, notes) }
}
