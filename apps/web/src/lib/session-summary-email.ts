import { prisma, type OverallSignal } from "@mockmate/db"

// Post-session summary email (#54) — a paid-session perk. Replaces the AWS
// Lambda: the feedback route schedules this with `after()`, so it runs once the
// response has been sent and never blocks or breaks the feedback page. Sent via
// Resend's HTTP API with plain fetch, so there is no SDK dependency.

const RESEND_ENDPOINT = "https://api.resend.com/emails"
const FROM = "MockMate <results@mockmate.space>"

const SIGNAL_LABEL: Record<OverallSignal, string> = {
  STRONG_HIRE: "Strong Hire",
  HIRE: "Hire",
  NO_HIRE: "No Hire",
}

const SIGNAL_COLOR: Record<OverallSignal, string> = {
  STRONG_HIRE: "#16a34a",
  HIRE: "#2563eb",
  NO_HIRE: "#dc2626",
}

// The role title is user input and the feedback text is model output — escape
// both before they go into HTML.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

type Dimension = { name: string; score: number; strength: string; weakness: string; tip: string }

function dimensionBlock({ name, score, strength, weakness, tip }: Dimension): string {
  return `
    <div style="margin-bottom:20px;padding:20px;background:#f9fafb;border-radius:8px;border-left:4px solid #6366f1;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <strong style="font-size:14px;color:#111827;">${name}</strong>
        <span style="font-size:16px;letter-spacing:3px;color:#6366f1;">${"●".repeat(score)}${"○".repeat(5 - score)}&nbsp;${score}/5</span>
      </div>
      <p style="margin:0 0 6px;font-size:13px;color:#374151;"><span style="color:#16a34a;font-weight:600;">+ Strength:</span> ${escapeHtml(strength)}</p>
      <p style="margin:0 0 6px;font-size:13px;color:#374151;"><span style="color:#dc2626;font-weight:600;">– Weakness:</span> ${escapeHtml(weakness)}</p>
      <p style="margin:0;font-size:13px;color:#374151;"><span style="color:#2563eb;font-weight:600;">→ Tip:</span> ${escapeHtml(tip)}</p>
    </div>`
}

type SummaryEmail = {
  title: string
  firstName: string | null
  overallSignal: OverallSignal
  overallSummary: string
  dimensions: Dimension[]
}

function buildEmailHtml(email: SummaryEmail): string {
  const greeting = email.firstName ? `Hi ${escapeHtml(email.firstName)},` : "Hi,"

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Your MockMate Results</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:600px;width:100%;">

        <tr><td style="background:#111827;padding:28px 36px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">MockMate</p>
          <p style="margin:4px 0 0;font-size:13px;color:#9ca3af;">Interview Results</p>
        </td></tr>

        <tr><td style="padding:32px 36px;">
          <p style="margin:0 0 4px;font-size:16px;color:#111827;">${greeting}</p>
          <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.5;">
            Here are your results for <strong style="color:#111827;">${escapeHtml(email.title)}</strong>.
          </p>

          <div style="text-align:center;margin-bottom:32px;padding:24px;background:#f9fafb;border-radius:8px;">
            <p style="margin:0 0 10px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Overall Signal</p>
            <span style="display:inline-block;padding:8px 28px;background:${SIGNAL_COLOR[email.overallSignal]};color:#ffffff;font-size:18px;font-weight:700;border-radius:6px;">${SIGNAL_LABEL[email.overallSignal]}</span>
            <p style="margin:16px 0 0;font-size:14px;color:#374151;line-height:1.6;text-align:left;">${escapeHtml(email.overallSummary)}</p>
          </div>

          <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#111827;">Dimension Breakdown</p>
          ${email.dimensions.map(dimensionBlock).join("")}

          <div style="text-align:center;margin-top:32px;">
            <a href="https://mockmate.space" style="display:inline-block;padding:12px 32px;background:#111827;color:#ffffff;font-size:14px;font-weight:600;border-radius:6px;text-decoration:none;">Practice Again on MockMate</a>
          </div>
        </td></tr>

        <tr><td style="padding:20px 36px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            MockMate · AI-powered interview preparation ·
            <a href="https://mockmate.space" style="color:#6366f1;text-decoration:none;">mockmate.space</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// Load the session's feedback and email it to its owner. Never throws: a failure
// is logged and the feedback page is unaffected.
export async function sendSessionSummaryEmail(sessionId: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  try {
    const feedback = await prisma.feedback.findUnique({
      where: { interviewSessionId: sessionId },
      include: {
        interviewSession: { select: { title: true, user: { select: { email: true, name: true } } } },
      },
    })
    if (!feedback) {
      console.error(`[session-email] No feedback found for session ${sessionId}`)
      return
    }

    const { title, user } = feedback.interviewSession
    const html = buildEmailHtml({
      title,
      firstName: user.name?.split(" ")[0] ?? null,
      overallSignal: feedback.overallSignal,
      overallSummary: feedback.overallSummary,
      dimensions: [
        {
          name: "Role Knowledge",
          score: feedback.roleKnowledgeScore,
          strength: feedback.roleKnowledgeStrength,
          weakness: feedback.roleKnowledgeWeakness,
          tip: feedback.roleKnowledgeTip,
        },
        {
          name: "Communication Clarity",
          score: feedback.communicationClarityScore,
          strength: feedback.communicationClarityStrength,
          weakness: feedback.communicationClarityWeakness,
          tip: feedback.communicationClarityTip,
        },
        {
          name: "Problem Solving",
          score: feedback.problemSolvingScore,
          strength: feedback.problemSolvingStrength,
          weakness: feedback.problemSolvingWeakness,
          tip: feedback.problemSolvingTip,
        },
      ],
    })

    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: user.email,
        // Plain-text subject: no HTML escaping needed.
        subject: `Your interview results: ${title}`,
        html,
      }),
    })
    if (!res.ok) {
      console.error(`[session-email] Resend responded ${res.status}: ${await res.text()}`)
    }
  } catch (err) {
    console.error("[session-email] send failed:", err)
  }
}
