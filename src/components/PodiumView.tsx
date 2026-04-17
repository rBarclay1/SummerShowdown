import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatGain, type AthleteRanking } from "@/lib/rankings"

const MEDALS = ["🥇", "🥈", "🥉"]
const PODIUM_BG = [
  "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-700",
  "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700",
  "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-700",
]

export default function PodiumView({
  rankings,
  liftName,
  endDate,
}: {
  rankings: AthleteRanking[]
  liftName: string
  endDate: Date
}) {
  const top3 = rankings.slice(0, 3)
  const rest = rankings.slice(3)

  return (
    <div className="space-y-8">
      {/* Ceremony header */}
      <div className="text-center py-6 border rounded-lg bg-muted/20">
        <p className="text-3xl mb-2">🏆</p>
        <h2 className="text-xl font-bold tracking-tight">Final Results</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Closed{" "}
          {endDate.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Podium top 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {top3.map((r, i) => (
          <div
            key={r.athlete.id}
            className={`rounded-lg border px-5 py-4 space-y-1 ${PODIUM_BG[i]}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{MEDALS[i]}</span>
              {r.onFire && (
                <span className="text-lg" title="On fire">
                  🔥
                </span>
              )}
            </div>
            <Link
              href={`/athlete/${r.athlete.id}`}
              className="block font-bold text-base hover:underline leading-snug"
            >
              {r.athlete.name}
            </Link>
            <p
              className={`font-mono font-semibold text-lg ${
                r.percentGain >= 0 ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {formatGain(r.percentGain)}
            </p>
            <p className="text-xs text-muted-foreground">{liftName} gain</p>
          </div>
        ))}
      </div>

      {/* Rest of field */}
      {rest.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Full Results
          </h3>
          <div className="rounded-lg border overflow-clip">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Athlete</TableHead>
                  <TableHead className="text-right">Baseline</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">{liftName} Gain</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rest.map((r) => (
                  <TableRow key={r.athlete.id}>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {r.rank}
                    </TableCell>
                    <TableCell>
                      <Link href={`/athlete/${r.athlete.id}`} className="font-medium hover:underline">
                        {r.athlete.name}
                      </Link>
                      {r.onFire && <span className="ml-1">🔥</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground font-mono">
                      {r.baseline} lbs
                    </TableCell>
                    <TableCell className="text-right text-sm font-mono">
                      {r.current} lbs
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-mono font-semibold text-sm ${
                          r.percentGain >= 0 ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {formatGain(r.percentGain)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
