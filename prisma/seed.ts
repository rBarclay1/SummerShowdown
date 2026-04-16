import "dotenv/config"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "../generated/prisma/client"

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Seed lifts
  const liftNames = [
    "Squat",
    "Bench Press",
    "Deadlift",
    "Overhead Press",
    "Barbell Row",
    "Pull-up",
  ]
  const lifts = await Promise.all(
    liftNames.map((name) =>
      prisma.lift.upsert({ where: { name }, update: {}, create: { name } })
    )
  )
  console.log(`Seeded ${lifts.length} lifts`)

  const [squat, bench, deadlift, ohp] = lifts

  // Seed leaderboards
  const powerlifting = await prisma.leaderboard.upsert({
    where: { name: "Powerlifting Total" },
    update: {},
    create: {
      name: "Powerlifting Total",
      mainLiftId: squat.id,
      leaderboardLifts: {
        create: [
          { liftId: squat.id },
          { liftId: bench.id },
          { liftId: deadlift.id },
        ],
      },
    },
  })

  const pushDay = await prisma.leaderboard.upsert({
    where: { name: "Push Day" },
    update: {},
    create: {
      name: "Push Day",
      mainLiftId: bench.id,
      leaderboardLifts: {
        create: [
          { liftId: bench.id },
          { liftId: ohp.id },
        ],
      },
    },
  })

  console.log(`Seeded leaderboards: ${powerlifting.name}, ${pushDay.name}`)

  // Seed athletes + sample entries
  const athleteNames = ["Alex Rivera", "Jordan Kim", "Sam Chen", "Taylor Brooks"]
  const athletes = await Promise.all(
    athleteNames.map((name) =>
      prisma.athlete.upsert({ where: { name }, update: {}, create: { name } })
    )
  )
  console.log(`Seeded ${athletes.length} athletes`)

  // Sample PRs for Powerlifting Total
  const plData: [string, number, number, number][] = [
    // [athleteName, squatLbs, benchLbs, deadliftLbs] — baseline
    ["Alex Rivera", 185, 135, 225],
    ["Jordan Kim", 155, 115, 205],
    ["Sam Chen", 225, 165, 275],
    ["Taylor Brooks", 135, 95, 175],
  ]

  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000)

  for (const [athleteName, squatBaseline, benchBaseline, dlBaseline] of plData) {
    const athlete = athletes.find((a) => a.name === athleteName)!
    // Baselines (60 days ago)
    await prisma.pREntry.createMany({
      data: [
        { athleteId: athlete.id, liftId: squat.id, leaderboardId: powerlifting.id, weightLbs: squatBaseline, date: daysAgo(60) },
        { athleteId: athlete.id, liftId: bench.id, leaderboardId: powerlifting.id, weightLbs: benchBaseline, date: daysAgo(60) },
        { athleteId: athlete.id, liftId: deadlift.id, leaderboardId: powerlifting.id, weightLbs: dlBaseline, date: daysAgo(60) },
      ],
    })
    // Midpoint PRs (30 days ago)
    await prisma.pREntry.createMany({
      data: [
        { athleteId: athlete.id, liftId: squat.id, leaderboardId: powerlifting.id, weightLbs: squatBaseline * 1.08, date: daysAgo(30) },
        { athleteId: athlete.id, liftId: bench.id, leaderboardId: powerlifting.id, weightLbs: benchBaseline * 1.06, date: daysAgo(30) },
        { athleteId: athlete.id, liftId: deadlift.id, leaderboardId: powerlifting.id, weightLbs: dlBaseline * 1.05, date: daysAgo(30) },
      ],
    })
    // Current PRs (varies)
    const squatGain = athleteName === "Alex Rivera" ? 1.22 : athleteName === "Jordan Kim" ? 1.15 : athleteName === "Sam Chen" ? 1.1 : 1.18
    const benchGain = athleteName === "Alex Rivera" ? 1.18 : athleteName === "Jordan Kim" ? 1.12 : athleteName === "Sam Chen" ? 1.08 : 1.14
    const dlGain = athleteName === "Alex Rivera" ? 1.2 : athleteName === "Jordan Kim" ? 1.14 : athleteName === "Sam Chen" ? 1.09 : 1.17
    await prisma.pREntry.createMany({
      data: [
        { athleteId: athlete.id, liftId: squat.id, leaderboardId: powerlifting.id, weightLbs: Math.round(squatBaseline * squatGain), date: daysAgo(3) },
        { athleteId: athlete.id, liftId: bench.id, leaderboardId: powerlifting.id, weightLbs: Math.round(benchBaseline * benchGain), date: daysAgo(3) },
        { athleteId: athlete.id, liftId: deadlift.id, leaderboardId: powerlifting.id, weightLbs: Math.round(dlBaseline * dlGain), date: daysAgo(3) },
      ],
    })
  }

  // Push Day entries
  for (const athlete of athletes.slice(0, 3)) {
    const benchBase = plData.find(([n]) => n === athlete.name)![2]
    const ohpBase = Math.round(benchBase * 0.65)
    await prisma.pREntry.createMany({
      data: [
        { athleteId: athlete.id, liftId: bench.id, leaderboardId: pushDay.id, weightLbs: benchBase, date: daysAgo(45) },
        { athleteId: athlete.id, liftId: ohp.id, leaderboardId: pushDay.id, weightLbs: ohpBase, date: daysAgo(45) },
        { athleteId: athlete.id, liftId: bench.id, leaderboardId: pushDay.id, weightLbs: Math.round(benchBase * 1.12), date: daysAgo(7) },
        { athleteId: athlete.id, liftId: ohp.id, leaderboardId: pushDay.id, weightLbs: Math.round(ohpBase * 1.1), date: daysAgo(7) },
      ],
    })
  }

  console.log("Seed complete!")
}

main()
  .catch(console.error)
  .finally(() => process.exit(0))
