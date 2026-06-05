"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { prisma } from "@mockmate/db"
import { auth, signOut } from "@/auth"

const MAX_NAME_CHARS = 60

const displayNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name can't be empty.")
    .max(MAX_NAME_CHARS, `Name must be ${MAX_NAME_CHARS} characters or fewer.`),
})

export type UpdateDisplayNameInput = z.infer<typeof displayNameSchema>

type ActionResult =
  | { success: true }
  | { success: false; error: string }

export async function updateDisplayName(
  input: UpdateDisplayNameInput
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "You need to be signed in to do that." }
  }

  const parsed = displayNameSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: parsed.data.name },
    })
  } catch {
    return { success: false, error: "Couldn't save your name. Please try again." }
  }

  revalidatePath("/settings")
  revalidatePath("/dashboard")
  return { success: true }
}

const deleteAccountSchema = z.object({
  confirmation: z.string(),
})

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>

export async function deleteAccount(
  input: DeleteAccountInput
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "You need to be signed in to do that." }
  }

  const parsed = deleteAccountSchema.safeParse(input)
  if (!parsed.success || parsed.data.confirmation !== "DELETE") {
    return { success: false, error: 'Type "DELETE" to confirm.' }
  }

  try {
    // Cascade deletes remove accounts, auth sessions, interview sessions,
    // questions, messages, and feedback along with the user.
    await prisma.user.delete({ where: { id: session.user.id } })
  } catch {
    return {
      success: false,
      error: "Couldn't delete your account. Please try again.",
    }
  }

  // Clears the now-orphaned auth cookie and redirects to the landing page.
  await signOut({ redirectTo: "/" })
  return { success: true }
}
