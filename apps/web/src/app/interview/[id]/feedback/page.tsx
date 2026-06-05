import { notFound, redirect } from "next/navigation"
import Link from "next/link"

import { prisma, InterviewSessionStatus } from "@mockmate/db"
import { auth } from "@/auth"
import { buttonVariants } from "@/components/ui/button"
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
    select: { id: true, title: true, status: true },
  })

  if (!interview) notFound()

  if (interview.status !== InterviewSessionStatus.COMPLETED) {
    redirect(`/interview/${id}`)
  }

  const feedback = await prisma.feedback.findUnique({
    where: { interviewSessionId: id },
  })

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8 space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Feedback</p>
        <h1 className="text-2xl font-semibold tracking-tight">{interview.title}</h1>
      </div>

      {feedback ? (
        <FeedbackDisplay feedback={feedback} sessionId={id} />
      ) : (
        <FeedbackGenerator sessionId={id} />
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Back to dashboard
        </Link>
        <Link href="/dashboard" className={buttonVariants()}>
          Start new interview
        </Link>
      </div>
    </main>
  )
}
