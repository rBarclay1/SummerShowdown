import Link from "next/link"
import LeaderboardCard from "@/components/LeaderboardCard"
import AdminNewLeaderboardButton from "@/components/AdminNewLeaderboardButton"
import {
  getAllLeaderboardRankings,
  getOverallRankings,
  getWeeklyWinner,
  getMostImprovedThisMonth,
  formatGain,
} from "@/lib/rankings"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const { userId } = await auth()

  const [leaderboards, overall, weeklyWinner, mostImproved, myAthlete] = await Promise.all([
    getAllLeaderboardRankings(),
    getOverallRankings(),
    getWeeklyWinner(),
    getMostImprovedThisMonth(),
    userId
      ? prisma.athlete.findUnique({ where: { clerkId: userId }, select: { id: true } })
      : Promise.resolve(null),
  ])

  const myOverall = myAthlete ? overall.find((r) => r.athlete.id === myAthlete.id) ?? null : null
  const myImproved = myAthlete
    ? mostImproved.find((r) => r.athlete.id === myAthlete.id) ?? null
    : null

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Weekly winner banner */}
      {weeklyWinner && (() => {
        const initials = weeklyWinner.athlete.name
          .split(" ")
          .map((w: string) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
        return (
          <div className="rounded-lg border border-white/10 border-l-4 border-l-amber-400 bg-[rgba(245,158,11,0.07)] backdrop-blur-sm px-5 py-4 flex items-center gap-3">
            <div className="size-9 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 font-bold text-sm shrink-0 select-none">
              {initials}
            </div>
            <span className="text-2xl shrink-0 leading-none">🏆</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Weekly Winner
              </p>
              <p className="mt-0.5 leading-snug">
                <Link href={`/athlete/${weeklyWinner.athlete.id}`} className="text-base font-bold hover:underline text-white">
                  {weeklyWinner.athlete.name}
                </Link>
                <span className="text-white/50 font-normal text-sm"> — </span>
                <span className="text-emerald-400 font-mono text-sm font-semibold">+{weeklyWinner.weekGain.toFixed(1)}%</span>
                <span className="text-white/50 font-normal text-sm"> on {weeklyWinner.liftName} this week</span>
              </p>
            </div>
          </div>
        )
      })()}

      {/* Leaderboards section */}
      <section>
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">Leaderboards</h1>
            <AdminNewLeaderboardButton className="hidden sm:inline-flex shrink-0" />
          </div>
          <p className="text-muted-foreground mt-1">
            Ranked by % gain from personal baseline — anyone can compete.
          </p>
          <AdminNewLeaderboardButton size="sm" className="mt-3 sm:hidden" />
        </div>

        {leaderboards.length === 0 ? (
          <div className="text-center py-24 rounded-lg glass-panel">
            <p className="text-xl font-semibold mb-2">No leaderboards yet</p>
            <p className="text-muted-foreground mb-6">
              Check back soon — leaderboards are coming.
            </p>
            <AdminNewLeaderboardButton />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {leaderboards.map((lb) => (
              <LeaderboardCard key={lb.id} lb={lb} />
            ))}
          </div>
        )}
      </section>

      {/* Your Stats */}
      {myOverall && (
        <>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
              Your Stats
            </span>
            <hr className="flex-1 border-border" />
          </div>

          <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Overall rank */}
            <div className="glass-panel rounded-lg p-4 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Overall Rank</p>
              <p className="text-3xl font-bold">#{myOverall.rank}</p>
              <p className="text-xs text-muted-foreground">
                of {overall.length} {overall.length === 1 ? "athlete" : "athletes"}
              </p>
            </div>

            {/* Avg gain */}
            <div className="glass-panel rounded-lg p-4 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Gain</p>
              <p className={`text-3xl font-bold font-mono ${myOverall.overallScore >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatGain(myOverall.overallScore)}
              </p>
              <p className="text-xs text-muted-foreground">
                {myOverall.liftCount} {myOverall.liftCount === 1 ? "lift" : "lifts"}
                {myOverall.onFire && <span className="ml-1" title="New PR this week">🔥</span>}
              </p>
            </div>

            {/* 30-day gain */}
            <div className="glass-panel rounded-lg p-4 space-y-1 col-span-2 sm:col-span-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">30-Day Gain</p>
              {myImproved ? (
                <>
                  <p className={`text-3xl font-bold font-mono ${myImproved.monthScore >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatGain(myImproved.monthScore)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {myImproved.liftCount} {myImproved.liftCount === 1 ? "lift" : "lifts"}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-muted-foreground">—</p>
                  <p className="text-xs text-muted-foreground">No new PRs this month</p>
                </>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
