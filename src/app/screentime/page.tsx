import { prisma } from "@/lib/prisma"
import { Monitor } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ScreenTimePage() {
  const entries = await prisma.screenTimeEntry.findMany({
    orderBy: [{ athleteId: "asc" }, { weekStart: "desc" }],
    include: { athlete: { select: { id: true, name: true } } },
  })

  const byAthlete = new Map<number, typeof entries>()
  for (const entry of entries) {
    const arr = byAthlete.get(entry.athleteId) ?? []
    arr.push(entry)
    byAthlete.set(entry.athleteId, arr)
  }

  type Row = {
    id: number
    name: string
    hours: number
    weekStart: Date | string
    pctChange: number | null
  }

  const rows: Row[] = []
  for (const [, athleteEntries] of byAthlete) {
    const latest = athleteEntries[0]
    const prev = athleteEntries[1] ?? null
    const pctChange = prev ? ((latest.hours - prev.hours) / prev.hours) * 100 : null
    rows.push({
      id: latest.athlete.id,
      name: latest.athlete.name,
      hours: latest.hours,
      weekStart: latest.weekStart,
      pctChange,
    })
  }

  rows.sort((a, b) => a.hours - b.hours)

  const latestWeek =
    rows.length > 0
      ? new Date(Math.max(...rows.map((r) => new Date(r.weekStart).getTime())))
      : null

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Monitor className="size-7" />
          Screen Time
        </h1>
        <p className="text-muted-foreground mt-1">
          Ranked by weekly hours — lower is better.
        </p>
        {latestWeek && (
          <p className="text-xs text-muted-foreground mt-1">
            Week of{" "}
            {latestWeek.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            })}
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-24 rounded-lg glass-panel">
          <p className="text-xl font-semibold mb-2">No data yet</p>
          <p className="text-muted-foreground">
            Screen time entries will appear here once logged.
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-lg overflow-hidden">
          <ol className="divide-y divide-white/5">
            {rows.map((row, idx) => {
              const weekLabel = new Date(row.weekStart).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              })
              return (
                <li key={row.id} className="flex items-center gap-4 px-5 py-4">
                  <span className="text-sm text-muted-foreground w-5 text-right shrink-0 font-mono">
                    {idx + 1}
                  </span>
                  <span className="flex-1 font-semibold text-[15px]">{row.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">wk {weekLabel}</span>
                  <span className="font-mono font-semibold text-[15px] shrink-0">
                    {row.hours}h
                  </span>
                  {row.pctChange !== null ? (
                    <span
                      className={`text-xs font-semibold w-12 text-right shrink-0 font-mono ${
                        row.pctChange < 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {row.pctChange > 0 ? "+" : ""}
                      {row.pctChange.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
                      —
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </main>
  )
}
