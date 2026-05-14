import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import ScreenTimeClient from "@/components/ScreenTimeClient"

export const dynamic = "force-dynamic"

export default async function AdminScreenTimePage() {
  if (!(await isAdmin())) redirect("/")

  const [athletes, entries] = await Promise.all([
    prisma.athlete.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.screenTimeEntry.findMany({
      orderBy: [{ weekStart: "desc" }, { athleteId: "asc" }],
      include: { athlete: { select: { id: true, name: true } } },
    }),
  ])

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Screen Time Tracker</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Log weekly screen time per athlete and track week-over-week changes. Green = decrease, red = increase.
        </p>
      </div>
      <ScreenTimeClient athletes={athletes} entries={entries} />
    </main>
  )
}
