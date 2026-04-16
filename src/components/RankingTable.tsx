import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatGain, type AthleteRanking } from "@/lib/rankings"

function GainCell({ gain, isMain }: { gain: number | null | undefined; isMain?: boolean }) {
  if (gain === null || gain === undefined)
    return <span className="text-muted-foreground">—</span>
  const positive = gain >= 0
  return (
    <span
      className={`font-mono font-semibold ${
        positive ? "text-emerald-600" : "text-red-500"
      } ${isMain ? "text-base" : "text-sm"}`}
    >
      {formatGain(gain)}
    </span>
  )
}

export default function RankingTable({
  rankings,
  lifts,
  mainLiftId,
  filterLiftId,
}: {
  rankings: AthleteRanking[]
  lifts: { id: number; name: string }[]
  mainLiftId: number
  filterLiftId: number | null
}) {
  const displayLifts = filterLiftId ? lifts.filter((l) => l.id === filterLiftId) : lifts

  if (rankings.length === 0) {
    return (
      <div className="text-center py-16 border rounded-lg bg-muted/30">
        <p className="text-muted-foreground">No entries yet. Log the first PR!</p>
      </div>
    )
  }

  // Sort by the filtered lift if a specific one is selected, otherwise by main lift
  const sortedRankings = filterLiftId
    ? [...rankings].sort((a, b) => {
        const gainA = a.liftStats[filterLiftId]?.percentGain ?? -Infinity
        const gainB = b.liftStats[filterLiftId]?.percentGain ?? -Infinity
        return gainB - gainA
      })
    : rankings

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Athlete</TableHead>
            {displayLifts.map((lift) => (
              <TableHead key={lift.id} className="text-right">
                <span className="flex items-center justify-end gap-1">
                  {lift.name}
                  {lift.id === mainLiftId && !filterLiftId && (
                    <span className="text-muted-foreground text-[10px]">★</span>
                  )}
                </span>
              </TableHead>
            ))}
            {!filterLiftId && (
              <TableHead className="text-right">
                <span className="text-muted-foreground">Avg</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRankings.map((r, idx) => (
            <TableRow key={r.athlete.id}>
              <TableCell className="text-muted-foreground font-mono text-sm">
                {idx + 1}
              </TableCell>
              <TableCell>
                <Link
                  href={`/athlete/${r.athlete.id}`}
                  className="font-medium hover:underline"
                >
                  {r.athlete.name}
                </Link>
                {r.liftCount < lifts.length && (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {r.liftCount}/{lifts.length} lifts
                  </Badge>
                )}
              </TableCell>
              {displayLifts.map((lift) => (
                <TableCell key={lift.id} className="text-right">
                  <GainCell
                    gain={r.liftStats[lift.id]?.percentGain ?? null}
                    isMain={lift.id === mainLiftId && !filterLiftId}
                  />
                </TableCell>
              ))}
              {!filterLiftId && (
                <TableCell className="text-right">
                  <GainCell gain={r.categoryScore} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
