import { generateObject } from "ai"

import { gradingModel, outputLimits } from "@/lib/ai"
import { buildCandidateProfile } from "@/lib/interview-context"
import { feedbackSchema, type GradingFeedback } from "@/types/feedback"
import type { EvaluationNote, InterviewContext } from "@/types/interview"

// Focused prompt for the end-of-session grading pass. The model receives only the
// five private evaluation notes — not the full conversation — so it grades from the
// same summarised signals that were captured question-by-question. Candidate content
// therefore appears only as already-abstracted signals, not as raw text that could
// inject instructions.
const GRADING_SYSTEM_PROMPT = `You are an experienced hiring manager writing a structured end-of-session assessment for a job interview for the role described in the interview block. You have your own private evaluation notes from each of the 5 questions.

Produce the grading matrix based solely on those notes. Do not invent information not present in the notes.

Scoring scale: 1 = poor, 2 = fair, 3 = good, 4 = great, 5 = excellent. Be calibrated and honest, and score against the candidate's level as given in the calibration line.

Dimensions:
- Role Knowledge: understanding of the job, relevant skills and correct practice for this role (technical depth only if the role is technical)
- Communication Clarity: structure, ability to explain simply, use of examples
- Problem-Solving Approach: breaking a situation down, thinking ahead about what could go wrong, asking the right questions

For each dimension: one concrete strength observation, one concrete weakness observation, one actionable improvement tip (each 1–2 sentences).

Overall signal:
- STRONG_HIRE: performed consistently well across all questions
- HIRE: passed but showed clear gaps in one or two areas
- NO_HIRE: struggled on more than two questions or lacked the basics for this role

Overall summary: exactly 2 sentences — one on what went well, one on the most important thing to improve.`

export async function generateFeedback(
  notes: EvaluationNote[],
  context: InterviewContext,
  isPaid: boolean,
): Promise<GradingFeedback> {
  const notesText = notes
    .map(
      (note, i) =>
        `Question ${i + 1}: ${note.resolution}\nSummary: ${note.summary}\nRole knowledge signal: ${note.roleSignal}\nCommunication signal: ${note.communicationSignal}\nProblem-solving signal: ${note.problemSolvingSignal}`,
    )
    .join("\n\n")

  const model = gradingModel(isPaid)
  const { object } = await generateObject({
    model,
    schema: feedbackSchema,
    system: GRADING_SYSTEM_PROMPT,
    maxRetries: 2,
    ...outputLimits(model, 2000, "deep"),
    messages: [
      {
        role: "user",
        content: `Interview:\n${buildCandidateProfile(context)}\n\nPrivate evaluation notes from the session:\n\n${notesText}`,
      },
    ],
  })

  return object
}
