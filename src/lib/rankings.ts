import { prisma } from "./prisma"
export { formatTime, formatValue, formatGain } from "./format"

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
  mainLift: { id: number; name: string; type: string; unit: string }
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
    mainLift: { id: number; name: string; type: string; unit: string }
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
  const isTimeTrial = leaderboard.mainLift.type === "time_trial"

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

    const recentEntries = athleteEntries.filter((e) => new Date(e.date) >= sevenDaysAgo)

    let current: number
    let percentGain: number
    let onFire: boolean

    if (isTimeTrial) {
      // Lower is better: current = fastest (min), gain = (baseline - current) / baseline * 100
      current = Math.min(...athleteEntries.map((e) => e.weightLbs))
      percentGain = baseline === 0 ? 0 : ((baseline - current) / baseline) * 100
      const recentMin = recentEntries.length > 0
        ? Math.min(...recentEntries.map((e) => e.weightLbs))
        : Infinity
      onFire = recentMin <= current
    } else {
      current = Math.max(...athleteEntries.map((e) => e.weightLbs))
      percentGain = baseline === 0 ? 0 : ((current - baseline) / baseline) * 100
      const recentMax = recentEntries.length > 0
        ? Math.max(...recentEntries.map((e) => e.weightLbs))
        : -Infinity
      onFire = recentMax >= current
    }

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
    const isTimeTrial = groupEntries[0].lift.type === "time_trial"
    const sorted = [...groupEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    const baseline = sorted[0].weightLbs

    const recentEntries = groupEntries.filter((e) => new Date(e.date) >= sevenDaysAgo)

    let percentGain: number
    let liftOnFire: boolean

    if (isTimeTrial) {
      const current = Math.min(...groupEntries.map((e) => e.weightLbs))
      percentGain = baseline === 0 ? 0 : ((baseline - current) / baseline) * 100
      const recentMin = recentEntries.length > 0
        ? Math.min(...recentEntries.map((e) => e.weightLbs))
        : Infinity
      liftOnFire = recentMin <= current
    } else {
      const current = Math.max(...groupEntries.map((e) => e.weightLbs))
      percentGain = baseline === 0 ? 0 : ((current - baseline) / baseline) * 100
      const recentMax = recentEntries.length > 0
        ? Math.max(...recentEntries.map((e) => e.weightLbs))
        : -Infinity
      liftOnFire = recentMax >= current
    }

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
    const isTimeTrial = groupEntries[0].lift.type === "time_trial"
    const before = groupEntries.filter((e) => new Date(e.date) < sevenDaysAgo)
    const recent = groupEntries.filter((e) => new Date(e.date) >= sevenDaysAgo)

    if (before.length === 0 || recent.length === 0) continue

    let weekGain: number

    if (isTimeTrial) {
      const prevBest = Math.min(...before.map((e) => e.weightLbs))
      const recentBest = Math.min(...recent.map((e) => e.weightLbs))
      if (recentBest >= prevBest) continue
      weekGain = ((prevBest - recentBest) / prevBest) * 100
    } else {
      const prevBest = Math.max(...before.map((e) => e.weightLbs))
      const recentBest = Math.max(...recent.map((e) => e.weightLbs))
      if (recentBest <= prevBest) continue
      weekGain = ((recentBest - prevBest) / prevBest) * 100
    }

    if (!best || weekGain > best.weekGain) {
      const { athlete, lift } = groupEntries[0]
      best = { athlete, liftName: lift.name, weekGain }
    }
  }

  return best
}

/**
 * Builds time-series % gain progress data for a leaderboard.
 */
export function buildLeaderboardProgressData(
  entries: {
    athleteId: number
    liftId: number
    weightLbs: number
    date: Date
    athlete: { id: number; name: string }
    lift: { id: number; name: string; type: string }
  }[],
  mainLiftId: number
): { chartData: Record<string, string | number>[]; athleteNames: string[] } {
  const mainEntries = entries
    .filter((e) => e.liftId === mainLiftId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  if (mainEntries.length === 0) return { chartData: [], athleteNames: [] }

  const isTimeTrial = mainEntries[0].lift.type === "time_trial"

  const baselines = new Map<number, number>()
  const runningBest = new Map<number, number>()
  const athleteNameMap = new Map<number, string>()

  for (const e of mainEntries) {
    if (!baselines.has(e.athleteId)) {
      baselines.set(e.athleteId, e.weightLbs)
      runningBest.set(e.athleteId, e.weightLbs)
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
      const prev = runningBest.get(e.athleteId) ?? e.weightLbs
      const newBest = isTimeTrial
        ? Math.min(prev, e.weightLbs)
        : Math.max(prev, e.weightLbs)
      runningBest.set(e.athleteId, newBest)

      const baseline = baselines.get(e.athleteId)!
      const gain = baseline !== 0
        ? isTimeTrial
          ? ((baseline - newBest) / baseline) * 100
          : ((newBest - baseline) / baseline) * 100
        : 0
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
    const isTimeTrial = groupEntries[0].lift.type === "time_trial"
    const before = groupEntries.filter((e) => new Date(e.date) < thirtyDaysAgo)
    const recent = groupEntries.filter((e) => new Date(e.date) >= thirtyDaysAgo)

    if (before.length === 0 || recent.length === 0) continue

    let monthGain: number
    let liftOnFire: boolean

    if (isTimeTrial) {
      const prevBest = Math.min(...before.map((e) => e.weightLbs))
      const recentBest = Math.min(...recent.map((e) => e.weightLbs))
      monthGain = ((prevBest - recentBest) / prevBest) * 100

      const recentFireEntries = groupEntries.filter((e) => new Date(e.date) >= sevenDaysAgo)
      const allTimeMin = Math.min(...groupEntries.map((e) => e.weightLbs))
      const fireMin = recentFireEntries.length > 0
        ? Math.min(...recentFireEntries.map((e) => e.weightLbs))
        : Infinity
      liftOnFire = fireMin <= allTimeMin && recentFireEntries.length > 0
    } else {
      const prevBest = Math.max(...before.map((e) => e.weightLbs))
      const recentBest = Math.max(...recent.map((e) => e.weightLbs))
      monthGain = ((recentBest - prevBest) / prevBest) * 100

      const recentMax = Math.max(...recent.map((e) => e.weightLbs), -Infinity)
      const recentFireEntries = groupEntries.filter((e) => new Date(e.date) >= sevenDaysAgo)
      const fireMax = recentFireEntries.length > 0
        ? Math.max(...recentFireEntries.map((e) => e.weightLbs))
        : -Infinity
      liftOnFire = fireMax >= recentMax && recentFireEntries.length > 0
    }

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
