// The verdict moment plays once per session per browser (#82). The ids of
// sessions whose verdict has played live in one small cookie, so the server
// decides before the first paint and a revisit never flashes the animation.

export const VERDICT_SEEN_COOKIE = "mm_verdicts_seen"
// Most recent first; older ids fall off, so the cookie stays under ~1 KB.
const MAX_IDS = 30

export function parseSeen(value: string | undefined): string[] {
  return value ? value.split(".").filter(Boolean) : []
}

export function withSeen(value: string | undefined, sessionId: string): string {
  const ids = parseSeen(value).filter((id) => id !== sessionId)
  return [sessionId, ...ids].slice(0, MAX_IDS).join(".")
}
