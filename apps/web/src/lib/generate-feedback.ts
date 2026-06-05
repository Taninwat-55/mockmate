import { generateObject } from "ai"

import { interviewModel } from "@/lib/ai"
import { feedbackSchema, type GradingFeedback } from "@/types/feedback"
import type { EvaluationNote } from "@/types/interview"

// Focused prompt for the end-of-session grading pass. The model receives only the
// five private evaluation notes — not the full conversation — so it grades from the
// same summarised signals that were captured question-by-question. Candidate content
// therefore appears only as already-abstracted signals, not as raw text that could
// inject instructions.
const GRADING_SYSTEM_PROMPT = `You are a senior engineer writing a structured end-of-session assessment for a technical screening interview. You have your own private evaluation notes from each of the 5 questions.

Produce the grading matrix based solely on those notes. Do not invent information not present in the notes.

Scoring scale: 1 = poor, 2 = fair, 3 = good, 4 = great, 5 = excellent. Be calibrated and honest.

Dimensions:
- Technical Accuracy: correctness, use of terminology, depth of explanation
- Communication Clarity: structure, ability to explain simply, use of examples
- Problem-Solving Approach: problem decomposition, edge-case thinking, clarifying questions

For each dimension: one concrete strength observation, one concrete weakness observation, one actionable improvement tip (each 1–2 sentences).

Overall signal:
- STRONG_HIRE: performed consistently well across all questions
- HIRE: passed but showed clear gaps in one or two areas
- NO_HIRE: struggled on more than two questions or lacked fundamentals

Overall summary: exactly 2 sentences — one on what went well, one on the most important thing to improve.`

export async function generateFeedback(notes: EvaluationNote[]): Promise<GradingFeedback> {
  const notesText = notes
    .map(
      (note, i) =>
        `Question ${i + 1}: ${note.resolution}\nSummary: ${note.summary}\nTechnical signal: ${note.technicalSignal}\nCommunication signal: ${note.communicationSignal}\nProblem-solving signal: ${note.problemSolvingSignal}`,
    )
    .join("\n\n")

  const { object } = await generateObject({
    model: interviewModel,
    schema: feedbackSchema,
    system: GRADING_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Private evaluation notes from the session:\n\n${notesText}`,
      },
    ],
  })

  return object
}
