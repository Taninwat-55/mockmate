import { generateObject } from "ai"
import { z } from "zod"
import type { ModelTier, Stage, StageVerdict } from "@mockmate/db"

import { gradingModel, outputLimits } from "@/lib/ai"
import { buildCandidateProfile } from "@/lib/interview-context"
import { STAGE_LABELS, type EvaluationNote, type InterviewContext } from "@/types/interview"

// Fewer notes than this and a round gets no verdict (StageVerdict.INCOMPLETE).
export const MIN_NOTES_FOR_ROUND_VERDICT = 2

// The soft gate after a round of a multi-round loop (#73): would a real company
// invite this candidate to the next round? Judged from this round's private notes
// only, like the final grade. The candidate reads the summary, so it is written to
// "you". The user can always continue, whatever the verdict.
const STAGE_RESULT_SYSTEM_PROMPT = `You decide whether a candidate moves on from one round of a multi-round job interview to the next, for the role described in the interview block. You have your private evaluation notes from this round only.

- ADVANCE: they did well enough in this round, at their level, that a real company would invite them to the next round.
- STOP: a real company would likely end the process here.

Judge against the candidate's level as given in the calibration line. Be honest, not generous: generic answers without concrete examples, actions or results are not enough to ADVANCE. Do not invent anything the notes don't show.

Summary: exactly 2 sentences, written to the candidate as "you" — the main reason for the decision, then the one thing to do better in the next round. Never refer to them as he, she, they or "the candidate".`

const stageResultSchema = z.object({
  verdict: z.enum(["ADVANCE", "STOP"]),
  summary: z.string().min(1),
})

export type StageResultData = { verdict: StageVerdict; summary: string }

// Model call only when there are enough notes; callers reserve budget for it.
export function needsStageResultModel(notes: EvaluationNote[]): boolean {
  return notes.length >= MIN_NOTES_FOR_ROUND_VERDICT
}

export async function generateStageResult(
  notes: EvaluationNote[],
  context: InterviewContext,
  tier: ModelTier,
  stage: Stage,
): Promise<StageResultData> {
  if (!needsStageResultModel(notes)) {
    return {
      verdict: "INCOMPLETE",
      summary: "There weren't enough answers in this round to judge it. You can still continue to the next round.",
    }
  }

  const notesText = notes
    .map(
      (note, i) =>
        `Question ${i + 1}: ${note.resolution}\nSummary: ${note.summary}\nRole knowledge signal: ${note.roleSignal}\nCommunication signal: ${note.communicationSignal}\nProblem-solving signal: ${note.problemSolvingSignal}`,
    )
    .join("\n\n")

  const model = gradingModel(tier)
  const { object } = await generateObject({
    model,
    schema: stageResultSchema,
    system: STAGE_RESULT_SYSTEM_PROMPT,
    maxRetries: 2,
    ...outputLimits(model, 400),
    messages: [
      {
        role: "user",
        content: `Interview:\n${buildCandidateProfile(context)}\n\nRound: ${STAGE_LABELS[stage]}\n\nPrivate evaluation notes from this round:\n\n${notesText}`,
      },
    ],
  })

  // Code rule over the model: a round where at least half the questions stayed
  // unresolved is not one a company would pass.
  const unresolved = notes.filter((n) => n.resolution === "UNRESOLVED").length
  const verdict = unresolved * 2 >= notes.length ? "STOP" : object.verdict
  return { verdict, summary: object.summary }
}
