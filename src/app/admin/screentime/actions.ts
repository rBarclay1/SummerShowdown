"use server"

import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/admin"
import { revalidatePath } from "next/cache"

export type ScreenTimeResult = { success: true } | { success: false; error: string }

export async function logScreenTime(formData: FormData): Promise<ScreenTimeResult> {
  if (!(await isAdmin())) return { success: false, error: "Forbidden" }

  const athleteId = parseInt(formData.get("athleteId") as string)
  const weekStart = formData.get("weekStart") as string
  const hoursStr = formData.get("hours") as string

  if (!athleteId || !weekStart) return { success: false, error: "All fields are required." }

  const hours = parseFloat(hoursStr)
  if (isNaN(hours) || hours <= 0) return { success: false, error: "Enter a valid number of hours greater than 0." }
  if (hours > 168) return { success: false, error: "Screen time cannot exceed 168 hours (one week)." }

  const weekDate = new Date(weekStart)
  if (isNaN(weekDate.getTime())) return { success: false, error: "Invalid week date." }

  const existing = await prisma.screenTimeEntry.findFirst({
    where: { athleteId, weekStart: weekDate },
  })

  if (existing) {
    await prisma.screenTimeEntry.update({
      where: { id: existing.id },
      data: { hours },
    })
  } else {
    await prisma.screenTimeEntry.create({
      data: { athleteId, weekStart: weekDate, hours },
    })
  }

  revalidatePath("/admin/screentime")
  return { success: true }
}

export async function deleteScreenTime(entryId: number): Promise<ScreenTimeResult> {
  if (!(await isAdmin())) return { success: false, error: "Forbidden" }

  await prisma.screenTimeEntry.delete({ where: { id: entryId } })
  revalidatePath("/admin/screentime")
  return { success: true }
}
