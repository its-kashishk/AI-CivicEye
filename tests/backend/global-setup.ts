// Resets the dedicated TEST database before each run (never a dev/prod database).
import pg from "pg";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is required");
  const dbName = new URL(url).pathname.replace("/", "");
  if (!dbName.includes("test")) {
    throw new Error(`Refusing to truncate '${dbName}': test database name must contain 'test'`);
  }
  const pool = new pg.Pool({ connectionString: url });
  try {
    // Cascades to complaint, media, analysis, priority, history. `department` (reference data) is kept.
    await pool.query("TRUNCATE citizen, location, duplicate_cluster, audit_log RESTART IDENTITY CASCADE");
  } finally {
    await pool.end();
  }
}
