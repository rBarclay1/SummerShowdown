import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatGain, type LeaderboardWithRankings } from "@/lib/rankings"

function GainBadge({ gain }: { gain: number | null }) {
  if (gain === null) return <span className="text-muted-foreground text-sm">—</span>
  const positive = gain >= 0
  return (
    <span
      className={`font-mono text-sm font-semibold ${
        positive ? "text-emerald-600" : "text-red-500"
      }`}
    >
      {formatGain(gain)}
    </span>
  )
}

export default function LeaderboardCard({ lb }: { lb: LeaderboardWithRankings }) {
  const top5 = lb.rankings.slice(0, 5)

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{lb.name}</CardTitle>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {lb.mainLift.name}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {lb.rankings.length} athlete{lb.rankings.length !== 1 ? "s" : ""} competing ·{" "}
          {lb.lifts.length} lift{lb.lifts.length !== 1 ? "s" : ""}
        </p>
      </CardHeader>

      <CardContent className="flex-1 pb-4">
        {top5.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No entries yet.</p>
        ) : (
          <ol className="space-y-2">
            {top5.map((r) => (
              <li key={r.athlete.id} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4 text-right shrink-0">
                  {r.rank}
                </span>
                <Link
                  href={`/athlete/${r.athlete.id}`}
                  className="flex-1 text-sm font-medium hover:underline truncate"
                >
                  {r.athlete.name}
                </Link>
                <GainBadge gain={r.mainLiftGain} />
              </li>
            ))}
            {lb.rankings.length > 5 && (
              <li className="text-xs text-muted-foreground pl-7">
                +{lb.rankings.length - 5} more
              </li>
            )}
          </ol>
        )}
      </CardContent>

      <div className="px-6 pb-4 flex gap-2">
        <Link
          href={`/leaderboard/${lb.id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1 justify-center")}
        >
          View Full
        </Link>
        <Link
          href={`/log?leaderboard=${lb.id}`}
          className={cn(buttonVariants({ size: "sm" }), "flex-1 justify-center")}
        >
          Log PR
        </Link>
      </div>
    </Card>
  )
}
