import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { auth } from "@/auth"

// Auth-gated area — never index it.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

// Server-side auth guard for /settings. Database sessions can't be verified in
// Edge middleware, so protection lives here where Prisma is reachable (mirrors
// the dashboard guard).
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  return <>{children}</>
}
