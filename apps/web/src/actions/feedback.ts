"use server"

import { z } from "zod"
import { prisma } from "@mockmate/db"
import { auth } from "@/auth"

const ratingSchema = z.number().int().min(1).max(5)

export async function submitFeedbackRating(
  sessionId: string,
  rating: number,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = ratingSchema.safeParse(rating)
  if (!parsed.success) {
    return { success: false, error: "Invalid rating" }
  }

  const interview = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
    select: { id: true },
  })
  if (!interview) {
    return { success: false, error: "Not found" }
  }

  try {
    await prisma.feedback.update({
      where: { interviewSessionId: sessionId },
      data: { userRating: parsed.data },
    })
    return { success: true }
  } catch {
    return { success: false, error: "Failed to save rating" }
  }
}
