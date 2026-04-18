"use server"

import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function claimAthlete(athleteId: number) {
  const { userId } = await auth()
  if (!userId) return { error: "Not signed in." }

  const alreadyClaimed = await prisma.athlete.findUnique({ where: { clerkId: userId } })
  if (alreadyClaimed) return { error: "Your account is already linked to an athlete." }

  const target = await prisma.athlete.findUnique({ where: { id: athleteId } })
  if (!target) return { error: "Athlete not found." }
  if (target.clerkId) return { error: "That athlete is already claimed by another account." }

  await prisma.athlete.update({ where: { id: athleteId }, data: { clerkId: userId } })
}

export async function createAndClaimAthlete(name: string) {
  const { userId } = await auth()
  if (!userId) return { error: "Not signed in." }

  const alreadyClaimed = await prisma.athlete.findUnique({ where: { clerkId: userId } })
  if (alreadyClaimed) return { error: "Your account is already linked to an athlete." }

  const existing = await prisma.athlete.findUnique({ where: { name } })
  if (existing) return { error: "An athlete with that name already exists.", existingId: existing.id }

  await prisma.athlete.create({ data: { name, clerkId: userId } })
}
