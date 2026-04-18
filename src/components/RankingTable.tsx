import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatGain, formatValue, type AthleteRanking } from "@/lib/rankings"

function GainCell({ gain, current, activityType }: { gain: number; current: number; activityType: string }) {
  const positive = gain >= 0
  const gainText = formatGain(gain)
  const rawText = activityType === "time_trial" ? formatValue(current, activityType) : null

  return (
    <span
      className={`font-mono font-semibold text-base ${
        positive ? "text-emerald-600" : "text-red-500"
      }`}
    >
      {gainText}
      {rawText && (
        <span className="ml-1 text-sm font-normal text-muted-foreground">({rawText})</span>
      )}
    </span>
  )
}

export default function RankingTable({
  rankings,
  activityName,
  activityType,
}: {
  rankings: AthleteRanking[]
  activityName: string
  activityType: string
}) {
  if (rankings.length === 0) {
    return (
      <div className="text-center py-16 border rounded-lg bg-muted/30">
        <p className="text-muted-foreground">No entries yet. Log the first PR!</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-clip">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Athlete</TableHead>
            <TableHead className="text-right">Baseline</TableHead>
            <TableHead className="text-right">Current</TableHead>
            <TableHead className="text-right">{activityName} Gain</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((r, idx) => (
            <TableRow key={r.athlete.id}>
              <TableCell className="text-muted-foreground font-mono text-sm">
                {idx + 1}
              </TableCell>
              <TableCell>
                <Link href={`/athlete/${r.athlete.id}`} className="font-medium hover:underline">
                  {r.athlete.name}
                </Link>
                {r.onFire && (
                  <span className="ml-1 text-base" title="On fire — new PR this week">
                    🔥
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground font-mono">
                {formatValue(r.baseline, activityType)}
              </TableCell>
              <TableCell className="text-right text-sm font-mono">
                {formatValue(r.current, activityType)}
              </TableCell>
              <TableCell className="text-right">
                <GainCell gain={r.percentGain} current={r.current} activityType={activityType} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
