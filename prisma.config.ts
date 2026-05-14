import { config } from "dotenv";
config({ path: ".env.local" });
config(); // fallback to .env
import { defineConfig } from "prisma/config";

// Prefer Turso (the runtime DB) over the local dev.db fallback so that
// `prisma db push` targets the same database the app actually uses.
const dbUrl =
  process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN
    ? `${process.env.TURSO_DATABASE_URL}?authToken=${process.env.TURSO_AUTH_TOKEN}`
    : process.env.DATABASE_URL

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: dbUrl,
  },
});