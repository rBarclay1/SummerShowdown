import { prisma } from "@/lib/prisma"
import PRForm from "@/components/PRForm"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { currentUser } from "@clerk/nextjs/server"

export const dynamic = "force-dynamic"

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ leaderboard?: string }>
}) {
  const { leaderboard: defaultLb } = await searchParams

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

  if (leaderboards.length === 0) {
    return (
      <main className="max-w-lg mx-auto px-4 py-10 text-center">
        <p className="text-xl font-semibold mb-2">No leaderboards yet</p>
        <p className="text-muted-foreground mb-6">
          Create a leaderboard before logging a PR.
        </p>
        <Link href="/leaderboard/new" className={buttonVariants()}>
          Create a Leaderboard
        </Link>
      </main>
    )
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Log a PR</h1>
        <p className="text-muted-foreground mt-1">
          First entry sets the baseline. Every entry after updates your current PR.
        </p>
      </div>
      <PRForm
        leaderboards={formLeaderboards}
        athleteName={athleteName}
        defaultLeaderboardId={defaultLeaderboardId}
      />
    </main>
  )
}
