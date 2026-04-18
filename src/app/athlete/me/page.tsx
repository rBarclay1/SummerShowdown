import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"

export default async function MyProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  const athlete = await prisma.athlete.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  })

  if (!athlete) redirect("/athlete/setup")

  redirect(`/athlete/${athlete.id}`)
}
