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

function GainCell({ gain }: { gain: number }) {
  const positive = gain >= 0
  return (
    <span
      className={`font-mono font-semibold text-base ${
        positive ? "text-emerald-600" : "text-red-500"
      }`}
    >
      {formatGain(gain)}
    </span>
  )
}

export default function RankingTable({
  rankings,
  liftName,
}: {
  rankings: AthleteRanking[]
  liftName: string
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
            <TableHead className="text-right">{liftName} Gain</TableHead>
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
                {r.baseline} lbs
              </TableCell>
              <TableCell className="text-right text-sm font-mono">
                {r.current} lbs
              </TableCell>
              <TableCell className="text-right">
                <GainCell gain={r.percentGain} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
