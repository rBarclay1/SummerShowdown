import { prisma } from "@/lib/prisma"
import CreateLeaderboardForm from "@/components/CreateLeaderboardForm"

export default async function NewLeaderboardPage() {
  const lifts = await prisma.lift.findMany({ orderBy: { name: "asc" } })

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Create Leaderboard</h1>
        <p className="text-muted-foreground mt-1">
          Name it, pick the lifts, and designate a main lift for the headline stat.
        </p>
      </div>
      <CreateLeaderboardForm availableLifts={lifts} />
    </main>
  )
}
