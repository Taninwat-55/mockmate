// Free-path regression check (#72). Free interviews must behave exactly as before
// stages existed: the same system prompt, opening message, turn directives and
// state-machine decisions. This computes them from the live code and compares
// them with free-path.snapshot.json, which was recorded before the refactor.
//
//   pnpm --filter web eval:check            # compare, exit 1 on any difference
//   pnpm --filter web eval:check --update   # re-record (only for a deliberate change)
//
// No model calls, no database.
import { readFileSync, writeFileSync } from "node:fs"
import { createLoader, here } from "./load.mjs"

const SNAPSHOT = `${here}free-path.snapshot.json`
const jiti = createLoader()
const prompt = await jiti.import("@/lib/interviewer-prompt")
const engine = await jiti.import("@/lib/interview-engine")

const ACTIONS = ["ASK_FOLLOWUP", "MARK_UNRESOLVED", "NEXT_QUESTION", "END_SESSION"]
const CONTEXT = { role: "Barista", company: "Espresso House", seniority: "STUDENT" }

// Adapters: how the current API is called for a single 5-question round. The
// progress for main question q is what the route derives from q questions.
const SINGLE = engine.STAGE_PLANS.SINGLE
const progressAt = (q) => engine.stageProgress(SINGLE, Array.from({ length: q }, () => ({ stage: SINGLE[0] })))
const directive = (action, q, followupCount) =>
  prompt.interviewerDirective(action, { progress: progressAt(q), followupCount })
const nextAction = (q, followupCount, answerIsWeak) =>
  engine.determineNextAction({ progress: progressAt(q), followupCount, answerIsWeak })

function freePathOutputs() {
  const out = {
    systemPrompt: prompt.INTERVIEWER_SYSTEM_PROMPT,
    contextMessage: prompt.buildContextMessage({
      context: CONTEXT,
      resume: "Babysitting, school events.",
      jobDescription: null,
      candidateName: "Alex Jensen",
    }),
    directives: {},
    nextAction: {},
  }
  for (let q = 1; q <= 5; q++) {
    for (let f = 0; f <= 2; f++) {
      for (const a of ACTIONS) out.directives[`${a} q${q} f${f}`] = directive(a, q, f)
      for (const weak of [false, true]) out.nextAction[`q${q} f${f} weak=${weak}`] = nextAction(q, f, weak)
    }
  }
  return out
}

const current = freePathOutputs()
if (process.argv.includes("--update")) {
  writeFileSync(SNAPSHOT, `${JSON.stringify(current, null, 2)}\n`)
  console.log(`Recorded ${SNAPSHOT}`)
  process.exit(0)
}

const expected = JSON.parse(readFileSync(SNAPSHOT, "utf8"))
const diffs = []
for (const key of ["systemPrompt", "contextMessage"]) {
  if (current[key] !== expected[key]) diffs.push(key)
}
for (const group of ["directives", "nextAction"]) {
  for (const [k, v] of Object.entries(expected[group])) {
    if (current[group][k] !== v) diffs.push(`${group}[${k}]: expected ${JSON.stringify(v)}, got ${JSON.stringify(current[group][k])}`)
  }
}
if (diffs.length) {
  console.error(`Free path changed (${diffs.length}):\n  ${diffs.slice(0, 20).join("\n  ")}`)
  process.exit(1)
}
console.log(`Free path unchanged: prompt, context message, ${Object.keys(expected.directives).length} directives, ${Object.keys(expected.nextAction).length} state-machine cases.`)
