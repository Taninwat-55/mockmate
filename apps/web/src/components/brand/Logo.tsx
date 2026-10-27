/**
 * MockMate brand mark — a solid diamond (◆), from the June direction images
 * (#82). Drawn with `currentColor` so it inherits the surrounding ink. The
 * verdict stamp uses the outlined form (◇). Icon-only; pair it with the
 * wordmark text where a full lockup is needed.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 3.5 L20.5 12 L12 20.5 L3.5 12 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** The outlined diamond (◇) used inside the verdict stamp. */
export function DiamondOutline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 3.5 L20.5 12 L12 20.5 L3.5 12 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.25}
        strokeLinejoin="round"
      />
    </svg>
  )
}
