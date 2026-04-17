"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { computeRankings } from "@/lib/rankings"
import { sendSurpassNotifications, type SurpassEvent } from "@/lib/notifications"
import { auth, currentUser } from "@clerk/nextjs/server"

export type LogPRResult =
  | { success: true; entry: { id: number; weightLbs: number }; isBaseline: boolean }
  | { success: false; error: string }

export async function logPR(formData: FormData): Promise<LogPRResult> {
  try {
    const { userId } = await auth()
    if (!userId) return { success: false, error: "Not authenticated." }

    const clerkUser = await currentUser()
    const athleteName =
      [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim() ||
      clerkUser?.username ||
      ""
    if (!athleteName) return { success: false, error: "Your profile needs a name set in Clerk." }

    const leaderboardId = parseInt(formData.get("leaderboardId") as string)
    const liftId = parseInt(formData.get("liftId") as string)
    const weightRaw = parseFloat(formData.get("weight") as string)
    const unit = formData.get("unit") as "lbs" | "kg"
    const dateStr = formData.get("date") as string

    if (isNaN(leaderboardId) || isNaN(liftId) || isNaN(weightRaw)) {
      return { success: false, error: "All fields are required." }
    }

    const weightLbs = unit === "kg" ? weightRaw * 2.20462 : weightRaw
    const date = dateStr ? new Date(dateStr) : new Date()

    const leaderboard = await prisma.leaderboard.findUnique({
      where: { id: leaderboardId },
      include: { mainLift: true },
    })
    if (!leaderboard) return { success: false, error: "Leaderboard not found." }

    // Resolve or create athlete linked to this Clerk user
    let athlete = await prisma.athlete.findUnique({ where: { clerkId: userId } })
    if (!athlete) {
      // Try to claim an existing athlete record with the same name (migration path)
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
        // Name taken by a different Clerk user — append a suffix
        athlete = await prisma.athlete.create({
          data: { name: `${athleteName} (${userId.slice(-4)})`, clerkId: userId },
        })
      }
    }

    // Check if this is the first entry (baseline)
    const existing = await prisma.pREntry.findFirst({
      where: { athleteId: athlete.id, liftId, leaderboardId },
    })
    const isBaseline = !existing

    // Snapshot rankings before the new entry (skip on baseline — no one to surpass yet)
    let ranksBefore: Map<number, number> | null = null
    let submitterRankBefore = Infinity

    if (!isBaseline) {
      const entriesBefore = await prisma.pREntry.findMany({
        where: { leaderboardId },
        include: { athlete: true, lift: true },
        orderBy: { date: "asc" },
      })
      const beforeRankings = computeRankings(leaderboard, entriesBefore)
      ranksBefore = new Map(beforeRankings.rankings.map((r) => [r.athlete.id, r.rank]))
      submitterRankBefore = ranksBefore.get(athlete.id) ?? Infinity
    }

    // Create the entry
    const entry = await prisma.pREntry.create({
      data: { athleteId: athlete.id, liftId, leaderboardId, weightLbs, date },
    })

    // Detect surpasses — only when the submitter could have improved their rank
    if (ranksBefore !== null) {
      const entriesAfter = await prisma.pREntry.findMany({
        where: { leaderboardId },
        include: { athlete: true, lift: true },
        orderBy: { date: "asc" },
      })
      const afterRankings = computeRankings(leaderboard, entriesAfter)
      const ranksAfter = new Map(afterRankings.rankings.map((r) => [r.athlete.id, r.rank]))
      const submitterRankAfter = ranksAfter.get(athlete.id) ?? Infinity

      if (submitterRankAfter < submitterRankBefore) {
        const submitterGain =
          afterRankings.rankings.find((r) => r.athlete.id === athlete!.id)?.percentGain ?? 0

        const events: SurpassEvent[] = []

        for (const [athleteId, rankBefore] of ranksBefore.entries()) {
          if (athleteId === athlete.id) continue
          const rankAfter = ranksAfter.get(athleteId) ?? rankBefore

          if (rankBefore < submitterRankBefore && rankAfter > submitterRankAfter) {
            const surpassedRanking = afterRankings.rankings.find((r) => r.athlete.id === athleteId)
            const surpassedGain = surpassedRanking?.percentGain ?? 0

            events.push({
              surpassedAthleteId: athleteId,
              surpassedAthleteName: surpassedRanking?.athlete.name ?? "",
              surpassedByName: athlete.name,
              leaderboardName: leaderboard.name,
              liftName: leaderboard.mainLift.name,
              gainDiff: submitterGain - surpassedGain,
            })
          }
        }

        if (events.length > 0) {
          sendSurpassNotifications(events).catch(console.error)
        }
      }
    }

    revalidatePath("/")
    revalidatePath(`/leaderboard/${leaderboardId}`)
    revalidatePath(`/athlete/${athlete.id}`)

    return { success: true, entry: { id: entry.id, weightLbs: entry.weightLbs }, isBaseline }
  } catch (e) {
    console.error(e)
    return { success: false, error: "Failed to log PR. Please try again." }
  }
}
