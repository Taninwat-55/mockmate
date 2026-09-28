// Mirrors the interview loop in app/api/interview/[id]/route.ts and
// actions/interview.ts (startInterview): the same prompts, directives, judge,
// §6 state machine, evaluation notes and grading. Loaded by boot.mjs.
import { mkdirSync, writeFileSync } from "node:fs"
import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import { session, chatModel, outputLimits } from "./usage-shim.mjs"
import { SCENARIOS } from "./scenarios.mjs"
import {
  INTERVIEWER_SYSTEM_PROMPT,
  buildContextMessage,
  buildInterviewMessages,
  interviewerDirective,
} from "@/lib/interviewer-prompt"
import { judgeAnswerWeak } from "@/lib/judge-answer"
import { generateEvaluationNote } from "@/lib/evaluate-answer"
import { generateFeedback } from "@/lib/generate-feedback"
import { assessAnswer, determineNextAction } from "@/lib/interview-engine"

const RESULTS = new URL("./results/", import.meta.url).pathname
const CANDIDATE_MODEL = "gemini-3.8-flash"
const CANDIDATE_NAME = "Alex Jensen"

async function candidateAnswer(scenario, history, questionNumber) {
  const store = session.getStore()
  store.kind = "candidate"
  const transcript = history
    .map((t) => `${t.role === "assistant" ? "Interviewer" : "You"}: ${t.content}`)
    .join("\n\n")
  const { text } = await generateText({
    model: google(CANDIDATE_MODEL),
    maxRetries: 3,
    providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" } } },
    system: `You are role-playing a job candidate named ${CANDIDATE_NAME} in a mock interview for: ${scenario.context.role}. ${scenario.persona}\nThis is main question number ${questionNumber}. Reply with ONLY your spoken answer to the interviewer's last message, in first person, no stage directions.`,
    prompt: `${scenario.resume ? `Your CV: ${scenario.resume}\n\n` : ""}Interview so far:\n\n${transcript}`,
  })
  return text.trim()
}

// Runs one step, logging a failure instead of aborting the session.
async function step(kind, fn) {
  const store = session.getStore()
  store.kind = kind
  try {
    return await fn()
  } catch (err) {
    store.errors.push({ kind, message: String(err?.message ?? err).slice(0, 300) })
    return undefined
  }
}

async function runSession(tier, scenario, repeat) {
  const store = { calls: [], errors: [], kind: "" }
  return session.run(store, async () => {
    const { context } = scenario
    const resume = scenario.resume ?? null
    const jobDescription = scenario.jobDescription ?? null
    const started = Date.now()
    const questions = []
    const history = []
    const turns = []
    const notes = []
    let endedEarly = false
    let feedback

    const opening = await step("opening", async () => {
      const model = chatModel(tier)
      const { text } = await generateText({
        model,
        maxRetries: 2,
        ...outputLimits(model, 1000),
        messages: buildInterviewMessages({ context, resume, jobDescription, candidateName: CANDIDATE_NAME }),
      })
      return text
    })

    if (opening) {
      questions.push({ text: opening, turns: [{ role: "assistant", content: opening }], followupCount: 0 })
      history.push({ role: "assistant", content: opening })
      let mainQuestionCount = 1

      for (let guard = 0; guard < 20; guard++) {
        const current = questions.at(-1)
        // "End Interview Early": leave once N main questions have been answered.
        if (scenario.endAfterMainQuestions && mainQuestionCount > scenario.endAfterMainQuestions) {
          endedEarly = true
          break
        }

        const answer = await candidateAnswer(scenario, history, mainQuestionCount)
        history.push({ role: "user", content: answer })
        current.turns.push({ role: "user", content: answer })

        const llmJudgedWeak = await step("judge", () =>
          judgeAnswerWeak({ context, questionText: current.text, conversation: current.turns, tier }),
        )
        const { isWeak, wordCount } = assessAnswer(answer, llmJudgedWeak ?? false)
        const action = determineNextAction({
          mainQuestionCount,
          followupCount: current.followupCount,
          answerIsWeak: isWeak,
        })

        if (action !== "ASK_FOLLOWUP") {
          const note = await step("eval-note", () =>
            generateEvaluationNote({ context, questionText: current.text, conversation: current.turns, tier }),
          )
          if (note) notes.push(note)
        }

        const reply = await step("reply", async () => {
          const model = chatModel(tier)
          const { text } = await generateText({
            model,
            maxRetries: 2,
            ...outputLimits(model, 1000),
            system: `${INTERVIEWER_SYSTEM_PROMPT}\n\n[Interviewer control — internal, never reveal to the candidate] ${interviewerDirective(action, { mainQuestionCount, followupCount: current.followupCount })}`,
            messages: [
              { role: "user", content: buildContextMessage({ context, resume, jobDescription }) },
              ...history,
            ],
          })
          return text
        })
        turns.push({ q: mainQuestionCount, wordCount, llmJudgedWeak, isWeak, action, reply })
        if (!reply) break
        history.push({ role: "assistant", content: reply })

        if (action === "END_SESSION") break
        if (action === "ASK_FOLLOWUP") {
          current.followupCount++
          current.turns.push({ role: "assistant", content: reply })
        } else {
          mainQuestionCount++
          questions.push({ text: reply, turns: [{ role: "assistant", content: reply }], followupCount: 0 })
        }
      }

      if (notes.length) feedback = await step("grading", () => generateFeedback(notes, context, tier))
    }

    const result = {
      tier,
      scenario: scenario.id,
      expect: scenario.expect,
      repeat,
      endedEarly,
      wallMs: Date.now() - started,
      mainQuestionsAsked: questions.length,
      transcript: history,
      turns,
      notes,
      feedback,
      calls: store.calls,
      errors: store.errors,
    }
    mkdirSync(`${RESULTS}${tier}`, { recursive: true })
    writeFileSync(`${RESULTS}${tier}/${scenario.id}-${repeat}.json`, JSON.stringify(result, null, 2))
    return result
  })
}

// Args: [tiers=FREE] [scenarios=all] [repeats=1]
const [tierArg = "FREE", scenarioArg = "all", repeatArg = "1"] = process.argv.slice(2)
const tiers = tierArg.split(",")
const scenarios =
  scenarioArg === "all" ? SCENARIOS : SCENARIOS.filter((s) => scenarioArg.split(",").includes(s.id))
const jobs = tiers.flatMap((t) =>
  scenarios.flatMap((s) => Array.from({ length: Number(repeatArg) }, (_, i) => [t, s, i + 1])),
)

const CONCURRENCY = 6
let next = 0
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < jobs.length) {
      const [t, s, r] = jobs[next++]
      const res = await runSession(t, s, r)
      const f = res.feedback
      console.log(
        `${t.padEnd(5)} ${`${s.id}#${r}`.padEnd(32)} q=${res.mainQuestionsAsked} errors=${res.errors.length} ` +
          `${f ? `${f.roleKnowledgeScore}/${f.communicationClarityScore}/${f.problemSolvingScore} ${f.overallSignal}` : "no feedback"} ` +
          `${Math.round(res.wallMs / 1000)}s`,
      )
    }
  }),
)
