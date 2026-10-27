import Link from "next/link"
import { Plus } from "lucide-react"

import { auth } from "@/auth"
import { buttonVariants } from "@/components/ui/button"
import { ResumeBanner } from "@/components/dashboard/ResumeBanner"
import { SessionHistory } from "@/components/dashboard/SessionHistory"

// Direction A, banner-led (#87): welcome and "New interview", the unfinished
// session if there is one, then your interviews as cards.
export default async function DashboardPage() {
  const session = await auth()
  const user = session?.user
  const firstName = user?.name?.trim().split(/\s+/)[0]

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="flex w-full max-w-4xl flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">Dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Welcome back{firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        <Link href="/interview/new" className={buttonVariants({ size: "lg" })}>
          <Plus className="size-4" />
          New interview
        </Link>
      </div>

      {user?.id && (
        <>
          {/* empty:hidden drops the wrapper (and its margin) when there is no banner. */}
          <div className="mt-6 w-full max-w-4xl empty:hidden">
            <ResumeBanner userId={user.id} />
          </div>
          <div className="mt-10 w-full max-w-4xl">
            <SessionHistory userId={user.id} />
          </div>
        </>
      )}
    </main>
  )
}
