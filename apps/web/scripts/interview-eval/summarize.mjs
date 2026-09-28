// Summarises results/ from eval runs: reliability, question-count drift, follow-up
// behaviour, and grades per scenario next to the expected band.
//   node scripts/interview-eval/summarize.mjs
import { existsSync, readdirSync, readFileSync } from "node:fs"

const DIR = new URL("./results/", import.meta.url).pathname
// $ per 1M tokens (input, output incl. thinking). ai.google.dev pricing, 2026-09-26.
const PRICES = { "gemini-3.8-flash": [0.75, 3.75], "gemini-3.1-pro-preview": [2.0, 12.0] }
const DKK_PER_USD = 6.8

if (!existsSync(DIR)) {
  console.log("No results yet. Run: pnpm --filter web eval:interview")
  process.exit(0)
}

for (const tier of readdirSync(DIR)) {
  const runs = readdirSync(`${DIR}${tier}`).map((f) => JSON.parse(readFileSync(`${DIR}${tier}/${f}`, "utf8")))
  let usd = 0, truncated = 0, errors = 0, followups = 0, sixth = 0, earlyClose = 0, ends = 0, thirdPerson = 0
  const flagged = []
  const byScenario = {}
  for (const r of runs) {
    for (const c of r.calls) {
      const [pin, pout] = PRICES[c.model] ?? [0, 0]
      usd += (c.inputTokens * pin + c.outputTokens * pout) / 1e6
      if (c.finishReason !== "stop") truncated++
    }
    errors += r.errors.length
    for (const t of r.turns) {
      if (t.action === "ASK_FOLLOWUP") followups++
      const asks = /\?/.test(t.reply ?? "")
      if (t.action === "END_SESSION") {
        ends++
        if (asks) { sixth++; flagged.push(`6th question  ${r.scenario}#${r.repeat}: ${t.reply.replace(/\s+/g, " ").slice(0, 140)}`) }
      } else if (!asks && /(that covers|thanks for your time|we'll be in touch|goodbye|take care|best of luck)/i.test(t.reply ?? "")) {
        earlyClose++
        flagged.push(`early close   ${r.scenario}#${r.repeat} q${t.q} ${t.action}: ${t.reply.replace(/\s+/g, " ").slice(0, 140)}`)
      }
    }
    const f = r.feedback
    // The report is read by the candidate: it must say "you", never he/she (#65).
    if (f) {
      const text = Object.values(f).filter((v) => typeof v === "string").join(" ")
      const hits = text.match(/\b(he|she|his|her|him|the candidate)\b/gi)
      if (hits) { thirdPerson++; flagged.push(`3rd person    ${r.scenario}#${r.repeat}: ${[...new Set(hits.map((h) => h.toLowerCase()))].join(", ")}`) }
    }
    const grade = f
      ? `${f.roleKnowledgeScore}/${f.communicationClarityScore}/${f.problemSolvingScore} ${f.overallSignal}`
      : "none"
    ;(byScenario[r.scenario] ??= { expect: r.expect, grades: [] }).grades.push(grade)
  }
  console.log(`\n=== ${tier}  (${runs.length} sessions)`)
  console.log(`cost ~${((usd / runs.length) * DKK_PER_USD).toFixed(2)} DKK/session | truncated ${truncated} | errors ${errors} | follow-ups ${(followups / runs.length).toFixed(1)}/session`)
  console.log(`6th question after the end: ${sixth}/${ends} | early close: ${earlyClose} | reports not in 2nd person: ${thirdPerson}/${runs.length}`)
  for (const [id, s] of Object.entries(byScenario)) console.log(`  ${id.padEnd(30)} expect ${s.expect.padEnd(10)} ${s.grades.join(" | ")}`)
  for (const line of flagged) console.log(`  ! ${line}`)
}
