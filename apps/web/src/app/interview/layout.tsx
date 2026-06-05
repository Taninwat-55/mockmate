import type { Metadata } from "next"

// Auth-gated interview screens (/interview/[id] and its feedback page) — never
// index them. The pages guard auth themselves; this layout exists only to carry
// the noindex directive for the whole subtree.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function InterviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
