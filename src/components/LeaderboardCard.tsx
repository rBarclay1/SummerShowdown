import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatGain, daysRemaining, type LeaderboardWithRankings } from "@/lib/rankings"

export default function LeaderboardCard({ lb }: { lb: LeaderboardWithRankings }) {
  const leader = lb.rankings[0] ?? null
  const days = daysRemaining(lb.endDate)
  const isClosed = days !== null && days <= 0

  return (
    <Card className={cn("flex flex-col", isClosed && "opacity-75")}>
      <CardHeader className="pb-2 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="flex items-start justify-between gap-1">
          <CardTitle className="text-sm leading-snug">{lb.mainLift.name}</CardTitle>
          <div className="shrink-0">
            {isClosed ? (
              <Badge variant="outline" className="text-[10px] border-muted-foreground/40 text-muted-foreground px-1 py-0">
                Closed
              </Badge>
            ) : days !== null && days <= 7 ? (
              <Badge variant="outline" className="text-[10px] border-orange-400 text-orange-600 px-1 py-0">
                {days === 0 ? "Today" : `${days}d`}
              </Badge>
            ) : days !== null ? (
              <Badge variant="outline" className="text-[10px] text-muted-foreground px-1 py-0">
                {days}d
              </Badge>
            ) : null}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {lb.rankings.length} competing
        </p>
      </CardHeader>

      <CardContent className="flex-1 pb-2 px-3 sm:px-4">
        {!leader ? (
          <p className="text-xs text-muted-foreground italic">No entries yet.</p>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground shrink-0">1</span>
            <Link
              href={`/athlete/${leader.athlete.id}`}
              className="flex-1 text-xs font-medium hover:underline truncate"
            >
              {leader.athlete.name}
              {leader.onFire && <span className="ml-0.5 text-xs">🔥</span>}
            </Link>
            <span
              className={`font-mono text-xs font-semibold shrink-0 ${
                leader.percentGain >= 0 ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {formatGain(leader.percentGain)}
            </span>
          </div>
        )}
      </CardContent>

      <div className="px-3 sm:px-4 pb-3 flex flex-col gap-1.5">
        <Link
          href={`/leaderboard/${lb.id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full justify-center text-xs h-7")}
        >
          View Full
        </Link>
        {!isClosed && (
          <Link
            href={`/log?leaderboard=${lb.id}`}
            className={cn(buttonVariants({ size: "sm" }), "w-full justify-center text-xs h-7")}
          >
            Log PR
          </Link>
        )}
      </div>
    </Card>
  )
}
