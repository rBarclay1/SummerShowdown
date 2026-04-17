"use server"

import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/admin"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export type ActionResult = { success: true } | { success: false; error: string }

export async function deleteLeaderboard(leaderboardId: number): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "Forbidden" }

  const exists = await prisma.leaderboard.findUnique({ where: { id: leaderboardId } })
  if (!exists) return { success: false, error: "Leaderboard not found." }

  // Cascade-delete entries then the board itself
  await prisma.pREntry.deleteMany({ where: { leaderboardId } })
  await prisma.leaderboard.delete({ where: { id: leaderboardId } })

  revalidatePath("/")
  redirect("/")
}

export async function updateLeaderboard(
  leaderboardId: number,
  formData: FormData
): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "Forbidden" }

  const liftIdRaw = formData.get("liftId") as string
  const liftId = parseInt(liftIdRaw)
  const endDateStr = (formData.get("endDate") as string | null)?.trim() || null
  const endDate = endDateStr ? new Date(endDateStr) : null

  if (isNaN(liftId)) return { success: false, error: "Lift is required." }

  // Reject if another board already tracks this lift (exclude current board)
  const conflict = await prisma.leaderboard.findFirst({
    where: { mainLiftId: liftId, id: { not: leaderboardId } },
    include: { mainLift: true },
  })
  if (conflict) {
    return {
      success: false,
      error: `${conflict.mainLift.name} is already tracked by another leaderboard.`,
    }
  }

  const lift = await prisma.lift.findUnique({ where: { id: liftId } })
  if (!lift) return { success: false, error: "Lift not found." }

  await prisma.leaderboard.update({
    where: { id: leaderboardId },
    data: { name: lift.name, mainLiftId: liftId, endDate },
  })

  revalidatePath("/")
  revalidatePath(`/leaderboard/${leaderboardId}`)
  return { success: true }
}
