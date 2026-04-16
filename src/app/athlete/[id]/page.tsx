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
import AthleteProgressChart from "@/components/AthleteProgressChart"
import { formatGain } from "@/lib/rankings"

export const dynamic = "force-dynamic"

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
        include: { lift: true, leaderboard: true },
        orderBy: { date: "asc" },
      },
    },
  })
  if (!athlete) notFound()

  // Group entries by lift
  const byLift = new Map<
    number,
    { lift: { id: number; name: string }; entries: typeof athlete.entries }
  >()
  for (const entry of athlete.entries) {
    if (!byLift.has(entry.liftId)) {
      byLift.set(entry.liftId, { lift: entry.lift, entries: [] })
    }
    byLift.get(entry.liftId)!.entries.push(entry)
  }

  // Stats per lift
  const liftStats = Array.from(byLift.values()).map(({ lift, entries }) => {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    const baseline = sorted[0].weightLbs
    const current = Math.max(...entries.map((e) => e.weightLbs))
    const percentGain = baseline === 0 ? 0 : ((current - baseline) / baseline) * 100
    return { lift, baseline, current, percentGain, entryCount: entries.length }
  })

  // Build chart data: one row per unique date label, columns per lift
  const dateSet = new Set<string>()
  for (const entry of athlete.entries) {
    dateSet.add(
      new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    )
  }
  const dates = Array.from(dateSet)
  const liftNames = Array.from(byLift.values()).map((g) => g.lift.name)

  const chartData = dates.map((date) => {
    const point: Record<string, number | string> = { date }
    for (const [, { lift, entries }] of byLift) {
      const matching = entries.filter(
        (e) =>
          new Date(e.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }) === date
      )
      if (matching.length > 0) {
        point[lift.name] = Math.max(...matching.map((e) => e.weightLbs))
      }
    }
    return point
  })

  // Unique leaderboards
  const leaderboards = athlete.entries
    .map((e) => e.leaderboard)
    .filter((lb, idx, arr) => arr.findIndex((l) => l.id === lb.id) === idx)

  // Recent entries (last 10)
  const recentEntries = [...athlete.entries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{athlete.name}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            {leaderboards.map((lb) => (
              <Link key={lb.id} href={`/leaderboard/${lb.id}`}>
                <Badge variant="outline" className="hover:bg-muted cursor-pointer">
                  {lb.name}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
        <Link href="/log" className={buttonVariants()}>
          Log PR
        </Link>
      </div>

      {/* Lift stats cards */}
      {liftStats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {liftStats.map(({ lift, baseline, current, percentGain, entryCount }) => (
            <Card key={lift.id}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {lift.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold">{current} lbs</p>
                <p
                  className={`text-sm font-semibold ${
                    percentGain >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {formatGain(percentGain)} from baseline
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Baseline: {baseline} lbs · {entryCount} entr{entryCount === 1 ? "y" : "ies"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Progress chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weight Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <AthleteProgressChart data={chartData} liftNames={liftNames} />
        </CardContent>
      </Card>

      {/* Recent entries */}
      <div>
        <h2 className="text-base font-semibold mb-3">Recent Entries</h2>
        {recentEntries.length === 0 ? (
          <p className="text-muted-foreground text-sm">No entries yet.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Lift</TableHead>
                  <TableHead>Leaderboard</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{entry.lift.name}</TableCell>
                    <TableCell>
                      <Link href={`/leaderboard/${entry.leaderboard.id}`}>
                        <Badge variant="outline" className="text-xs hover:bg-muted cursor-pointer">
                          {entry.leaderboard.name}
                        </Badge>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {entry.weightLbs} lbs
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </main>
  )
}
