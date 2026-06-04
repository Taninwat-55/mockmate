import { notFound, redirect } from "next/navigation"

import Link from "next/link"

import { prisma } from "@mockmate/db"
import { auth } from "@/auth"
import { buttonVariants } from "@/components/ui/button"

// Placeholder interview screen. The multi-turn chat is built in #4; for now this
// just confirms the session was created and is scoped to the signed-in user.
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
    select: { id: true, title: true, status: true },
  })
  if (!interview) notFound()

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {interview.status}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{interview.title}</h1>
        <p className="text-sm text-muted-foreground">
          Your interview session is ready. The interactive chat arrives in the next
          task.
        </p>
      </div>
      <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
        Back to dashboard
      </Link>
    </main>
  )
}
