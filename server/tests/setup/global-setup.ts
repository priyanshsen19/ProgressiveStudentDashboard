import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

// Provisions a fresh SQLite schema for the test database before the suite runs.
// Uses `prisma db push` (no migration history needed) against test.db.
export default function setup() {
  const dbFile = path.join(__dirname, "..", "..", "prisma", "test.db");
  // Start from a clean database each run.
  for (const f of [dbFile, `${dbFile}-journal`]) {
    try {
      rmSync(f);
    } catch {
      /* not present — fine */
    }
  }

  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
}
