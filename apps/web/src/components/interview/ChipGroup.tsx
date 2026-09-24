"use client"

import { Button } from "@/components/ui/button"

type ChipGroupProps<T extends string> = {
  label: string
  hint?: string
  options: Record<T, string>
  value: T | undefined
  onChange: (value: T | undefined) => void
  // Optional groups let the user click the active chip again to clear it.
  allowDeselect?: boolean
  disabled?: boolean
}

// Single-select chips (a radio group styled as buttons) for the interview setup form.
export function ChipGroup<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
  allowDeselect = false,
  disabled,
}: ChipGroupProps<T>) {
  const entries = Object.entries(options) as [T, string][]

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {entries.map(([key, text]) => {
          const selected = key === value
          return (
            <Button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              size="sm"
              variant={selected ? "default" : "outline"}
              className="rounded-full"
              disabled={disabled}
              onClick={() => onChange(selected && allowDeselect ? undefined : key)}
            >
              {text}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
