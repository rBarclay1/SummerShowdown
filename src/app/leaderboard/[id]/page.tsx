import { notFound } from "next/navigation"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import RankingTable from "@/components/RankingTable"
import PodiumView from "@/components/PodiumView"
import LeaderboardProgressChart from "@/components/LeaderboardProgressChart"
import LeaderboardAdminControls from "@/components/LeaderboardAdminControls"
import { getLeaderboardRankings, daysRemaining, buildLeaderboardProgressData } from "@/lib/rankings"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const leaderboardId = parseInt(id)
  if (isNaN(leaderboardId)) notFound()

  const [lb, rawEntries, admin, allLifts, existingBoards] = await Promise.all([
    getLeaderboardRankings(leaderboardId),
    prisma.pREntry.findMany({
      where: { leaderboardId },
      include: { athlete: true, lift: true },
      orderBy: { date: "asc" },
    }),
    isAdmin(),
    prisma.lift.findMany({ orderBy: { name: "asc" } }),
    prisma.leaderboard.findMany({ select: { mainLiftId: true, id: true } }),
  ])
  if (!lb) notFound()

  const days = daysRemaining(lb.endDate)
  const isClosed = days !== null && days <= 0

  const { chartData: progressData, athleteNames } = buildLeaderboardProgressData(
    rawEntries,
    lb.mainLift.id
  )

  // Lift IDs used by OTHER leaderboards (not this one)
  const takenLiftIds = existingBoards
    .filter((b) => b.id !== leaderboardId)
    .map((b) => b.mainLiftId)

  // Format end date for the edit form input (YYYY-MM-DD or "")
  const endDateValue = lb.endDate
    ? new Date(lb.endDate).toISOString().slice(0, 10)
    : ""

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{lb.mainLift.name}</h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
            <p className="text-muted-foreground text-sm">
              {lb.rankings.length} athlete{lb.rankings.length !== 1 ? "s" : ""}
            </p>
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

        {/* Right-side header actions */}
        <div className="flex items-center gap-2 shrink-0">
          {admin && (
            <LeaderboardAdminControls
              leaderboardId={lb.id}
              currentName={lb.mainLift.name}
              currentLiftId={lb.mainLift.id}
              currentEndDate={endDateValue}
              entryCount={rawEntries.length}
              allLifts={allLifts}
              takenLiftIds={takenLiftIds}
            />
          )}
          {!isClosed && (
            <Link href={`/log?leaderboard=${lb.id}`} className={buttonVariants()}>
              Log PR
            </Link>
          )}
        </div>
      </div>

      {isClosed && lb.endDate ? (
        <PodiumView rankings={lb.rankings} liftName={lb.mainLift.name} endDate={lb.endDate} />
      ) : (
        <>
          <RankingTable rankings={lb.rankings} liftName={lb.mainLift.name} />
          {lb.rankings.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              % gain measured from each athlete&apos;s personal baseline.
            </p>
          )}
        </>
      )}

      {/* Progress Chart */}
      {athleteNames.length > 0 && (
        <div className="mt-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Progress Over Time — {lb.mainLift.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <LeaderboardProgressChart
                chartData={progressData}
                athleteNames={athleteNames}
                mainLiftName={lb.mainLift.name}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}
