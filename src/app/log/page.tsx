import { prisma } from "@/lib/prisma"
import PRForm from "@/components/PRForm"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ leaderboard?: string }>
}) {
  const { leaderboard: defaultLb } = await searchParams

  const [leaderboards, athletes] = await Promise.all([
    prisma.leaderboard.findMany({
      include: { leaderboardLifts: { include: { lift: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.athlete.findMany({ orderBy: { name: "asc" } }),
  ])

  const formLeaderboards = leaderboards.map((lb) => ({
    id: lb.id,
    name: lb.name,
    lifts: lb.leaderboardLifts.map((ll) => ll.lift),
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
          First entry sets the baseline. Every entry after updates the current PR.
        </p>
      </div>
      <PRForm
        leaderboards={formLeaderboards}
        athletes={athletes}
        defaultLeaderboardId={defaultLeaderboardId}
      />
    </main>
  )
}
