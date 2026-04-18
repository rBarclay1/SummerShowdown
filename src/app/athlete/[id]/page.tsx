import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import LiftProgressChart from "@/components/LiftProgressChart"
import { formatGain, formatValue } from "@/lib/rankings"

export const dynamic = "force-dynamic"

const CHART_COLORS = [
  "#10b981",
  "#6366f1",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
]

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return parts[0].slice(0, 2).toUpperCase()
}

export default async function AthletePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const athleteId = parseInt(id)
  if (isNaN(athleteId)) notFound()

  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    include: {
      entries: {
        include: { lift: true, leaderboard: { include: { mainLift: true } } },
        orderBy: { date: "asc" },
      },
    },
  })
  if (!athlete) notFound()

  // Group entries by lift, preserving first-seen order
  const byLift = new Map<
    number,
    { lift: { id: number; name: string; type: string }; entries: typeof athlete.entries }
  >()
  for (const entry of athlete.entries) {
    if (!byLift.has(entry.liftId)) {
      byLift.set(entry.liftId, { lift: entry.lift, entries: [] })
    }
    byLift.get(entry.liftId)!.entries.push(entry)
  }

  // Per-lift stats + chart data
  const liftData = Array.from(byLift.values()).map(({ lift, entries }) => {
    const isTimeTrial = lift.type === "time_trial"
    const sorted = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    const baseline = sorted[0].weightLbs
    const current = isTimeTrial
      ? Math.min(...entries.map((e) => e.weightLbs))
      : Math.max(...entries.map((e) => e.weightLbs))
    const percentGain = baseline === 0
      ? 0
      : isTimeTrial
        ? ((baseline - current) / baseline) * 100
        : ((current - baseline) / baseline) * 100

    // Build per-date best value for the chart
    const dateMap = new Map<string, number>()
    for (const e of sorted) {
      const label = new Date(e.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      const prev = dateMap.get(label)
      dateMap.set(
        label,
        prev === undefined
          ? e.weightLbs
          : isTimeTrial
            ? Math.min(prev, e.weightLbs)
            : Math.max(prev, e.weightLbs)
      )
    }
    const chartPoints = Array.from(dateMap.entries()).map(([date, weight]) => ({
      date,
      weight,
    }))

    return {
      lift,
      baseline,
      current,
      percentGain,
      entryCount: entries.length,
      chartPoints,
    }
  })

  // Unique leaderboards this athlete appears on
  const leaderboards = athlete.entries
    .map((e) => e.leaderboard)
    .filter((lb, idx, arr) => arr.findIndex((l) => l.id === lb.id) === idx)

  // Recent entries (last 10, newest first)
  const recentEntries = [...athlete.entries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

  const initials = getInitials(athlete.name)

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* ── Profile Header ── */}
      <div className="flex items-start gap-4">
        {/* Initials avatar */}
        <div
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary text-primary-foreground
                     flex items-center justify-center font-bold text-xl sm:text-2xl shrink-0"
          aria-hidden="true"
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight leading-tight">
                {athlete.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {liftData.length} activit{liftData.length !== 1 ? "ies" : "y"} ·{" "}
                {athlete.entries.length} PR log{athlete.entries.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link href="/log" className={`${buttonVariants({ size: "sm" })} shrink-0`}>
              Log PR
            </Link>
          </div>

          {/* Leaderboard badges */}
          {leaderboards.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {leaderboards.map((lb) => (
                <Link key={lb.id} href={`/leaderboard/${lb.id}`}>
                  <Badge
                    variant="outline"
                    className="hover:bg-muted cursor-pointer text-xs"
                  >
                    {lb.mainLift.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Personal Records ── */}
      {liftData.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3">Personal Records</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {liftData.map(({ lift, baseline, current, percentGain, entryCount }) => (
              <Card key={lift.id}>
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground truncate">
                    {lift.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-2xl font-bold">{formatValue(current, lift.type)}</p>
                  <p
                    className={`text-sm font-semibold ${
                      percentGain >= 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {formatGain(percentGain)} from baseline
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Baseline: {formatValue(baseline, lift.type)} ·{" "}
                    {entryCount} entr{entryCount === 1 ? "y" : "ies"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── Per-Activity Progress Charts ── */}
      {liftData.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3">Progress by Activity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {liftData.map(({ lift, baseline, chartPoints }, i) => (
              <Card key={lift.id}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium">{lift.name}</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-4">
                  <LiftProgressChart
                    data={chartPoints}
                    baseline={baseline}
                    color={CHART_COLORS[i % CHART_COLORS.length]}
                    activityType={lift.type}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── Recent Entries ── */}
      <section>
        <h2 className="text-base font-semibold mb-3">Recent Entries</h2>
        {recentEntries.length === 0 ? (
          <p className="text-muted-foreground text-sm">No entries yet.</p>
        ) : (
          <div className="rounded-lg border overflow-clip">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead className="hidden sm:table-cell">Leaderboard</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(entry.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {entry.lift.name}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Link href={`/leaderboard/${entry.leaderboard.id}`}>
                        <Badge
                          variant="outline"
                          className="text-xs hover:bg-muted cursor-pointer"
                        >
                          {entry.leaderboard.mainLift.name}
                        </Badge>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatValue(entry.weightLbs, entry.lift.type)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </main>
  )
}
