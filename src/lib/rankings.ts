import { prisma } from "./prisma"

export type AthleteRanking = {
  rank: number
  athlete: { id: number; name: string }
  percentGain: number
  baseline: number
  current: number
  onFire: boolean
}

export type OverallAthleteRanking = {
  rank: number
  athlete: { id: number; name: string }
  overallScore: number
  liftCount: number
  onFire: boolean
}

export type WeeklyWinner = {
  athlete: { id: number; name: string }
  liftName: string
  weekGain: number
}

export type LeaderboardWithRankings = {
  id: number
  name: string
  endDate: Date | null
  mainLift: { id: number; name: string }
  rankings: AthleteRanking[]
}

export type MonthlyImprovedRanking = {
  rank: number
  athlete: { id: number; name: string }
  monthScore: number
  liftCount: number
  onFire: boolean
}

export function computeRankings(
  leaderboard: {
    id: number
    name: string
    mainLiftId: number
    endDate: Date | null
    mainLift: { id: number; name: string }
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
  // Group entries by athleteId
  const grouped = new Map<number, { athlete: { id: number; name: string }; entries: typeof entries }>()
  for (const entry of entries) {
    if (!grouped.has(entry.athleteId)) {
      grouped.set(entry.athleteId, { athlete: entry.athlete, entries: [] })
    }
    grouped.get(entry.athleteId)!.entries.push(entry)
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const rankings: Omit<AthleteRanking, "rank">[] = []

  for (const { athlete, entries: athleteEntries } of grouped.values()) {
    const sorted = [...athleteEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    const baseline = sorted[0].weightLbs
    const current = Math.max(...athleteEntries.map((e) => e.weightLbs))
    const percentGain = baseline === 0 ? 0 : ((current - baseline) / baseline) * 100

    const recentMax = Math.max(
      ...athleteEntries
        .filter((e) => new Date(e.date) >= sevenDaysAgo)
        .map((e) => e.weightLbs),
      -Infinity
    )
    const onFire = recentMax >= current

    rankings.push({ athlete, percentGain, baseline, current, onFire })
  }

  rankings.sort((a, b) => b.percentGain - a.percentGain)

  return {
    id: leaderboard.id,
    name: leaderboard.name,
    endDate: leaderboard.endDate,
    mainLift: leaderboard.mainLift,
    rankings: rankings.map((r, i) => ({ ...r, rank: i + 1 })),
  }
}

export async function getLeaderboardRankings(
  leaderboardId: number
): Promise<LeaderboardWithRankings | null> {
  const leaderboard = await prisma.leaderboard.findUnique({
    where: { id: leaderboardId },
    include: { mainLift: true },
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
    include: { mainLift: true },
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

export async function getOverallRankings(): Promise<OverallAthleteRanking[]> {
  const entries = await prisma.pREntry.findMany({
    include: { athlete: true, lift: true },
    orderBy: { date: "asc" },
  })

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Group by (athleteId, liftId) globally across all leaderboards
  const grouped = new Map<string, typeof entries>()
  for (const entry of entries) {
    const key = `${entry.athleteId}-${entry.liftId}`
    const existing = grouped.get(key) ?? []
    existing.push(entry)
    grouped.set(key, existing)
  }

  const athleteMap = new Map<
    number,
    { athlete: { id: number; name: string }; gains: number[]; onFire: boolean }
  >()

  for (const [, groupEntries] of grouped) {
    const sorted = [...groupEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    const baseline = sorted[0].weightLbs
    const current = Math.max(...groupEntries.map((e) => e.weightLbs))
    const percentGain = baseline === 0 ? 0 : ((current - baseline) / baseline) * 100

    const recentMax = Math.max(
      ...groupEntries
        .filter((e) => new Date(e.date) >= sevenDaysAgo)
        .map((e) => e.weightLbs),
      -Infinity
    )
    const liftOnFire = recentMax >= current

    const { athlete } = sorted[0]
    if (!athleteMap.has(athlete.id)) {
      athleteMap.set(athlete.id, { athlete, gains: [], onFire: false })
    }
    const athleteData = athleteMap.get(athlete.id)!
    athleteData.gains.push(percentGain)
    if (liftOnFire) athleteData.onFire = true
  }

  const rankings: OverallAthleteRanking[] = []
  for (const { athlete, gains, onFire } of athleteMap.values()) {
    const overallScore = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / gains.length : 0
    rankings.push({ rank: 0, athlete, overallScore, liftCount: gains.length, onFire })
  }

  rankings.sort((a, b) => b.overallScore - a.overallScore)
  rankings.forEach((r, i) => (r.rank = i + 1))

  return rankings
}

export async function getWeeklyWinner(): Promise<WeeklyWinner | null> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const entries = await prisma.pREntry.findMany({
    include: { athlete: true, lift: true },
    orderBy: { date: "asc" },
  })

  const grouped = new Map<string, typeof entries>()
  for (const entry of entries) {
    const key = `${entry.athleteId}-${entry.liftId}`
    const existing = grouped.get(key) ?? []
    existing.push(entry)
    grouped.set(key, existing)
  }

  let best: WeeklyWinner | null = null

  for (const [, groupEntries] of grouped) {
    const before = groupEntries.filter((e) => new Date(e.date) < sevenDaysAgo)
    const recent = groupEntries.filter((e) => new Date(e.date) >= sevenDaysAgo)

    if (before.length === 0 || recent.length === 0) continue

    const prevBest = Math.max(...before.map((e) => e.weightLbs))
    const recentBest = Math.max(...recent.map((e) => e.weightLbs))

    if (recentBest <= prevBest) continue

    const weekGain = ((recentBest - prevBest) / prevBest) * 100

    if (!best || weekGain > best.weekGain) {
      const { athlete, lift } = groupEntries[0]
      best = { athlete, liftName: lift.name, weekGain }
    }
  }

  return best
}

/**
 * Builds time-series progress data for a leaderboard (single lift).
 */
export function buildLeaderboardProgressData(
  entries: {
    athleteId: number
    liftId: number
    weightLbs: number
    date: Date
    athlete: { id: number; name: string }
  }[],
  mainLiftId: number
): { chartData: Record<string, string | number>[]; athleteNames: string[] } {
  const mainEntries = entries
    .filter((e) => e.liftId === mainLiftId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  if (mainEntries.length === 0) return { chartData: [], athleteNames: [] }

  const baselines = new Map<number, number>()
  const runningMax = new Map<number, number>()
  const athleteNameMap = new Map<number, string>()

  for (const e of mainEntries) {
    if (!baselines.has(e.athleteId)) {
      baselines.set(e.athleteId, e.weightLbs)
      runningMax.set(e.athleteId, e.weightLbs)
      athleteNameMap.set(e.athleteId, e.athlete.name)
    }
  }

  const dateLabels: string[] = []
  const seenDates = new Set<string>()
  for (const e of mainEntries) {
    const label = new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    if (!seenDates.has(label)) {
      seenDates.add(label)
      dateLabels.push(label)
    }
  }

  const chartData: Record<string, string | number>[] = []

  for (const dateLabel of dateLabels) {
    const dayEntries = mainEntries.filter(
      (e) =>
        new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) ===
        dateLabel
    )

    const point: Record<string, string | number> = { date: dateLabel }

    for (const e of dayEntries) {
      const prev = runningMax.get(e.athleteId) ?? e.weightLbs
      const newMax = Math.max(prev, e.weightLbs)
      runningMax.set(e.athleteId, newMax)

      const baseline = baselines.get(e.athleteId)!
      const gain = baseline !== 0 ? ((newMax - baseline) / baseline) * 100 : 0
      point[e.athlete.name] = parseFloat(gain.toFixed(1))
    }

    chartData.push(point)
  }

  return {
    chartData,
    athleteNames: Array.from(athleteNameMap.values()),
  }
}

/** Returns positive days remaining, 0 if today, negative if past. */
export function daysRemaining(endDate: Date | null): number | null {
  if (!endDate) return null
  return Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export async function getMostImprovedThisMonth(): Promise<MonthlyImprovedRanking[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const entries = await prisma.pREntry.findMany({
    include: { athlete: true, lift: true },
    orderBy: { date: "asc" },
  })

  const grouped = new Map<string, typeof entries>()
  for (const entry of entries) {
    const key = `${entry.athleteId}-${entry.liftId}`
    const existing = grouped.get(key) ?? []
    existing.push(entry)
    grouped.set(key, existing)
  }

  const athleteMap = new Map<
    number,
    { athlete: { id: number; name: string }; monthGains: number[]; onFire: boolean }
  >()

  for (const [, groupEntries] of grouped) {
    const before = groupEntries.filter((e) => new Date(e.date) < thirtyDaysAgo)
    const recent = groupEntries.filter((e) => new Date(e.date) >= thirtyDaysAgo)

    if (before.length === 0 || recent.length === 0) continue

    const prevBest = Math.max(...before.map((e) => e.weightLbs))
    const recentBest = Math.max(...recent.map((e) => e.weightLbs))
    const monthGain = ((recentBest - prevBest) / prevBest) * 100

    const recentMax = Math.max(...recent.map((e) => e.weightLbs), -Infinity)
    const recentFireEntries = groupEntries.filter((e) => new Date(e.date) >= sevenDaysAgo)
    const fireMax =
      recentFireEntries.length > 0 ? Math.max(...recentFireEntries.map((e) => e.weightLbs)) : -Infinity
    const liftOnFire = fireMax >= recentMax && recentFireEntries.length > 0

    const { athlete } = groupEntries[0]
    if (!athleteMap.has(athlete.id)) {
      athleteMap.set(athlete.id, { athlete, monthGains: [], onFire: false })
    }
    const athleteData = athleteMap.get(athlete.id)!
    athleteData.monthGains.push(monthGain)
    if (liftOnFire) athleteData.onFire = true
  }

  const rankings: MonthlyImprovedRanking[] = []
  for (const { athlete, monthGains, onFire } of athleteMap.values()) {
    const monthScore = monthGains.reduce((a, b) => a + b, 0) / monthGains.length
    rankings.push({ rank: 0, athlete, monthScore, liftCount: monthGains.length, onFire })
  }

  rankings.sort((a, b) => b.monthScore - a.monthScore)
  rankings.forEach((r, i) => (r.rank = i + 1))

  return rankings
}
