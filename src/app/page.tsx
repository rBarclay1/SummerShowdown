import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import LeaderboardCard from "@/components/LeaderboardCard"
import { getAllLeaderboardRankings } from "@/lib/rankings"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const leaderboards = await getAllLeaderboardRankings()

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leaderboards</h1>
          <p className="text-muted-foreground mt-1">
            Ranked by % gain from personal baseline — anyone can compete.
          </p>
        </div>
        <Link href="/leaderboard/new" className={buttonVariants()}>
          New Leaderboard
        </Link>
      </div>

      {leaderboards.length === 0 ? (
        <div className="text-center py-24 border rounded-lg bg-muted/30">
          <p className="text-xl font-semibold mb-2">No leaderboards yet</p>
          <p className="text-muted-foreground mb-6">
            Create your first leaderboard to start tracking gains.
          </p>
          <Link href="/leaderboard/new" className={buttonVariants()}>
            Create a Leaderboard
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {leaderboards.map((lb) => (
            <LeaderboardCard key={lb.id} lb={lb} />
          ))}
        </div>
      )}
    </main>
  )
}
