import type { EmploymentType, Seniority, WorkSetting } from "@mockmate/db"

import {
  EMPLOYMENT_TYPE_LABELS,
  SENIORITY_LABELS,
  WORK_SETTING_LABELS,
  type InterviewContext,
} from "@/types/interview"

// How the bar moves with the candidate's level (#44). Shared by the interviewer,
// the weak-answer judge, the evaluation note and the grading pass, so a first-timer
// is asked, judged and graded against the same expectations.
const SENIORITY_CALIBRATION: Record<Seniority, string> = {
  STUDENT:
    "The candidate is a student or applying for an internship. Expect little or no work history. Focus on motivation, attitude, willingness to learn, and transferable experience from school, projects, part-time jobs, sports or volunteering. Do not penalise a lack of professional experience.",
  ENTRY:
    "This is likely the candidate's first real job. Expect limited work history. Focus on motivation, reliability, how they handle common situations in this role, and transferable experience from school, part-time jobs or volunteering. Do not penalise a lack of professional experience.",
  JUNIOR:
    "The candidate has around 1–2 years of experience. Expect concrete examples from their work, basic role knowledge, and growing independence. They are not expected to lead or own large decisions.",
  MID_SENIOR:
    "The candidate is experienced. Expect depth in the role, ownership of outcomes, sound judgment, and examples of handling difficult situations or helping others.",
}

// A short, labeled block describing the interview. It is built only from the role
// title and fixed enum labels; the role title is user input, so callers must place
// this in a user message, never in the system prompt (PRD §6 injection defense).
export function buildCandidateProfile(ctx: InterviewContext): string {
  const lines = [
    `Role: ${ctx.role}`,
    `Level: ${SENIORITY_LABELS[ctx.seniority]}`,
    ctx.workSetting && `Work setting: ${WORK_SETTING_LABELS[ctx.workSetting]}`,
    ctx.employmentType && `Employment type: ${EMPLOYMENT_TYPE_LABELS[ctx.employmentType]}`,
  ].filter(Boolean)

  return `${lines.join("\n")}\n\nCalibration: ${SENIORITY_CALIBRATION[ctx.seniority]}`
}

// Map an InterviewSession row (the role lives in `title`) to the prompt context.
export function toInterviewContext(session: {
  title: string
  seniority: Seniority
  workSetting: WorkSetting | null
  employmentType: EmploymentType | null
}): InterviewContext {
  return {
    role: session.title,
    seniority: session.seniority,
    workSetting: session.workSetting,
    employmentType: session.employmentType,
  }
}
