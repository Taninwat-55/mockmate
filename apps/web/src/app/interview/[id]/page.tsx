import { notFound, redirect } from "next/navigation"

import Link from "next/link"

import { prisma, InterviewSessionStatus, MessageRole, type ModelTier } from "@mockmate/db"
import { auth } from "@/auth"
import { interviewTitle } from "@/lib/interview-context"
import { buttonVariants } from "@/components/ui/button"
import { InterviewChat } from "@/components/interview/InterviewChat"
import type { InterviewUIMessage } from "@/types/interview-chat"
import { MODEL_TIER_LABELS } from "@/types/interview"

// The live interview screen. Hydrates the transcript from the DB (so a reload or a
// resumed session continues from where it left off), then hands off to the streaming
// chat client. A COMPLETED session shows the end state instead — the graded feedback
// page is a separate feature (#5).
// Header badge per model tier (#52).
const TIER_BADGE: Record<ModelTier, { className: string; title: string }> = {
  FREE: { className: "bg-muted text-muted-foreground", title: "Free session" },
  PAID: { className: "bg-foreground text-background", title: "Pro session — deeper grading" },
  MAX: { className: "bg-amber-500 text-black", title: "Max session — graded by 3.1 Pro (owner)" },
}

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { id } = await params
  const interview = await prisma.interviewSession.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      title: true,
      company: true,
      status: true,
      modelTier: true,
      questions: {
        orderBy: { questionNumber: "asc" },
        select: {
          messages: {
            orderBy: { createdAt: "asc" },
            select: { id: true, role: true, content: true },
          },
        },
      },
    },
  })
  if (!interview) notFound()

  if (interview.status === InterviewSessionStatus.COMPLETED) {
    redirect(`/interview/${id}/feedback`)
  }

  if (interview.status !== InterviewSessionStatus.IN_PROGRESS) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {interview.status}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{interviewTitle(interview)}</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            This interview is no longer active.
          </p>
        </div>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Back to dashboard
        </Link>
      </main>
    )
  }

  const initialMessages: InterviewUIMessage[] = interview.questions.flatMap((q) =>
    q.messages.map((m) => ({
      id: m.id,
      role: m.role === MessageRole.AI ? ("assistant" as const) : ("user" as const),
      parts: [{ type: "text" as const, text: m.content }],
    })),
  )

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h1 className="text-sm font-medium tracking-tight">{interviewTitle(interview)}</h1>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            TIER_BADGE[interview.modelTier].className
          }`}
          title={TIER_BADGE[interview.modelTier].title}
        >
          {MODEL_TIER_LABELS[interview.modelTier]}
        </span>
      </header>
      <InterviewChat sessionId={interview.id} initialMessages={initialMessages} />
    </main>
  )
}
