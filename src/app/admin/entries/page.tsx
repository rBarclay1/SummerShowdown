import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import EntriesAdminClient from "@/components/EntriesAdminClient"

export const dynamic = "force-dynamic"

export default async function AdminEntriesPage() {
  if (!(await isAdmin())) redirect("/")

  const [leaderboards, athletes, entries] = await Promise.all([
    prisma.leaderboard.findMany({
      orderBy: { name: "asc" },
      include: { mainLift: true },
    }),
    prisma.athlete.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.pREntry.findMany({
      include: {
        athlete: { select: { id: true, name: true } },
        lift: { select: { id: true, name: true, type: true } },
      },
      orderBy: [{ leaderboardId: "asc" }, { athleteId: "asc" }, { date: "asc" }],
    }),
  ])

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Manage Entries</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Add, edit, or delete PR entries for any athlete on any leaderboard.
        </p>
      </div>
      <EntriesAdminClient leaderboards={leaderboards} athletes={athletes} entries={entries} />
    </main>
  )
}
