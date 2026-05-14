import { prisma } from "@/lib/prisma"
import PRForm from "@/components/PRForm"
import ScreenTimeForm from "@/components/ScreenTimeForm"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { currentUser } from "@clerk/nextjs/server"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ leaderboard?: string; mode?: string }>
}) {
  const { leaderboard: defaultLb, mode } = await searchParams
  const isScreenTime = mode === "screentime"

  const [leaderboards, clerkUser] = await Promise.all([
    prisma.leaderboard.findMany({
      include: { mainLift: true },
      orderBy: { name: "asc" },
    }),
    currentUser(),
  ])

  const athleteName =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim() ||
    clerkUser?.username ||
    ""

  const formLeaderboards = leaderboards.map((lb) => ({
    id: lb.id,
    name: lb.name,
    liftId: lb.mainLiftId,
    liftName: lb.mainLift.name,
    isTotalLoad: lb.mainLift.isTotalLoad,
    activityType: lb.mainLift.type,
  }))

  const defaultLeaderboardId = defaultLb ? parseInt(defaultLb) : undefined

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Log</h1>
        <p className="text-muted-foreground mt-1">
          {isScreenTime
            ? "Log your weekly screen time. Lower is better."
            : "First entry sets the baseline. Every entry after updates your current PR."}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-white/10 overflow-hidden mb-8">
        <Link
          href="/log"
          className={cn(
            "flex-1 text-center py-2.5 text-sm font-medium transition-colors",
            !isScreenTime
              ? "bg-white/10 text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          Log PR
        </Link>
        <Link
          href="/log?mode=screentime"
          className={cn(
            "flex-1 text-center py-2.5 text-sm font-medium transition-colors border-l border-white/10",
            isScreenTime
              ? "bg-white/10 text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          Screen Time
        </Link>
      </div>

      {isScreenTime ? (
        <ScreenTimeForm athleteName={athleteName} />
      ) : leaderboards.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-xl font-semibold mb-2">No leaderboards yet</p>
          <p className="text-muted-foreground mb-6">
            Create a leaderboard before logging a PR.
          </p>
          <Link href="/leaderboard/new" className={buttonVariants()}>
            Create a Leaderboard
          </Link>
        </div>
      ) : (
        <PRForm
          leaderboards={formLeaderboards}
          athleteName={athleteName}
          defaultLeaderboardId={defaultLeaderboardId}
        />
      )}
    </main>
  )
}
