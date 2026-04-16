import { notFound } from "next/navigation"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import RankingTable from "@/components/RankingTable"
import LiftFilterChips from "@/components/LiftFilterChips"
import { getLeaderboardRankings } from "@/lib/rankings"

export const dynamic = "force-dynamic"

export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ lift?: string }>
}) {
  const { id } = await params
  const { lift } = await searchParams
  const leaderboardId = parseInt(id)
  if (isNaN(leaderboardId)) notFound()

  const lb = await getLeaderboardRankings(leaderboardId)
  if (!lb) notFound()

  const filterLiftId = lift ? parseInt(lift) : null

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{lb.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground text-sm">
              {lb.rankings.length} athlete{lb.rankings.length !== 1 ? "s" : ""}
            </p>
            <span className="text-muted-foreground">·</span>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              Main lift:{" "}
              <Badge variant="secondary" className="ml-1">
                {lb.mainLift.name}
              </Badge>
            </p>
          </div>
        </div>
        <Link href={`/log?leaderboard=${lb.id}`} className={buttonVariants()}>
          Log PR
        </Link>
      </div>

      <div className="mt-6 mb-4">
        <LiftFilterChips lifts={lb.lifts} mainLiftId={lb.mainLift.id} />
      </div>

      <RankingTable
        rankings={lb.rankings}
        lifts={lb.lifts}
        mainLiftId={lb.mainLift.id}
        filterLiftId={filterLiftId}
      />

      {lb.rankings.length > 0 && (
        <p className="text-xs text-muted-foreground mt-3">
          ★ = main lift · % gain from personal baseline · Avg = category average across all lifts
        </p>
      )}
    </main>
  )
}
