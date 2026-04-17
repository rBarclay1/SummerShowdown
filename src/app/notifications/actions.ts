"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth, currentUser } from "@clerk/nextjs/server"

export type SavePrefsResult = { success: boolean; error?: string }

export async function saveNotificationPrefs(formData: FormData): Promise<SavePrefsResult> {
  try {
    const { userId } = await auth()
    if (!userId) return { success: false, error: "Not authenticated." }

    const clerkUser = await currentUser()
    const athleteName =
      [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim() ||
      clerkUser?.username ||
      ""
    if (!athleteName) return { success: false, error: "Profile needs a name." }

    let athlete = await prisma.athlete.findUnique({ where: { clerkId: userId } })
    if (!athlete) {
      const existing = await prisma.athlete.findUnique({ where: { name: athleteName } })
      if (existing && !existing.clerkId) {
        athlete = await prisma.athlete.update({
          where: { id: existing.id },
          data: { clerkId: userId },
        })
      } else if (!existing) {
        athlete = await prisma.athlete.create({
          data: { name: athleteName, clerkId: userId },
        })
      } else {
        athlete = await prisma.athlete.create({
          data: { name: `${athleteName} (${userId.slice(-4)})`, clerkId: userId },
        })
      }
    }

    const emailEnabled = formData.get("emailEnabled") === "true"
    const pushEnabled = formData.get("pushEnabled") === "true"
    const email = (formData.get("email") as string | null)?.trim() || null

    await prisma.notificationPreferences.upsert({
      where: { athleteId: athlete.id },
      update: { emailEnabled, pushEnabled, email },
      create: { athleteId: athlete.id, emailEnabled, pushEnabled, email },
    })

    revalidatePath("/notifications")
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to save preferences." }
  }
}
