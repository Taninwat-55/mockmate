import Link from "next/link"
import { prisma, InterviewSessionStatus } from "@mockmate/db"

interface SessionHistoryProps {
  userId: string
}

const STATUS_LABEL: Record<InterviewSessionStatus, string> = {
  COMPLETED: "Completed",
  ABANDONED: "Abandoned",
  IN_PROGRESS: "In progress",
}

const STATUS_CLASS: Record<InterviewSessionStatus, string> = {
  COMPLETED:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  ABANDONED: "bg-muted text-muted-foreground",
  IN_PROGRESS:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
}

export async function SessionHistory({ userId }: SessionHistoryProps) {
  const sessions = await prisma.interviewSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, status: true, createdAt: true },
  })

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No interviews yet — start one above.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {sessions.map((session) => {
        const date = session.createdAt.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })

        const row = (
          <div className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
            <span className="font-medium truncate mr-4">{session.title}</span>
            <div className="flex items-center gap-3 shrink-0">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[session.status]}`}
              >
                {STATUS_LABEL[session.status]}
              </span>
              <span className="text-muted-foreground">{date}</span>
            </div>
          </div>
        )

        return (
          <li key={session.id}>
            {session.status === InterviewSessionStatus.COMPLETED ? (
              <Link
                href={`/interview/${session.id}/feedback`}
                className="block hover:opacity-80 transition-opacity"
              >
                {row}
              </Link>
            ) : (
              row
            )}
          </li>
        )
      })}
    </ul>
  )
}
