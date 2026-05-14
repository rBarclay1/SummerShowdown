import Link from "next/link"
import { cn } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import {
  buildLeaderboardProgressData,
  computeRankings,
  formatGain,
  getCachedOverallRankings,
} from "@/lib/rankings"
import { formatValue } from "@/lib/format"
import LeaderboardProgressChart from "@/components/LeaderboardProgressChart"
import LiftProgressChart from "@/components/LiftProgressChart"
import OverallLeaderChart from "@/components/OverallLeaderChart"
import { auth } from "@clerk/nextjs/server"

export const dynamic = "force-dynamic"

export default async function ChartsPage({
  searchParams,
}: {
  searchParams: Promise<{ lift?: string; athlete?: string; tab?: string }>
}) {
  const { lift: liftParam, athlete: athleteParam, tab } = await searchParams
  const isCompare = tab === "compare"

  // ── Auth: find current user's athlete ──────────────────────────────────────
  const { userId } = await auth()
  const myAthlete = userId
    ? await prisma.athlete.findUnique({ where: { clerkId: userId }, select: { id: true } })
    : null

  // ── Overall rankings (used in Compare tab) ─────────────────────────────────
  const overallRankings = await getCachedOverallRankings()
  const overallChartData = overallRankings.map((r) => ({
    name: r.athlete.name,
    score: parseFloat(r.overallScore.toFixed(1)),
    rank: r.rank,
    onFire: r.onFire,
  }))

  // ── Lifts that have at least one entry ─────────────────────────────────────
  const liftsWithEntries = await prisma.lift.findMany({
    where: { entries: { some: {} } },
    orderBy: { name: "asc" },
  })

  if (liftsWithEntries.length === 0) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-lg font-semibold mb-2">No data yet</p>
        <p className="text-muted-foreground text-sm mb-6">
          Log some PRs to start seeing charts.
        </p>
        <Link
          href="/log"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium"
        >
          Log a PR
        </Link>
      </main>
    )
  }

  // ── Resolve selected lift ──────────────────────────────────────────────────
  const selectedLiftId = liftParam ? parseInt(liftParam) : liftsWithEntries[0].id
  const selectedLift = liftsWithEntries.find((l) => l.id === selectedLiftId) ?? liftsWithEntries[0]
  const isTimeTrial = selectedLift.type === "time_trial"

  // ── All entries for the selected lift ──────────────────────────────────────
  const entries = await prisma.pREntry.findMany({
    where: { liftId: selectedLift.id },
    include: { athlete: true, lift: true },
    orderBy: { date: "asc" },
  })

  // ── Compare tab: hero chart data ───────────────────────────────────────────
  const { chartData: heroData, athleteNames } = buildLeaderboardProgressData(
    entries,
    selectedLift.id
  )

  // ── My Progress tab: resolve athlete ───────────────────────────────────────
  const athleteMap = new Map<number, { id: number; name: string }>()
  for (const e of entries) {
    if (!athleteMap.has(e.athleteId)) athleteMap.set(e.athleteId, e.athlete)
  }
  const athletes = [...athleteMap.values()]

  // Default to logged-in user's athlete, fall back to first
  const defaultAthleteId = myAthlete?.id ?? athletes[0]?.id
  const selectedAthleteId = athleteParam ? parseInt(athleteParam) : defaultAthleteId
  const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId) ?? athletes[0] ?? null

  // ── Personal entries ───────────────────────────────────────────────────────
  const myEntries = entries
    .filter((e) => e.athleteId === selectedAthlete?.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const baseline = myEntries[0]?.weightLbs ?? null
  const currentPR =
    myEntries.length > 0
      ? isTimeTrial
        ? Math.min(...myEntries.map((e) => e.weightLbs))
        : Math.max(...myEntries.map((e) => e.weightLbs))
      : null
  const gainPct =
    baseline && currentPR
      ? isTimeTrial
        ? ((baseline - currentPR) / baseline) * 100
        : ((currentPR - baseline) / baseline) * 100
      : null

  // Deduplicate by date — take best per day
  const dateMap = new Map<string, number>()
  for (const e of myEntries) {
    const label = new Date(e.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    const existing = dateMap.get(label)
    const best = isTimeTrial
      ? Math.min(existing ?? Infinity, e.weightLbs)
      : Math.max(existing ?? 0, e.weightLbs)
    dateMap.set(label, best)
  }
  const personalChartData = Array.from(dateMap.entries()).map(([date, weight]) => ({
    date,
    weight,
  }))

  // ── Rank ───────────────────────────────────────────────────────────────────
  let rank: number | null = null
  if (selectedAthlete) {
    const leaderboard = await prisma.leaderboard.findFirst({
      where: { mainLiftId: selectedLift.id },
      include: { mainLift: true },
    })
    if (leaderboard) {
      const lbEntries = entries.filter((e) => e.leaderboardId === leaderboard.id)
      const rankings = computeRankings(leaderboard, lbEntries)
      rank = rankings.rankings.find((r) => r.athlete.id === selectedAthlete.id)?.rank ?? null
    }
  }

  // ── Shared lift pills (used in both tabs) ──────────────────────────────────
  const liftPills = (
    <div className="overflow-x-auto -mx-4 px-4 pb-1">
      <div className="flex gap-2 w-max">
        {liftsWithEntries.map((lift) => (
          <Link
            key={lift.id}
            href={`/charts?${isCompare ? "tab=compare&" : ""}lift=${lift.id}${!isCompare && selectedAthlete ? `&athlete=${selectedAthlete.id}` : ""}`}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-colors",
              lift.id === selectedLift.id
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 hover:text-foreground"
            )}
          >
            {lift.name}
          </Link>
        ))}
      </div>
    </div>
  )

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Charts</h1>
      </div>

      {/* ── Tab toggle ────────────────────────────────────────────────────── */}
      <div className="flex rounded-lg border border-white/10 overflow-hidden w-fit">
        <Link
          href={`/charts?lift=${selectedLift.id}${selectedAthlete ? `&athlete=${selectedAthlete.id}` : ""}`}
          className={cn(
            "px-5 py-2.5 text-sm font-medium transition-colors",
            !isCompare
              ? "bg-white/10 text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          My Progress
        </Link>
        <Link
          href={`/charts?tab=compare&lift=${selectedLift.id}`}
          className={cn(
            "px-5 py-2.5 text-sm font-medium transition-colors border-l border-white/10",
            isCompare
              ? "bg-white/10 text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          Compare
        </Link>
      </div>

      {isCompare ? (
        /* ── COMPARE TAB ──────────────────────────────────────────────────── */
        <div className="space-y-8">
          {/* Overall leaderboard */}
          <section className="glass-panel rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Overall Leaderboard</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Average % gain across all lifts
              </p>
            </div>
            <OverallLeaderChart data={overallChartData} />
          </section>

          {/* Lift picker */}
          {liftPills}

          {/* All-athletes progress */}
          <section className="glass-panel rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {selectedLift.name} — All Athletes
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                % gain from each athlete's personal baseline over time
              </p>
            </div>
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No entries logged for {selectedLift.name} yet.
              </p>
            ) : (
              <LeaderboardProgressChart
                chartData={heroData}
                athleteNames={athleteNames}
                mainLiftName={selectedLift.name}
                height={360}
              />
            )}
          </section>
        </div>
      ) : (
        /* ── MY PROGRESS TAB ──────────────────────────────────────────────── */
        <div className="space-y-8">
          {/* Lift picker */}
          {liftPills}

          {/* Athlete switcher (only when multiple athletes have logged this lift) */}
          {athletes.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {athletes.map((a) => (
                <Link
                  key={a.id}
                  href={`/charts?lift=${selectedLift.id}&athlete=${a.id}`}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    a.id === selectedAthlete?.id
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 hover:text-foreground"
                  )}
                >
                  {a.name}
                </Link>
              ))}
            </div>
          )}

          {!selectedAthlete || myEntries.length === 0 ? (
            <div className="glass-panel rounded-xl py-16 text-center text-muted-foreground text-sm">
              {selectedAthlete
                ? <>
                    <span className="text-foreground font-medium">{selectedAthlete.name}</span> hasn&apos;t logged {selectedLift.name} yet.
                  </>
                : "No entries logged for this lift yet."}
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Current PR" value={formatValue(currentPR!, selectedLift.type)} />
                <StatCard label="Baseline" value={formatValue(baseline!, selectedLift.type)} />
                <StatCard
                  label="Total Gain"
                  value={gainPct != null ? formatGain(gainPct) : "—"}
                  highlight={gainPct != null && gainPct >= 0}
                />
                <StatCard label="Rank" value={rank != null ? `#${rank}` : "—"} />
              </div>

              {/* Personal chart */}
              <div className="glass-panel rounded-xl p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-white">
                    {selectedAthlete.name} · {selectedLift.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dashed line marks your starting baseline
                  </p>
                </div>
                <LiftProgressChart
                  data={personalChartData}
                  baseline={baseline!}
                  activityType={selectedLift.type}
                  color="#10b981"
                  height={260}
                />
              </div>
            </>
          )}
        </div>
      )}
    </main>
  )
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="glass-panel rounded-xl px-4 py-4 space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("text-xl font-bold", highlight ? "text-emerald-400" : "text-white")}>
        {value}
      </p>
    </div>
  )
}
