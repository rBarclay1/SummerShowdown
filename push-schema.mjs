import { readFileSync } from "fs";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const libsqlUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!libsqlUrl) throw new Error("Missing TURSO_DATABASE_URL");
if (!authToken) throw new Error("Missing TURSO_AUTH_TOKEN");

// Turso's Hrana HTTP API lives at https://, not libsql://
const baseUrl = libsqlUrl.replace(/^libsql:\/\//, "https://");

const sql = readFileSync("prisma/turso-setup.sql", "utf-8");

const statements = sql
  .split(";")
  .map((s) =>
    s
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n")
      .trim()
  )
  .filter((s) => s.length > 0);

console.log(`Applying ${statements.length} statements...`);

const requests = [
  ...statements.map((sql) => ({ type: "execute", stmt: { sql } })),
  { type: "close" },
];

const res = await fetch(`${baseUrl}/v2/pipeline`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ requests }),
});

const data = await res.json();

if (!res.ok) {
  throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
}

const errors = data.results?.filter((r) => r.type === "error");
if (errors?.length) {
  for (const e of errors) console.error("Statement error:", e.error?.message);
  process.exit(1);
}

console.log("Done!");
