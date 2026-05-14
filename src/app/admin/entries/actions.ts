"use server"

import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/admin"
import { revalidatePath, revalidateTag } from "next/cache"

export type EntryActionResult = { success: true } | { success: false; error: string }

export async function addEntry(formData: FormData): Promise<EntryActionResult> {
  if (!(await isAdmin())) return { success: false, error: "Forbidden" }

  const athleteId = parseInt(formData.get("athleteId") as string)
  const leaderboardId = parseInt(formData.get("leaderboardId") as string)
  const liftId = parseInt(formData.get("liftId") as string)
  const valueStr = formData.get("value") as string
  const dateStr = formData.get("date") as string

  if (!athleteId || !leaderboardId || !liftId || !dateStr) {
    return { success: false, error: "All fields are required." }
  }

  const value = parseFloat(valueStr)
  if (isNaN(value) || value <= 0) return { success: false, error: "Enter a valid value greater than 0." }

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return { success: false, error: "Invalid date." }

  await prisma.pREntry.create({
    data: { athleteId, leaderboardId, liftId, weightLbs: value, date },
  })

  revalidateTag("leaderboard-data", "default")
  revalidatePath("/admin/entries")
  revalidatePath("/")
  revalidatePath(`/leaderboard/${leaderboardId}`)
  return { success: true }
}

export async function updateEntry(entryId: number, formData: FormData): Promise<EntryActionResult> {
  if (!(await isAdmin())) return { success: false, error: "Forbidden" }

  const valueStr = formData.get("value") as string
  const dateStr = formData.get("date") as string

  const value = parseFloat(valueStr)
  if (isNaN(value) || value <= 0) return { success: false, error: "Enter a valid value greater than 0." }

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return { success: false, error: "Invalid date." }

  const entry = await prisma.pREntry.findUnique({ where: { id: entryId } })
  if (!entry) return { success: false, error: "Entry not found." }

  await prisma.pREntry.update({
    where: { id: entryId },
    data: { weightLbs: value, date },
  })

  revalidateTag("leaderboard-data", "default")
  revalidatePath("/admin/entries")
  revalidatePath("/")
  revalidatePath(`/leaderboard/${entry.leaderboardId}`)
  return { success: true }
}

export async function deleteEntry(entryId: number): Promise<EntryActionResult> {
  if (!(await isAdmin())) return { success: false, error: "Forbidden" }

  const entry = await prisma.pREntry.findUnique({ where: { id: entryId } })
  if (!entry) return { success: false, error: "Entry not found." }

  await prisma.pREntry.delete({ where: { id: entryId } })

  revalidateTag("leaderboard-data", "default")
  revalidatePath("/admin/entries")
  revalidatePath("/")
  revalidatePath(`/leaderboard/${entry.leaderboardId}`)
  return { success: true }
}
