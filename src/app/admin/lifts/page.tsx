import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import LiftManagerClient from "@/components/LiftManagerClient"

export const dynamic = "force-dynamic"

export default async function AdminLiftsPage() {
  if (!(await isAdmin())) redirect("/")

  const raw = await prisma.lift.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { entries: true, leaderboards: true } },
    },
  })

  const lifts = raw.map((l) => ({
    id: l.id,
    name: l.name,
    leaderboardCount: l._count.leaderboards,
    entryCount: l._count.entries,
  }))

  return (
    <main className="max-w-xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Manage Lifts</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Add, rename, or delete lift types. Renaming a lift updates it everywhere —
          leaderboards, PR logs, and athlete profiles all reflect the change immediately.
        </p>
      </div>
      <LiftManagerClient lifts={lifts} />
    </main>
  )
}
