import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Backend tests hit a real PostgreSQL database. Use a SEPARATE database:
//   TEST_DATABASE_URL=postgresql://... npx vitest run
// (migrate it first: DATABASE_URL=$TEST_DATABASE_URL node scripts/migrate.mjs)
const testDb = process.env.TEST_DATABASE_URL;
if (!testDb) {
  throw new Error("TEST_DATABASE_URL is required to run tests (use a dedicated, migrated database).");
}

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/backend/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    env: {
      DATABASE_URL: testDb,
      // Test-only value; not a real secret.
      SECRET_KEY: "test-only-secret-key-not-for-production",
      ML_MODE: "mock",
      UPLOAD_DIR: path.join(os.tmpdir(), "civiceye-test-uploads"),
    },
  },
});
