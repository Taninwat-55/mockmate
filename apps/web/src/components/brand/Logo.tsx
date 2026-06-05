/**
 * MockMate brand mark — a terminal window with a `>_` prompt, drawn monochrome
 * with `currentColor` so it inherits the surrounding text color (the site's
 * palette is strictly monochrome). Icon-only; pair it with the wordmark text
 * where a full lockup is needed.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* terminal window */}
      <rect x="2.25" y="3.75" width="19.5" height="16.5" rx="3" />
      {/* > prompt */}
      <path d="M6.5 9.5 L10 12 L6.5 14.5" />
      {/* _ cursor */}
      <path d="M12.5 14.75 H16.5" />
    </svg>
  )
}
