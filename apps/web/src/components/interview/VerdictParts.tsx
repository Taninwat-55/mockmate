import { DiamondOutline } from "@/components/brand/Logo"

// The verdict report's building blocks (#82), shared by the feedback page and
// the landing page's sample report (#85) so the two can't drift apart. The v-*
// classes are what the verdict moment animates (globals.css).

// Literal classes so Tailwind sees them; the CSS turns them into delays on the
// feedback page and into scroll ranges on the landing page.
export const ROW_VARS = ["[--row:0]", "[--row:1]", "[--row:2]"] as const
export const SEGMENT_VARS = ["[--seg:0]", "[--seg:1]", "[--seg:2]", "[--seg:3]", "[--seg:4]"] as const

export const LABEL = "font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint"

export function ScoreBar({ score }: { score: number }) {
  return (
    <div className="mt-3 flex gap-1.5" aria-hidden="true">
      {SEGMENT_VARS.map((segVar, i) => (
        <span key={segVar} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-border">
          {i < score && (
            <span className={`v-segment absolute inset-0 rounded-full bg-foreground ${segVar}`} />
          )}
        </span>
      ))}
    </div>
  )
}

export function Note({
  kind,
  text,
}: {
  kind: "strength" | "weakness" | "tip"
  text: string
}) {
  const marker = {
    strength: { label: "Strength", glyph: "+", className: "bg-foreground text-background" },
    weakness: { label: "Weakness", glyph: "−", className: "border border-dashed border-foreground/40 text-muted-foreground" },
    // The one place the panel "writes": the pen accent (#82).
    tip: { label: "Next time", glyph: "→", className: "bg-pen text-background" },
  }[kind]

  return (
    <div className={`flex gap-3 ${kind === "tip" ? "v-tip" : ""}`}>
      <span
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-[5px] text-xs font-semibold ${marker.className}`}
        aria-hidden="true"
      >
        {marker.glyph}
      </span>
      <div>
        <p className={`${LABEL} ${kind === "tip" ? "text-pen" : ""}`}>{marker.label}</p>
        <p className="mt-0.5 text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  )
}

export function VerdictStamp({
  label,
  variant,
  compact = false,
}: {
  label: string
  // Told apart by fill, never by colour: solid for (strong) hire, outlined for no hire.
  variant: "solid" | "outline"
  // Smaller, for the landing sample inside its card.
  compact?: boolean
}) {
  return (
    <div
      className={`v-stamp mt-3 inline-flex items-center rounded-2xl ${
        compact ? "gap-2.5 px-5 py-3.5 sm:gap-3 sm:px-7 sm:py-4" : "gap-3 px-7 py-4 sm:gap-4 sm:px-9 sm:py-5"
      } ${
        variant === "solid"
          ? "bg-foreground text-background"
          : "border-[2.5px] border-foreground text-foreground"
      }`}
    >
      <DiamondOutline className={compact ? "size-5 sm:size-6" : "size-6 sm:size-8"} />
      <span
        className={`font-bold uppercase leading-none tracking-[-0.03em] ${
          compact ? "text-[26px] sm:text-[38px]" : "text-[34px] sm:text-[48px]"
        }`}
      >
        {label}
      </span>
    </div>
  )
}
