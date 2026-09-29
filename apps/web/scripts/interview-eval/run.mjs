// Mirrors the interview loop in app/api/interview/[id]/route.ts and
// actions/interview.ts (startInterview, continueToNextStage): the same prompts,
// directives, judge, §6 state machine, evaluation notes, closing guard, round
// verdicts, handovers and grading. Loaded by boot.mjs.
import { mkdirSync, writeFileSync } from "node:fs"
import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import { session, chatModel, outputLimits } from "./usage-shim.mjs"
import { SCENARIOS } from "./scenarios.mjs"
import {
  buildContextMessage,
  buildInterviewMessages,
  buildStageOpeningMessages,
  interviewerDirective,
  safeClosing,
  systemPromptFor,
} from "@/lib/interviewer-prompt"
import { judgeAnswerWeak } from "@/lib/judge-answer"
import { generateEvaluationNote } from "@/lib/evaluate-answer"
import { generateFeedback } from "@/lib/generate-feedback"
import { generateStageResult } from "@/lib/generate-stage-result"
import {
  STAGE_PLANS,
  assessAnswer,
  determineNextAction,
  minAnswerWords,
  stageProgress,
} from "@/lib/interview-engine"

const RESULTS = new URL("./results/", import.meta.url).pathname
const CANDIDATE_MODEL = "gemini-3.8-flash"
const CANDIDATE_NAME = "Alex Jensen"
// Which round plan each tier gets: free is one round, paid tiers the loop (#73).
const PLAN_FOR_TIER = { FREE: STAGE_PLANS.SINGLE, PAID: STAGE_PLANS.LOOP, MAX: STAGE_PLANS.LOOP }

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
    const stages = PLAN_FOR_TIER[tier]
    const isLoop = stages.length > 1
    const resume = scenario.resume ?? null
    const jobDescription = scenario.jobDescription ?? null
    const started = Date.now()
    const questions = [] // { stage, text, turns, followupCount }
    const history = [] // what the app saves: main questions, answers, follow-ups
    const turns = []
    const notes = []
    const noteStages = []
    const stageResults = []
    const handovers = []
    let endedEarly = false
    let feedback

    const opening = await step("opening", async () => {
      const model = chatModel(tier)
      const { text } = await generateText({
        model,
        maxRetries: 2,
        ...outputLimits(model, 1000),
        messages: buildInterviewMessages({
          context,
          resume,
          jobDescription,
          candidateName: CANDIDATE_NAME,
          progress: isLoop ? stageProgress(stages, []) : undefined,
        }),
      })
      return text
    })

    if (opening) {
      questions.push({ stage: stages[0], text: opening, turns: [{ role: "assistant", content: opening }], followupCount: 0 })
      history.push({ role: "assistant", content: opening })
      let mainQuestionCount = 1

      for (let guard = 0; guard < 40; guard++) {
        const current = questions.at(-1)
        // "End Interview Early": leave once N main questions have been answered.
        if (scenario.endAfterMainQuestions && mainQuestionCount > scenario.endAfterMainQuestions) {
          endedEarly = true
          break
        }

        const progress = stageProgress(stages, questions)
        const loopStage = isLoop ? progress.stage : undefined
        const answer = await candidateAnswer(scenario, history, mainQuestionCount)
        history.push({ role: "user", content: answer })
        current.turns.push({ role: "user", content: answer })

        const llmJudgedWeak = await step("judge", () =>
          judgeAnswerWeak({ context, questionText: current.text, conversation: current.turns, tier, stage: loopStage }),
        )
        const { isWeak, wordCount } = assessAnswer(answer, llmJudgedWeak ?? false, minAnswerWords(progress))
        const action = determineNextAction({
          progress,
          followupCount: current.followupCount,
          answerIsWeak: isWeak,
        })

        if (action !== "ASK_FOLLOWUP") {
          const note = await step("eval-note", () =>
            generateEvaluationNote({ context, questionText: current.text, conversation: current.turns, tier, stage: loopStage }),
          )
          if (note) {
            notes.push(note)
            noteStages.push(current.stage)
          }
        }

        const raw = await step(action === "END_STAGE" || action === "END_SESSION" ? "closing" : "reply", async () => {
          const model = chatModel(tier)
          const { text } = await generateText({
            model,
            maxRetries: 2,
            ...outputLimits(model, 1000),
            system: `${systemPromptFor(progress)}\n\n[Interviewer control — internal, never reveal to the candidate] ${interviewerDirective(action, { progress, followupCount: current.followupCount })}`,
            messages: [
              { role: "user", content: buildContextMessage({ context, resume, jobDescription }) },
              ...history,
            ],
          })
          return text
        })
        const closing = action === "END_STAGE" || action === "END_SESSION"
        const reply = closing ? safeClosing(raw ?? "", action, progress) : raw
        turns.push({
          q: mainQuestionCount,
          stage: progress.stage,
          stageQuestion: progress.question,
          wordCount,
          llmJudgedWeak,
          isWeak,
          action,
          reply,
          ...(closing ? { rawClosing: raw ?? "", closingReplaced: reply !== (raw ?? "").trim() } : {}),
        })
        if (!reply) break

        if (action === "END_SESSION") break
        if (action === "END_STAGE") {
          // The gate: verdict from this round's notes, then (unless the candidate
          // stops here) the next round's interviewer takes over. The closing line
          // is not saved in the app, so it stays out of the history.
          const roundNotes = notes.filter((_, i) => noteStages[i] === progress.stage)
          const verdict = await step("stage-result", () => generateStageResult(roundNotes, context, tier, progress.stage))
          stageResults.push({ stage: progress.stage, ...(verdict ?? { verdict: "ERROR", summary: "" }) })
          if (scenario.stopAfterStage === progress.stage) {
            endedEarly = true
            break
          }
          const nextStage = stages[progress.round]
          const nextProgress = stageProgress(stages, [...questions, { stage: nextStage }])
          const handover = await step("handover", async () => {
            const model = chatModel(tier)
            const { text } = await generateText({
              model,
              maxRetries: 2,
              ...outputLimits(model, 1000),
              messages: buildStageOpeningMessages({
                context,
                resume,
                jobDescription,
                candidateName: CANDIDATE_NAME,
                progress: nextProgress,
                history,
              }),
            })
            return text
          })
          if (!handover) break
          handovers.push({ stage: nextStage, text: handover })
          mainQuestionCount++
          questions.push({ stage: nextStage, text: handover, turns: [{ role: "assistant", content: handover }], followupCount: 0 })
          history.push({ role: "assistant", content: handover })
          continue
        }

        history.push({ role: "assistant", content: reply })
        if (action === "ASK_FOLLOWUP") {
          current.followupCount++
          current.turns.push({ role: "assistant", content: reply })
        } else {
          mainQuestionCount++
          questions.push({ stage: current.stage, text: reply, turns: [{ role: "assistant", content: reply }], followupCount: 0 })
        }
      }

      if (notes.length) {
        const loop = isLoop
          ? { stages: [...stages], noteStages, anyStop: stageResults.some((r) => r.verdict === "STOP") }
          : undefined
        feedback = await step("grading", () => generateFeedback(notes, context, tier, loop))
      }
    }

    const result = {
      tier,
      scenario: scenario.id,
      expect: scenario.expect,
      repeat,
      stages: [...stages],
      endedEarly,
      wallMs: Date.now() - started,
      mainQuestionsAsked: questions.length,
      questionsPerStage: Object.fromEntries(stages.map((st) => [st, questions.filter((q) => q.stage === st).length])),
      transcript: history,
      turns,
      notes,
      noteStages,
      stageResults,
      handovers,
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
