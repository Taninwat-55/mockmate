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
  let closings = 0, replaced = 0, finalAsks = 0, maxCalls = 0, planMisses = 0, loops = 0, handovers = 0, handoverRole = 0
  const PLAN = { SCREENING: 3, HIRING_MANAGER: 4, ASSESSMENT: 3, FINAL: 2 }
  const ROLE = /recruit|hiring manager|assess|lead|founder|chief|officer|ceo|cto|coo|manager|director|head of|partner|specialist|supervisor|owner/i
  const flagged = []
  const byScenario = {}
  for (const r of runs) {
    for (const c of r.calls) {
      const [pin, pout] = PRICES[c.model] ?? [0, 0]
      usd += (c.inputTokens * pin + c.outputTokens * pout) / 1e6
      if (c.finishReason !== "stop") truncated++
    }
    errors += r.errors.length
    maxCalls = Math.max(maxCalls, r.calls.filter((c) => c.kind !== "candidate").length)
    const isLoop = (r.stages ?? []).length > 1
    if (isLoop) {
      loops++
      if (!r.endedEarly) {
        const miss = Object.entries(r.questionsPerStage).filter(([st, n]) => n !== PLAN[st])
        if (miss.length) { planMisses++; flagged.push(`plan miss     ${r.scenario}#${r.repeat}: ${JSON.stringify(r.questionsPerStage)}`) }
      }
      for (const h of r.handovers ?? []) {
        handovers++
        if (ROLE.test(h.text)) handoverRole++
        else flagged.push(`no role       ${r.scenario}#${r.repeat} ${h.stage}: ${h.text.replace(/\s+/g, " ").slice(0, 120)}`)
      }
    }
    for (const t of r.turns) {
      if (t.action === "ASK_FOLLOWUP") followups++
      const asks = /\?/.test(t.reply ?? "")
      if (t.action === "END_SESSION" || t.action === "END_STAGE") {
        closings++
        if (t.closingReplaced) replaced++
        if (asks) finalAsks++
      }
      if (t.action === "END_SESSION") {
        ends++
        const rawAsks = /\?/.test(t.rawClosing ?? t.reply ?? "")
        if (rawAsks) { sixth++; flagged.push(`closing asked ${r.scenario}#${r.repeat} (${t.closingReplaced ? "replaced" : "SHOWN"}): ${(t.rawClosing ?? t.reply).replace(/\s+/g, " ").slice(0, 120)}`) }
      } else if (t.action !== "END_STAGE" && !asks && /(that covers|thanks for your time|we'll be in touch|goodbye|take care|best of luck)/i.test(t.reply ?? "")) {
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
    const gates = (r.stageResults ?? []).map((g) => g.verdict[0]).join("")
    const grade = (f
      ? `${f.roleKnowledgeScore}/${f.communicationClarityScore}/${f.problemSolvingScore} ${f.overallSignal}`
      : "none") + (gates ? ` gates=${gates}` : "")
    ;(byScenario[r.scenario] ??= { expect: r.expect, grades: [] }).grades.push(grade)
  }
  console.log(`\n=== ${tier}  (${runs.length} sessions)`)
  console.log(`cost ~${((usd / runs.length) * DKK_PER_USD).toFixed(2)} DKK/session | truncated ${truncated} | errors ${errors} | follow-ups ${(followups / runs.length).toFixed(1)}/session`)
  console.log(`6th question after the end: ${sixth}/${ends} | early close: ${earlyClose} | reports not in 2nd person: ${thirdPerson}/${runs.length}`)
  console.log(`closings: ${closings}, replaced by the guard: ${replaced}, shown with "?": ${finalAsks} | max AI calls in a session: ${maxCalls}`)
  if (loops) console.log(`loops: ${loops} | plan misses (completed loops): ${planMisses} | handovers naming a role: ${handoverRole}/${handovers}`)
  for (const [id, s] of Object.entries(byScenario)) console.log(`  ${id.padEnd(30)} expect ${s.expect.padEnd(10)} ${s.grades.join(" | ")}`)
  for (const line of flagged) console.log(`  ! ${line}`)
}
