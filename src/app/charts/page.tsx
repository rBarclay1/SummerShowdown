import Link from "next/link"
import { cn } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { buildLeaderboardProgressData, computeRankings, formatGain, getOverallRankings } from "@/lib/rankings"
import LeaderboardProgressChart from "@/components/LeaderboardProgressChart"
import LiftProgressChart from "@/components/LiftProgressChart"
import OverallLeaderChart from "@/components/OverallLeaderChart"

export const dynamic = "force-dynamic"

export default async function ChartsPage({
  searchParams,
}: {
  searchParams: Promise<{ lift?: string; athlete?: string }>
}) {
  const { lift: liftParam, athlete: athleteParam } = await searchParams

  // ── Overall rankings ─────────────────────────────────────────────────────────
  const overallRankings = await getOverallRankings()
  const overallChartData = overallRankings.map((r) => ({
    name: r.athlete.name,
    score: parseFloat(r.overallScore.toFixed(1)),
    rank: r.rank,
    onFire: r.onFire,
  }))

  // ── Lifts that have at least one entry ──────────────────────────────────────
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

  // ── Resolve selected lift ────────────────────────────────────────────────────
  const selectedLiftId = liftParam ? parseInt(liftParam) : liftsWithEntries[0].id
  const selectedLift =
    liftsWithEntries.find((l) => l.id === selectedLiftId) ?? liftsWithEntries[0]

  // ── All entries for the selected lift ───────────────────────────────────────
  const entries = await prisma.pREntry.findMany({
    where: { liftId: selectedLift.id },
    include: { athlete: true, lift: true },
    orderBy: { date: "asc" },
  })

  // ── Hero chart data (all athletes, % gain) ──────────────────────────────────
  const { chartData: heroData, athleteNames } = buildLeaderboardProgressData(
    entries,
    selectedLift.id
  )

  // ── Distinct athletes who've logged this lift ────────────────────────────────
  const athleteMap = new Map<number, { id: number; name: string }>()
  for (const e of entries) {
    if (!athleteMap.has(e.athleteId)) athleteMap.set(e.athleteId, e.athlete)
  }
  const athletes = [...athleteMap.values()]

  // ── Resolve selected athlete ─────────────────────────────────────────────────
  const selectedAthleteId = athleteParam ? parseInt(athleteParam) : athletes[0]?.id
  const selectedAthlete =
    athletes.find((a) => a.id === selectedAthleteId) ?? athletes[0] ?? null

  // ── Personal entries for selected athlete ────────────────────────────────────
  const myEntries = entries
    .filter((e) => e.athleteId === selectedAthlete?.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const baseline = myEntries[0]?.weightLbs ?? null
  const currentPR =
    myEntries.length > 0 ? Math.max(...myEntries.map((e) => e.weightLbs)) : null
  const gainPct =
    baseline && currentPR ? ((currentPR - baseline) / baseline) * 100 : null

  // Deduplicate by date — take max weight per day
  const dateMap = new Map<string, number>()
  for (const e of myEntries) {
    const label = new Date(e.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    dateMap.set(label, Math.max(dateMap.get(label) ?? 0, e.weightLbs))
  }
  const personalChartData = Array.from(dateMap.entries()).map(([date, weight]) => ({
    date,
    weight,
  }))

  // ── Rank on leaderboard that uses this lift ──────────────────────────────────
  let rank: number | null = null
  if (selectedAthlete) {
    const leaderboard = await prisma.leaderboard.findFirst({
      where: { mainLiftId: selectedLift.id },
      include: { mainLift: true },
    })
    if (leaderboard) {
      const lbEntries = await prisma.pREntry.findMany({
        where: { leaderboardId: leaderboard.id },
        include: { athlete: true, lift: true },
        orderBy: { date: "asc" },
      })
      const rankings = computeRankings(leaderboard, lbEntries)
      rank =
        rankings.rankings.find((r) => r.athlete.id === selectedAthlete.id)?.rank ??
        null
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Charts</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Progress and rankings by lift
        </p>
      </div>

      {/* ── Overall leaderboard chart ───────────────────────────────────────── */}
      <section className="glass-panel rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Overall Leaderboard</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Average % gain across all lifts — your all-around ranking
          </p>
        </div>
        <OverallLeaderChart data={overallChartData} />
      </section>

      {/* ── Lift selector pills ──────────────────────────────────────────────── */}
      <div className="overflow-x-auto -mx-4 px-4 pb-1">
        <div className="flex gap-2 w-max">
          {liftsWithEntries.map((lift) => (
            <Link
              key={lift.id}
              href={`/charts?lift=${lift.id}${selectedAthlete ? `&athlete=${selectedAthlete.id}` : ""}`}
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

      {/* ── Hero chart ───────────────────────────────────────────────────────── */}
      {entries.length === 0 ? (
        <div className="glass-panel rounded-xl py-16 text-center text-muted-foreground text-sm">
          No entries logged for <span className="text-foreground font-medium">{selectedLift.name}</span> yet.
        </div>
      ) : (
        <section className="glass-panel rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {selectedLift.name} — All Athletes
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              % gain from each athlete&apos;s personal baseline over time
            </p>
          </div>
          <LeaderboardProgressChart
            chartData={heroData}
            athleteNames={athleteNames}
            mainLiftName={selectedLift.name}
            height={360}
          />
        </section>
      )}

      {/* ── Personal section ─────────────────────────────────────────────────── */}
      {selectedAthlete && (
        <section className="space-y-5">
          {/* Section header + athlete selector */}
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-semibold text-white">Athlete Stats</h2>
            {athletes.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {athletes.map((a) => (
                  <Link
                    key={a.id}
                    href={`/charts?lift=${selectedLift.id}&athlete=${a.id}`}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                      a.id === selectedAthlete.id
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 hover:text-foreground"
                    )}
                  >
                    {a.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {myEntries.length === 0 ? (
            <div className="glass-panel rounded-xl py-10 text-center text-muted-foreground text-sm">
              <span className="text-foreground font-medium">{selectedAthlete.name}</span> hasn&apos;t logged {selectedLift.name} yet.
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Current PR" value={`${currentPR} lbs`} />
                <StatCard label="Baseline" value={`${baseline} lbs`} />
                <StatCard
                  label="Total Gain"
                  value={gainPct != null ? formatGain(gainPct) : "—"}
                  highlight={gainPct != null && gainPct >= 0}
                />
                <StatCard label="Rank" value={rank != null ? `#${rank}` : "—"} />
              </div>

              {/* Personal progress chart */}
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
                  color="#10b981"
                  height={260}
                />
              </div>
            </>
          )}
        </section>
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
