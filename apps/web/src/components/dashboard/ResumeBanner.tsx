import Link from "next/link"
import { prisma, InterviewSessionStatus } from "@mockmate/db"

interface ResumeBannerProps {
  userId: string
}

export async function ResumeBanner({ userId }: ResumeBannerProps) {
  const session = await prisma.interviewSession.findFirst({
    where: { userId, status: InterviewSessionStatus.IN_PROGRESS },
    orderBy: { lastActiveAt: "desc" },
    select: { id: true, title: true },
  })

  if (!session) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/30 dark:bg-amber-900/20">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            You have an unfinished interview
          </p>
          <p className="mt-0.5 truncate text-xs text-amber-700 dark:text-amber-400">
            {session.title}
          </p>
        </div>
        <Link
          href={`/interview/${session.id}`}
          className="shrink-0 rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-amber-50 transition-opacity hover:opacity-80 dark:bg-amber-200 dark:text-amber-900"
        >
          Resume interview →
        </Link>
      </div>
    </div>
  )
}
