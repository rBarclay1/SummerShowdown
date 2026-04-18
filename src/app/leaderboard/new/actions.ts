"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin"

export type CreateLeaderboardResult =
  | { success: true }
  | { success: false; error: string }

export async function createLeaderboard(formData: FormData): Promise<CreateLeaderboardResult> {
  if (!(await isAdmin())) return { success: false, error: "Forbidden" }

  const endDateStr = formData.get("endDate") as string | null
  const endDate = endDateStr ? new Date(endDateStr) : null

  const existingLiftId = formData.get("liftId") as string | null
  const newLiftName = (formData.get("newLiftName") as string | null)?.trim()

  if (!existingLiftId && !newLiftName) return { success: false, error: "A lift is required." }

  let liftId: number
  let liftName: string

  if (existingLiftId) {
    liftId = parseInt(existingLiftId)
    const lift = await prisma.lift.findUnique({ where: { id: liftId } })
    if (!lift) return { success: false, error: "Lift not found." }
    liftName = lift.name
  } else {
    const newLiftTypeRaw = formData.get("newLiftType") as string | null
    const newLiftTypeValue = newLiftTypeRaw === "time_trial" ? "time_trial" : "lift"
    const newLiftUnit = newLiftTypeValue === "time_trial" ? "seconds" : "lbs"

    const lift = await prisma.lift.upsert({
      where: { name: newLiftName! },
      update: {},
      create: { name: newLiftName!, type: newLiftTypeValue, unit: newLiftUnit },
    })
    liftId = lift.id
    liftName = lift.name
  }

  // Prevent duplicate: one leaderboard per lift
  const existing = await prisma.leaderboard.findFirst({ where: { mainLiftId: liftId } })
  if (existing) {
    return {
      success: false,
      error: `A leaderboard for ${liftName} already exists.`,
    }
  }

  const leaderboard = await prisma.leaderboard.create({
    data: { name: liftName, mainLiftId: liftId, ...(endDate ? { endDate } : {}) },
  })

  revalidatePath("/")
  redirect(`/leaderboard/${leaderboard.id}`)
}
