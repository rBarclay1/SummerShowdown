/**
 * Data migration: split multi-lift leaderboards into single-lift boards.
 *
 * For each leaderboard that has more than one lift (via LeaderboardLift),
 * the main lift stays on the existing leaderboard. Each additional lift
 * gets its own new leaderboard named "<original> – <lift name>", and all
 * PREntries for that (leaderboard, lift) pair are moved to the new board.
 *
 * Run BEFORE applying the schema migration that drops LeaderboardLift:
 *   npx tsx prisma/scripts/split-multi-lift-leaderboards.ts
 */

import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "../../generated/prisma/client.js"

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" })
const prisma = new PrismaClient({ adapter })

async function main() {
  const leaderboards = await prisma.leaderboard.findMany({
    include: {
      mainLift: true,
      leaderboardLifts: { include: { lift: true } },
    },
  })

  for (const lb of leaderboards) {
    const extraLifts = lb.leaderboardLifts.filter((ll) => ll.liftId !== lb.mainLiftId)
    if (extraLifts.length === 0) {
      console.log(`[skip] "${lb.name}" — already single-lift`)
      continue
    }

    console.log(`[split] "${lb.name}" → ${extraLifts.length} extra lift(s)`)

    for (const { lift } of extraLifts) {
      // Choose a name for the new board, avoiding unique constraint collisions
      let newName = `${lb.name} – ${lift.name}`
      let suffix = 2
      while (await prisma.leaderboard.findUnique({ where: { name: newName } })) {
        newName = `${lb.name} – ${lift.name} (${suffix++})`
      }

      const newBoard = await prisma.leaderboard.create({
        data: {
          name: newName,
          mainLiftId: lift.id,
          ...(lb.endDate ? { endDate: lb.endDate } : {}),
          leaderboardLifts: { create: [{ liftId: lift.id }] },
        },
      })

      // Move PREntries for this lift from the old board to the new board
      const moved = await prisma.pREntry.updateMany({
        where: { leaderboardId: lb.id, liftId: lift.id },
        data: { leaderboardId: newBoard.id },
      })

      console.log(
        `  ✓ Created "${newName}" (id=${newBoard.id}), moved ${moved.count} entries`
      )
    }
  }

  console.log("\nDone. Safe to apply schema migration now.")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
