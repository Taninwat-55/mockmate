import { notFound, redirect } from "next/navigation"

import Link from "next/link"

import { prisma, InterviewSessionStatus, MessageRole } from "@mockmate/db"
import { auth } from "@/auth"
import { buttonVariants } from "@/components/ui/button"
import { InterviewChat } from "@/components/interview/InterviewChat"
import type { InterviewUIMessage } from "@/types/interview-chat"

// The live interview screen. Hydrates the transcript from the DB (so a reload or a
// resumed session continues from where it left off), then hands off to the streaming
// chat client. A COMPLETED session shows the end state instead — the graded feedback
// page is a separate feature (#5).
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
      status: true,
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

  if (interview.status !== InterviewSessionStatus.IN_PROGRESS) {
    const ended = interview.status === InterviewSessionStatus.COMPLETED
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {interview.status}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{interview.title}</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            {ended
              ? "Interview complete. Your graded feedback arrives in the next update."
              : "This interview is no longer active."}
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
      <header className="border-b border-border px-4 py-3">
        <h1 className="text-sm font-medium tracking-tight">{interview.title}</h1>
      </header>
      <InterviewChat sessionId={interview.id} initialMessages={initialMessages} />
    </main>
  )
}
