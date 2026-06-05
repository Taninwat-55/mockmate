/** Two-letter initials for an avatar fallback, derived from name or email. */
export function getInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || ""
  if (!source) return "?"

  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}
