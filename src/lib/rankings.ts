import { prisma } from "./prisma"

export type LiftStat = {
  liftId: number
  liftName: string
  baseline: number
  current: number
  percentGain: number
}

export type AthleteRanking = {
  rank: number
  athlete: { id: number; name: string }
  liftStats: Record<number, LiftStat>
  categoryScore: number
  mainLiftGain: number | null
  liftCount: number
}

export type LeaderboardWithRankings = {
  id: number
  name: string
  mainLift: { id: number; name: string }
  lifts: { id: number; name: string }[]
  rankings: AthleteRanking[]
}

export function computeRankings(
  leaderboard: {
    id: number
    name: string
    mainLiftId: number
    mainLift: { id: number; name: string }
    leaderboardLifts: { lift: { id: number; name: string } }[]
  },
  entries: {
    athleteId: number
    liftId: number
    weightLbs: number
    date: Date
    athlete: { id: number; name: string }
    lift: { id: number; name: string }
  }[]
): LeaderboardWithRankings {
  // Group entries by athleteId + liftId
  const grouped = new Map<string, typeof entries>()
  for (const entry of entries) {
    const key = `${entry.athleteId}-${entry.liftId}`
    const existing = grouped.get(key) ?? []
    existing.push(entry)
    grouped.set(key, existing)
  }

  // Build per-athlete stats
  const athleteMap = new Map<
    number,
    { athlete: { id: number; name: string }; liftStats: Record<number, LiftStat> }
  >()

  for (const [, groupEntries] of grouped) {
    const sorted = [...groupEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    const baseline = sorted[0].weightLbs
    const current = Math.max(...groupEntries.map((e) => e.weightLbs))
    const percentGain = baseline === 0 ? 0 : ((current - baseline) / baseline) * 100

    const { athlete, lift } = sorted[0]
    if (!athleteMap.has(athlete.id)) {
      athleteMap.set(athlete.id, { athlete, liftStats: {} })
    }
    athleteMap.get(athlete.id)!.liftStats[lift.id] = {
      liftId: lift.id,
      liftName: lift.name,
      baseline,
      current,
      percentGain,
    }
  }

  // Build rankings
  const rankings: Omit<AthleteRanking, "rank">[] = []
  for (const { athlete, liftStats } of athleteMap.values()) {
    const gains = Object.values(liftStats).map((s) => s.percentGain)
    const categoryScore = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / gains.length : 0
    const mainLiftGain = liftStats[leaderboard.mainLiftId]?.percentGain ?? null
    rankings.push({
      athlete,
      liftStats,
      categoryScore,
      mainLiftGain,
      liftCount: gains.length,
    })
  }

  rankings.sort((a, b) => {
    const mainA = a.mainLiftGain ?? -Infinity
    const mainB = b.mainLiftGain ?? -Infinity
    if (mainB !== mainA) return mainB - mainA
    if (b.categoryScore !== a.categoryScore) return b.categoryScore - a.categoryScore
    return b.liftCount - a.liftCount
  })

  return {
    id: leaderboard.id,
    name: leaderboard.name,
    mainLift: leaderboard.mainLift,
    lifts: leaderboard.leaderboardLifts.map((ll) => ll.lift),
    rankings: rankings.map((r, i) => ({ ...r, rank: i + 1 })),
  }
}

export async function getLeaderboardRankings(
  leaderboardId: number
): Promise<LeaderboardWithRankings | null> {
  const leaderboard = await prisma.leaderboard.findUnique({
    where: { id: leaderboardId },
    include: {
      mainLift: true,
      leaderboardLifts: { include: { lift: true } },
    },
  })
  if (!leaderboard) return null

  const entries = await prisma.pREntry.findMany({
    where: { leaderboardId },
    include: { athlete: true, lift: true },
    orderBy: { date: "asc" },
  })

  return computeRankings(leaderboard, entries)
}

export async function getAllLeaderboardRankings(): Promise<LeaderboardWithRankings[]> {
  const leaderboards = await prisma.leaderboard.findMany({
    include: {
      mainLift: true,
      leaderboardLifts: { include: { lift: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  const results = await Promise.all(leaderboards.map((lb) => getLeaderboardRankings(lb.id)))
  return results.filter(Boolean) as LeaderboardWithRankings[]
}

export function formatGain(gain: number | null): string {
  if (gain === null) return "—"
  const sign = gain >= 0 ? "+" : ""
  return `${sign}${gain.toFixed(1)}%`
}
