"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { prisma } from "@mockmate/db"
import { auth } from "@/auth"

// Server-side input caps (PRD §6). Resume and JD are each limited to 6,000 chars
// to control token cost; the title is a short user-facing label.
const MAX_INPUT_CHARS = 6000
const MAX_TITLE_CHARS = 120

const newInterviewSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Add a role or company so you can find this session later.")
    .max(MAX_TITLE_CHARS, `Title must be ${MAX_TITLE_CHARS} characters or fewer.`),
  resume: z
    .string()
    .trim()
    .min(1, "Paste your resume to give the interviewer context.")
    .max(
      MAX_INPUT_CHARS,
      `Resume must be ${MAX_INPUT_CHARS.toLocaleString("en-US")} characters or fewer.`,
    ),
  jobDescription: z
    .string()
    .trim()
    .min(1, "Paste the job description you're targeting.")
    .max(
      MAX_INPUT_CHARS,
      `Job description must be ${MAX_INPUT_CHARS.toLocaleString("en-US")} characters or fewer.`,
    ),
})

export type NewInterviewInput = z.infer<typeof newInterviewSchema>

type ActionResult = { success: false; error: string }

export async function createInterviewSession(
  input: NewInterviewInput,
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "You need to be signed in to start an interview." }
  }

  const parsed = newInterviewSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  let interview
  try {
    interview = await prisma.interviewSession.create({
      data: {
        userId: session.user.id,
        title: parsed.data.title,
        resume: parsed.data.resume,
        jobDescription: parsed.data.jobDescription,
        // status defaults to IN_PROGRESS in the schema
      },
      select: { id: true },
    })
  } catch {
    return {
      success: false,
      error: "Couldn't start the interview. Please try again.",
    }
  }

  // redirect throws internally, so it must run outside the try/catch above.
  redirect(`/interview/${interview.id}`)
}
