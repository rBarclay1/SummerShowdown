import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "../../generated/prisma/client.js"

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" })
const prisma = new PrismaClient({ adapter } as Parameters<typeof PrismaClient>[0])

async function main() {
  const lbs = await prisma.leaderboard.findMany({
    include: { mainLift: true, entries: { include: { athlete: true } } },
    orderBy: { id: "asc" },
  })
  for (const lb of lbs) {
    const athletes = [...new Set(lb.entries.map((e) => e.athlete.name))]
    console.log(
      `id=${lb.id}  name="${lb.name}"  lift="${lb.mainLift.name}"  entries=${lb.entries.length}  athletes=[${athletes.join(", ")}]`
    )
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
