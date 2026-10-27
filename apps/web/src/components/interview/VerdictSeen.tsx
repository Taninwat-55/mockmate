"use client"

import { useEffect } from "react"

import { VERDICT_SEEN_COOKIE, withSeen } from "@/lib/verdict-seen"

// Rendered only while the verdict moment plays: marks this session as seen so
// the next visit shows the finished report straight away (#82).
export function VerdictSeen({ sessionId }: { sessionId: string }) {
  useEffect(() => {
    const current = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${VERDICT_SEEN_COOKIE}=`))
      ?.split("=")[1]
    const value = withSeen(current, sessionId)
    document.cookie = `${VERDICT_SEEN_COOKIE}=${value}; path=/interview; max-age=31536000; samesite=lax`
  }, [sessionId])

  return null
}
