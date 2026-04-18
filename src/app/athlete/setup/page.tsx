import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import SetupForm from "./SetupForm"

export default async function AthleteSetupPage() {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  // Already linked — go to profile
  const existing = await prisma.athlete.findUnique({ where: { clerkId: userId } })
  if (existing) redirect(`/athlete/${existing.id}`)

  const clerkUser = await currentUser()
  const fullName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ")

  const allAthletes = await prisma.athlete.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, clerkId: true },
  })

  // Unclaimed first, then claimed (marked so the form can label them)
  const athletes = allAthletes.map((a) => ({
    id: a.id,
    name: a.name,
    claimed: !!a.clerkId,
  })).sort((a, b) => Number(a.claimed) - Number(b.claimed))

  return (
    <main className="max-w-md mx-auto px-4 py-16 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Set up your profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Link your account to an athlete record, or create a new one.
        </p>
      </div>
      <SetupForm athletes={athletes} defaultName={fullName} />
    </main>
  )
}
