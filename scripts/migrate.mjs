// Applies all SQL migrations in ./drizzle to the database in DATABASE_URL.
//   node scripts/migrate.mjs
// (Equivalent to `npx drizzle-kit migrate`, but always honours DATABASE_URL from the
//  environment / .env instead of the URL in drizzle.config.json.)
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required (see .env.example)");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });
try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("Migrations applied successfully.");
} catch (err) {
  console.error("Migration failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
