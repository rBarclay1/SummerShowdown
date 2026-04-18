import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "../../generated/prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!url) throw new Error("Missing env var: TURSO_DATABASE_URL")
  if (!authToken) throw new Error("Missing env var: TURSO_AUTH_TOKEN")
  const adapter = new PrismaLibSql({ url, authToken })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
