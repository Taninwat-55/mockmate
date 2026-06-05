"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { deleteAccount } from "@/actions/account"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const CONFIRM_WORD = "DELETE"

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [isPending, startTransition] = useTransition()

  const canDelete = confirmation === CONFIRM_WORD

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setConfirmation("")
  }

  function handleDelete() {
    if (!canDelete) return
    startTransition(async () => {
      const result = await deleteAccount({ confirmation })
      // On success the action signs out and redirects, so we only land here on
      // failure.
      if (result && !result.success) {
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button variant="destructive">Delete account</Button>}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This permanently deletes your account and every interview, question,
            and feedback report tied to it. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="confirm-delete">
            Type <span className="font-semibold text-foreground">DELETE</span> to
            confirm
          </Label>
          <Input
            id="confirm-delete"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            disabled={isPending}
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button
            variant="destructive"
            disabled={!canDelete || isPending}
            onClick={handleDelete}
          >
            {isPending ? "Deleting…" : "Delete account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
