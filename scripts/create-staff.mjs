// Creates an authority account (OPERATOR | DEPT_OFFICER | ADMIN). Public registration can only
// create CITIZEN accounts, so staff are provisioned with this script.
//
//   STAFF_PASSWORD='choose-a-password' node scripts/create-staff.mjs \
//     --email ops@example.org --name "Ops One" --role OPERATOR
//   ... --role DEPT_OFFICER --department ROADS_MUNICIPAL_ENGINEERING
//
// The password is read from STAFF_PASSWORD (not a CLI flag) to keep it out of shell history.
// Hash format matches src/lib/auth.ts: scrypt$<saltHex>$<hashHex>.
import "dotenv/config";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const scryptAsync = promisify(scrypt);
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);

const { email, name, role, department } = args;
const password = process.env.STAFF_PASSWORD;
const ROLES = ["OPERATOR", "DEPT_OFFICER", "ADMIN"];

if (!process.env.DATABASE_URL) fail("DATABASE_URL is required");
if (!email || !name || !ROLES.includes(role)) fail(`Usage: --email <e> --name <n> --role ${ROLES.join("|")} [--department <CODE>]`);
if (!password || password.length < 8) fail("Set STAFF_PASSWORD (min 8 characters) in the environment");
if (role === "DEPT_OFFICER" && !department) fail("--department <CODE> is required for DEPT_OFFICER");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  let departmentId = null;
  if (department) {
    const d = await pool.query("select id from department where code = $1", [department]);
    if (d.rowCount === 0) fail(`Unknown department code: ${department}`);
    departmentId = d.rows[0].id;
  }
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  const passwordHash = `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
  const res = await pool.query(
    `insert into citizen (name, email, password_hash, role, department_id)
     values ($1, lower($2), $3, $4, $5) returning id`,
    [name, email, passwordHash, role, departmentId],
  );
  console.log(`Created ${role} account ${email.toLowerCase()} (id ${res.rows[0].id})`);
} catch (err) {
  console.error("Failed:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
