import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/admin"
import { redirect } from "next/navigation"
import CreateLeaderboardForm from "@/components/CreateLeaderboardForm"

export default async function NewLeaderboardPage() {
  if (!(await isAdmin())) redirect("/")

  const [lifts, existingBoards] = await Promise.all([
    prisma.lift.findMany({ orderBy: { name: "asc" } }),
    prisma.leaderboard.findMany({ select: { mainLiftId: true } }),
  ])

  const takenLiftIds = new Set(existingBoards.map((lb) => lb.mainLiftId))

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Create Leaderboard</h1>
        <p className="text-muted-foreground mt-1">
          Choose an activity to track. The leaderboard will be named after it automatically.
        </p>
      </div>
      <CreateLeaderboardForm availableLifts={lifts} takenLiftIds={[...takenLiftIds]} />
    </main>
  )
}
