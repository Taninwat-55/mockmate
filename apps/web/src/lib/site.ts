/**
 * Single source of truth for site-wide identity used across metadata, the OG
 * image, JSON-LD structured data, the sitemap/robots, and llms.txt.
 *
 * SITE_URL reuses the existing prod env var (AUTH_URL — set to
 * https://mockmate.space in production per CLAUDE.md) so there's no new env var
 * to manage. Locally it falls back to the known production origin so canonical
 * and OG URLs are always absolute and correct.
 */
export const SITE_URL = process.env.AUTH_URL ?? "https://mockmate.space"

export const SITE_NAME = "MockMate"

/** Default <title> when a page doesn't set its own. */
export const SITE_TITLE = "MockMate — AI Mock Interviews with Graded Feedback"

/** Meta description — kept under ~160 chars for search snippets. */
export const SITE_DESCRIPTION =
  "Practice realistic AI mock interviews tailored to the job you're targeting, then get graded feedback across three dimensions — like a real hiring panel."

/** Short marketing line used on the OG/share image. */
export const SITE_TAGLINE = "AI mock interviews with graded feedback"

/**
 * Fuller, declarative description for AI engines and citation surfaces
 * (JSON-LD, /about, llms.txt). Factual — sourced from docs/PRD.md.
 */
export const SITE_LONG_DESCRIPTION =
  "MockMate is an AI-powered mock-interview tool for developers and job seekers. It runs a realistic, multi-turn technical interview based on the job description you paste and your résumé, asks five questions with up to two follow-ups each, then returns graded feedback across Technical Accuracy, Communication Clarity, and Problem-solving Approach with a Strong Hire / Hire / No Hire signal. It runs entirely in the browser and is text-first."

export const SITE_KEYWORDS = [
  "AI mock interview",
  "mock interview tool",
  "technical interview practice",
  "interview preparation",
  "AI interviewer",
  "coding interview practice",
  "interview feedback",
  "job interview practice",
] as const
