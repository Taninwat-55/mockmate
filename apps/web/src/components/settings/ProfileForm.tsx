"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { updateDisplayName } from "@/actions/account"
import { getInitials } from "@/lib/user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const MAX_NAME_CHARS = 60

type ProfileFormProps = {
  name: string
  email: string
  image: string | null
}

export function ProfileForm({ name, email, image }: ProfileFormProps) {
  const [value, setValue] = useState(name)
  const [isPending, startTransition] = useTransition()

  const trimmed = value.trim()
  const unchanged = trimmed === name.trim()
  const invalid = trimmed.length === 0 || trimmed.length > MAX_NAME_CHARS

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (invalid || unchanged) return
    startTransition(async () => {
      const result = await updateDisplayName({ name: trimmed })
      if (result.success) {
        toast.success("Name updated.")
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="size-14">
          {image && <AvatarImage src={image} alt={name || email} />}
          <AvatarFallback className="text-sm">
            {getInitials(name, email)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name || "—"}</p>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="display-name">Display name</Label>
        <Input
          id="display-name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={MAX_NAME_CHARS}
          disabled={isPending}
          aria-invalid={invalid}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled readOnly />
        <p className="text-xs text-muted-foreground">
          Managed by your Google account — it can&apos;t be changed here.
        </p>
      </div>

      <Button type="submit" disabled={isPending || invalid || unchanged}>
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  )
}
