import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"

import { prisma, InterviewSessionStatus } from "@mockmate/db"
import { auth } from "@/auth"
import { interviewTitle } from "@/lib/interview-context"
import { plannedQuestions } from "@/lib/interview-engine"
import { VERDICT_SEEN_COOKIE, parseSeen } from "@/lib/verdict-seen"
import { buttonVariants } from "@/components/ui/button"
import { AppHeader } from "@/components/layout/AppHeader"
import { FeedbackDisplay } from "@/components/interview/FeedbackDisplay"
import { FeedbackGenerator } from "@/components/interview/FeedbackGenerator"

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { id } = await params

  const interview = await prisma.interviewSession.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, title: true, company: true, status: true, stages: true },
  })

  if (!interview) notFound()

  if (interview.status !== InterviewSessionStatus.COMPLETED) {
    redirect(`/interview/${id}`)
  }

  const [feedback, answeredQuestions, cookieStore] = await Promise.all([
    prisma.feedback.findUnique({ where: { interviewSessionId: id } }),
    prisma.question.count({
      where: { interviewSessionId: id, evaluationNote: { not: null } },
    }),
    cookies(),
  ])
  // The verdict moment plays on the first view in this browser only (#82).
  const play = !parseSeen(cookieStore.get(VERDICT_SEEN_COOKIE)?.value).includes(id)

  return (
    <>
      <AppHeader user={session.user} width="3xl" />
      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        {feedback ? (
          <FeedbackDisplay
            feedback={feedback}
            sessionId={id}
            title={interviewTitle(interview)}
            answeredQuestions={answeredQuestions}
            plannedQuestions={plannedQuestions(interview.stages)}
            play={play}
          />
        ) : (
          <>
            <div className="mb-8 space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Feedback</p>
              <h1 className="text-2xl font-semibold tracking-tight">{interviewTitle(interview)}</h1>
            </div>
            <FeedbackGenerator sessionId={id} />
          </>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
            Back to dashboard
          </Link>
          <Link href="/interview/new" className={buttonVariants()}>
            Start new interview
          </Link>
        </div>
      </main>
    </>
  )
}
