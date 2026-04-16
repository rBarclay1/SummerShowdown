"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createLeaderboard(formData: FormData) {
  const name = (formData.get("name") as string).trim()
  const mainLiftId = parseInt(formData.get("mainLiftId") as string)
  const liftIds = formData
    .getAll("liftIds")
    .map((v) => parseInt(v as string))
    .filter(Boolean)
  const newLiftNames = formData
    .getAll("newLifts")
    .map((v) => (v as string).trim())
    .filter(Boolean)

  if (!name || isNaN(mainLiftId) || liftIds.length === 0) {
    throw new Error("Invalid form data")
  }

  // Create any new lifts
  const createdLifts = await Promise.all(
    newLiftNames.map((liftName) =>
      prisma.lift.upsert({
        where: { name: liftName },
        update: {},
        create: { name: liftName },
      })
    )
  )

  const allLiftIds = [...liftIds, ...createdLifts.map((l) => l.id)]
  const resolvedMainLiftId = mainLiftId < 0
    ? createdLifts[Math.abs(mainLiftId) - 1]?.id ?? allLiftIds[0]
    : mainLiftId

  const leaderboard = await prisma.leaderboard.create({
    data: {
      name,
      mainLiftId: resolvedMainLiftId,
      leaderboardLifts: {
        create: allLiftIds.map((liftId) => ({ liftId })),
      },
    },
  })

  revalidatePath("/")
  redirect(`/leaderboard/${leaderboard.id}`)
}

export async function createLift(name: string) {
  return prisma.lift.upsert({
    where: { name: name.trim() },
    update: {},
    create: { name: name.trim() },
  })
}
