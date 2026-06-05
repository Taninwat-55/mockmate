import { z } from "zod"

// Zod schema for the structured grading matrix (PRD §5 — "Structured Grading Matrix").
// Passed to `generateObject` so the LLM returns validated JSON matching the Feedback
// Prisma model fields exactly. Three dimensions each carry a 1–5 score plus three
// written observations; the overall signal maps to the OverallSignal enum.
export const feedbackSchema = z.object({
  technicalAccuracyScore: z.number().int().min(1).max(5),
  technicalAccuracyStrength: z.string().min(1),
  technicalAccuracyWeakness: z.string().min(1),
  technicalAccuracyTip: z.string().min(1),

  communicationClarityScore: z.number().int().min(1).max(5),
  communicationClarityStrength: z.string().min(1),
  communicationClarityWeakness: z.string().min(1),
  communicationClarityTip: z.string().min(1),

  problemSolvingScore: z.number().int().min(1).max(5),
  problemSolvingStrength: z.string().min(1),
  problemSolvingWeakness: z.string().min(1),
  problemSolvingTip: z.string().min(1),

  overallSignal: z.enum(["HIRE", "NO_HIRE", "STRONG_HIRE"]),
  overallSummary: z.string().min(1),
})

export type GradingFeedback = z.infer<typeof feedbackSchema>
