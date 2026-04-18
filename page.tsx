import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function ProfileRedirectPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  // Find the athlete record associated with this Clerk user
  let athlete = await prisma.athlete.findUnique({
    where: { clerkId: userId },
  })

  // If the user hasn't logged a PR or posted yet, they might not have an athlete record.
  // We generate one for them here so they can still view their (empty) profile.
  if (!athlete) {
    const clerkUser = await currentUser()
    const athleteName =
      [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim() ||
      clerkUser?.username ||
      ""

    if (athleteName) {
      const existing = await prisma.athlete.findUnique({ where: { name: athleteName } })
      
      if (existing && !existing.clerkId) {
        athlete = await prisma.athlete.update({
          where: { id: existing.id },
          data: { clerkId: userId },
        })
      } else if (!existing) {
        athlete = await prisma.athlete.create({
          data: { name: athleteName, clerkId: userId },
        })
      } else {
        athlete = await prisma.athlete.create({
          data: { name: `${athleteName} (${userId.slice(-4)})`, clerkId: userId },
        })
      }
    }
  }

  // Redirect to their canonical public profile page
  redirect(athlete ? `/athlete/${athlete.id}` : "/")
}