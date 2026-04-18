"use server"

import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/admin"
import { revalidatePath } from "next/cache"

export type LiftActionResult = { success: true } | { success: false; error: string }

// ── Add ──────────────────────────────────────────────────────────────────────

export async function addLift(formData: FormData): Promise<LiftActionResult> {
  if (!(await isAdmin())) return { success: false, error: "Forbidden" }

  const name = (formData.get("name") as string).trim()
  if (!name) return { success: false, error: "Activity name cannot be blank." }
  if (name.length > 60) return { success: false, error: "Activity name must be 60 characters or fewer." }

  const type = (formData.get("type") as string) === "time_trial" ? "time_trial" : "lift"
  const unit = type === "time_trial" ? "seconds" : "lbs"

  const allLifts = await prisma.lift.findMany({ select: { id: true, name: true } })
  const existing = allLifts.find((l) => l.name.toLowerCase() === name.toLowerCase())
  if (existing) return { success: false, error: `"${existing.name}" already exists.` }

  await prisma.lift.create({ data: { name, type, unit } })
  revalidatePath("/admin/lifts")
  revalidatePath("/leaderboard/new")
  return { success: true }
}

// ── Rename ────────────────────────────────────────────────────────────────────

export async function renameLift(
  liftId: number,
  formData: FormData
): Promise<LiftActionResult> {
  if (!(await isAdmin())) return { success: false, error: "Forbidden" }

  const name = (formData.get("name") as string).trim()
  if (!name) return { success: false, error: "Activity name cannot be blank." }
  if (name.length > 60) return { success: false, error: "Name must be 60 characters or fewer." }

  // Duplicate check — exclude the lift being renamed
  const allLifts = await prisma.lift.findMany({ select: { id: true, name: true } })
  const conflict = allLifts.find(
    (l) => l.name.toLowerCase() === name.toLowerCase() && l.id !== liftId
  )
  if (conflict) return { success: false, error: `"${conflict.name}" already exists.` }

  await prisma.lift.update({ where: { id: liftId }, data: { name } })

  revalidatePath("/admin/lifts")
  revalidatePath("/")
  revalidatePath("/leaderboard/new")
  return { success: true }
}

// ── Delete ────────────────────────────────────────────────────────────────────

export type LiftUsage = {
  leaderboardCount: number
  entryCount: number
}

export async function getLiftUsage(liftId: number): Promise<LiftUsage | null> {
  if (!(await isAdmin())) return null

  const [leaderboardCount, entryCount] = await Promise.all([
    prisma.leaderboard.count({ where: { mainLiftId: liftId } }),
    prisma.pREntry.count({ where: { liftId } }),
  ])
  return { leaderboardCount, entryCount }
}

export async function deleteLift(
  liftId: number,
  /** Must be true when the activity has associated data — forces explicit opt-in */
  confirmed: boolean
): Promise<LiftActionResult> {
  if (!(await isAdmin())) return { success: false, error: "Forbidden" }

  const [leaderboardCount, entryCount] = await Promise.all([
    prisma.leaderboard.count({ where: { mainLiftId: liftId } }),
    prisma.pREntry.count({ where: { liftId } }),
  ])

  const hasData = leaderboardCount > 0 || entryCount > 0
  if (hasData && !confirmed) {
    return {
      success: false,
      error: `This activity is used by ${leaderboardCount} leaderboard${leaderboardCount !== 1 ? "s" : ""} and ${entryCount} PR entr${entryCount !== 1 ? "ies" : "y"}. Confirm deletion to proceed.`,
    }
  }

  // Cascade manually:
  // 1. Delete all PR entries for this activity (across all leaderboards)
  await prisma.pREntry.deleteMany({ where: { liftId } })

  // 2. For each leaderboard that uses this activity as its main lift:
  //    delete any remaining entries tied to that board, then the board itself
  const boards = await prisma.leaderboard.findMany({ where: { mainLiftId: liftId } })
  for (const board of boards) {
    await prisma.pREntry.deleteMany({ where: { leaderboardId: board.id } })
    await prisma.leaderboard.delete({ where: { id: board.id } })
  }

  // 3. Delete the activity
  await prisma.lift.delete({ where: { id: liftId } })

  revalidatePath("/admin/lifts")
  revalidatePath("/")
  revalidatePath("/leaderboard/new")
  return { success: true }
}
