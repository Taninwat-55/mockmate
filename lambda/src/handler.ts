import postgres from 'postgres'
import { Resend } from 'resend'
import type { Handler } from 'aws-lambda'

type OverallSignal = 'HIRE' | 'NO_HIRE' | 'STRONG_HIRE'

type EmailRow = {
  title: string
  email: string
  name: string | null
  technicalAccuracyScore: number
  technicalAccuracyStrength: string
  technicalAccuracyWeakness: string
  technicalAccuracyTip: string
  communicationClarityScore: number
  communicationClarityStrength: string
  communicationClarityWeakness: string
  communicationClarityTip: string
  problemSolvingScore: number
  problemSolvingStrength: string
  problemSolvingWeakness: string
  problemSolvingTip: string
  overallSignal: OverallSignal
  overallSummary: string
}

const SIGNAL_LABEL: Record<OverallSignal, string> = {
  STRONG_HIRE: 'Strong Hire',
  HIRE: 'Hire',
  NO_HIRE: 'No Hire',
}

const SIGNAL_COLOR: Record<OverallSignal, string> = {
  STRONG_HIRE: '#16a34a',
  HIRE: '#2563eb',
  NO_HIRE: '#dc2626',
}

function scoreBar(score: number): string {
  return '●'.repeat(score) + '○'.repeat(5 - score)
}

function dimensionBlock(
  name: string,
  score: number,
  strength: string,
  weakness: string,
  tip: string,
): string {
  return `
    <div style="margin-bottom:20px;padding:20px;background:#f9fafb;border-radius:8px;border-left:4px solid #6366f1;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <strong style="font-size:14px;color:#111827;">${name}</strong>
        <span style="font-size:16px;letter-spacing:3px;color:#6366f1;">${scoreBar(score)}&nbsp;${score}/5</span>
      </div>
      <p style="margin:0 0 6px;font-size:13px;color:#374151;"><span style="color:#16a34a;font-weight:600;">+ Strength:</span> ${strength}</p>
      <p style="margin:0 0 6px;font-size:13px;color:#374151;"><span style="color:#dc2626;font-weight:600;">– Weakness:</span> ${weakness}</p>
      <p style="margin:0;font-size:13px;color:#374151;"><span style="color:#2563eb;font-weight:600;">→ Tip:</span> ${tip}</p>
    </div>`
}

function buildEmailHtml(row: EmailRow): string {
  const signalLabel = SIGNAL_LABEL[row.overallSignal]
  const signalColor = SIGNAL_COLOR[row.overallSignal]
  const firstName = row.name ? row.name.split(' ')[0] : null
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'

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
            Here are your results for <strong style="color:#111827;">${row.title}</strong>.
          </p>

          <div style="text-align:center;margin-bottom:32px;padding:24px;background:#f9fafb;border-radius:8px;">
            <p style="margin:0 0 10px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Overall Signal</p>
            <span style="display:inline-block;padding:8px 28px;background:${signalColor};color:#ffffff;font-size:18px;font-weight:700;border-radius:6px;">${signalLabel}</span>
            <p style="margin:16px 0 0;font-size:14px;color:#374151;line-height:1.6;text-align:left;">${row.overallSummary}</p>
          </div>

          <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#111827;">Dimension Breakdown</p>
          ${dimensionBlock('Technical Accuracy', row.technicalAccuracyScore, row.technicalAccuracyStrength, row.technicalAccuracyWeakness, row.technicalAccuracyTip)}
          ${dimensionBlock('Communication Clarity', row.communicationClarityScore, row.communicationClarityStrength, row.communicationClarityWeakness, row.communicationClarityTip)}
          ${dimensionBlock('Problem Solving', row.problemSolvingScore, row.problemSolvingStrength, row.problemSolvingWeakness, row.problemSolvingTip)}

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

export const handler: Handler<{ sessionId: string }, void> = async (event) => {
  const { sessionId } = event

  const sql = postgres(process.env.DATABASE_URL!, { max: 1, idle_timeout: 20 })

  try {
    const rows = await sql<EmailRow[]>`
      SELECT
        i.title,
        u.email,
        u.name,
        f."technicalAccuracyScore",    f."technicalAccuracyStrength",
        f."technicalAccuracyWeakness", f."technicalAccuracyTip",
        f."communicationClarityScore", f."communicationClarityStrength",
        f."communicationClarityWeakness", f."communicationClarityTip",
        f."problemSolvingScore",       f."problemSolvingStrength",
        f."problemSolvingWeakness",    f."problemSolvingTip",
        f."overallSignal",
        f."overallSummary"
      FROM "InterviewSession" i
      JOIN "User" u ON u.id = i."userId"
      JOIN "Feedback" f ON f."interviewSessionId" = i.id
      WHERE i.id = ${sessionId}
    `

    const row = rows[0]
    if (!row) {
      console.error(`[email-lambda] No data found for session ${sessionId}`)
      return
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'MockMate <results@mockmate.space>',
      to: row.email,
      subject: `Your interview results: ${row.title}`,
      html: buildEmailHtml(row),
    })

    console.log(`[email-lambda] Email sent to ${row.email} for session ${sessionId}`)
  } finally {
    await sql.end()
  }
}
