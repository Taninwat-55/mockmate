import Link from "next/link"

import { Logo } from "@/components/brand/Logo"
import { UserMenu } from "@/components/dashboard/UserMenu"

type AppHeaderProps = {
  // Passed in from the page or layout that already called auth(), so the
  // header adds no extra session lookup.
  user: { name?: string | null; email?: string | null; image?: string | null }
  // Matches the content column below it: 2xl for dashboard/settings, 3xl for feedback.
  width?: "2xl" | "3xl"
}

// The signed-in app frame (#78): the logo goes back to the dashboard, the
// account menu sits on the right.
export function AppHeader({ user, width = "2xl" }: AppHeaderProps) {
  return (
    <header className="border-b border-border">
      <div
        className={`mx-auto flex h-14 w-full items-center justify-between px-6 ${
          width === "3xl" ? "max-w-3xl" : "max-w-2xl"
        }`}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo className="size-5" />
          <span className="text-[17px] font-semibold tracking-[-0.02em]">MockMate</span>
        </Link>
        <UserMenu
          name={user.name ?? null}
          email={user.email ?? null}
          image={user.image ?? null}
        />
      </div>
    </header>
  )
}
