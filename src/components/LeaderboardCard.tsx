import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatGain, daysRemaining, type LeaderboardWithRankings } from "@/lib/rankings"

function GainBadge({ gain }: { gain: number }) {
  return (
    <span
      className={`font-mono text-[15px] sm:text-sm font-semibold ${
        gain >= 0 ? "text-emerald-600" : "text-red-500"
      }`}
    >
      {formatGain(gain)}
    </span>
  )
}

export default function LeaderboardCard({ lb }: { lb: LeaderboardWithRankings }) {
  const top5 = lb.rankings.slice(0, 5)
  const days = daysRemaining(lb.endDate)
  const isClosed = days !== null && days <= 0

  return (
    <Card className={cn("flex flex-col", isClosed && "opacity-75")}>
      <CardHeader className="pb-3 px-5 sm:px-6">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{lb.mainLift.name}</CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            {isClosed ? (
              <Badge variant="outline" className="text-xs border-muted-foreground/40 text-muted-foreground">
                Closed
              </Badge>
            ) : days !== null && days <= 7 ? (
              <Badge variant="outline" className="text-xs border-orange-400 text-orange-600">
                {days === 0 ? "Ends today" : `${days}d left`}
              </Badge>
            ) : days !== null ? (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {days}d left
              </Badge>
            ) : null}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {lb.rankings.length} athlete{lb.rankings.length !== 1 ? "s" : ""} competing
        </p>
      </CardHeader>

      <CardContent className="flex-1 pb-4 px-5 sm:px-6">
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
                  className="flex-1 text-[15px] sm:text-sm font-medium hover:underline truncate"
                >
                  {r.athlete.name}
                  {r.onFire && (
                    <span className="ml-1 text-sm" title="On fire — new PR this week">
                      🔥
                    </span>
                  )}
                </Link>
                <GainBadge gain={r.percentGain} />
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

      <div className="px-5 sm:px-6 pb-4 flex gap-2">
        <Link
          href={`/leaderboard/${lb.id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1 justify-center")}
        >
          View Full
        </Link>
        {!isClosed && (
          <Link
            href={`/log?leaderboard=${lb.id}`}
            className={cn(buttonVariants({ size: "sm" }), "flex-1 justify-center")}
          >
            Log PR
          </Link>
        )}
      </div>
    </Card>
  )
}
