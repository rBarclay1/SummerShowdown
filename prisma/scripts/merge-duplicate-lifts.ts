/**
 * Merge duplicate leaderboards that track the same lift.
 * For each group of leaderboards with the same mainLiftId:
 *   - Keep the board with the most entries (or lowest id on a tie) as the target.
 *   - Move all PREntries from the other boards into the target.
 *   - Delete the now-empty source boards.
 *
 * Run BEFORE adding the uniqueness constraint:
 *   npx tsx prisma/scripts/merge-duplicate-lifts.ts
 */

import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "../../generated/prisma/client.js"

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" })
const prisma = new PrismaClient({ adapter } as Parameters<typeof PrismaClient>[0])

async function main() {
  const leaderboards = await prisma.leaderboard.findMany({
    include: { mainLift: true, _count: { select: { entries: true } } },
    orderBy: { id: "asc" },
  })

  // Group by liftId
  const byLift = new Map<number, typeof leaderboards>()
  for (const lb of leaderboards) {
    const group = byLift.get(lb.mainLiftId) ?? []
    group.push(lb)
    byLift.set(lb.mainLiftId, group)
  }

  for (const [liftId, group] of byLift) {
    if (group.length < 2) continue

    // Pick the board with the most entries as the merge target (ties → lowest id)
    const target = group.reduce((best, lb) =>
      lb._count.entries > best._count.entries ||
      (lb._count.entries === best._count.entries && lb.id < best.id)
        ? lb
        : best
    )
    const sources = group.filter((lb) => lb.id !== target.id)

    const liftName = target.mainLift.name
    console.log(`\nLift: "${liftName}" (id=${liftId}) — ${group.length} boards, merging into id=${target.id} "${target.name}"`)

    for (const src of sources) {
      const moved = await prisma.pREntry.updateMany({
        where: { leaderboardId: src.id },
        data: { leaderboardId: target.id },
      })
      console.log(`  ← merged ${moved.count} entries from id=${src.id} "${src.name}"`)

      await prisma.leaderboard.delete({ where: { id: src.id } })
      console.log(`  ✓ deleted source leaderboard id=${src.id}`)
    }
  }

  console.log("\nDone.")
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
