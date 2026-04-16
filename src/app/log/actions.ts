"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export type LogPRResult =
  | { success: true; entry: { id: number; weightLbs: number }; isBaseline: boolean }
  | { success: false; error: string }

export async function logPR(formData: FormData): Promise<LogPRResult> {
  try {
    const athleteName = (formData.get("athleteName") as string).trim()
    const leaderboardId = parseInt(formData.get("leaderboardId") as string)
    const liftId = parseInt(formData.get("liftId") as string)
    const weightRaw = parseFloat(formData.get("weight") as string)
    const unit = formData.get("unit") as "lbs" | "kg"
    const dateStr = formData.get("date") as string

    if (!athleteName || isNaN(leaderboardId) || isNaN(liftId) || isNaN(weightRaw)) {
      return { success: false, error: "All fields are required." }
    }

    const weightLbs = unit === "kg" ? weightRaw * 2.20462 : weightRaw
    const date = dateStr ? new Date(dateStr) : new Date()

    const athlete = await prisma.athlete.upsert({
      where: { name: athleteName },
      update: {},
      create: { name: athleteName },
    })

    // Check if this is the first entry (baseline)
    const existing = await prisma.pREntry.findFirst({
      where: { athleteId: athlete.id, liftId, leaderboardId },
    })
    const isBaseline = !existing

    const entry = await prisma.pREntry.create({
      data: {
        athleteId: athlete.id,
        liftId,
        leaderboardId,
        weightLbs,
        date,
      },
    })

    revalidatePath("/")
    revalidatePath(`/leaderboard/${leaderboardId}`)
    revalidatePath(`/athlete/${athlete.id}`)

    return { success: true, entry: { id: entry.id, weightLbs: entry.weightLbs }, isBaseline }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to log PR. Please try again." }
  }
}
