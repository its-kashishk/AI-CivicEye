// Authentication (MVP): scrypt password hashing + HS256 bearer tokens, both via Node
// `crypto` (no extra dependencies). Authorization = RBAC per docs/04 §6.
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { citizen } from "@/db/schema";
import { config, getSecretKey } from "@/lib/config";
import type { UserRole } from "@/lib/enums";
import { Errors } from "@/lib/http";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const KEY_LEN = 64;

/** Format: scrypt$<saltHex>$<hashHex>. Never store plain text. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const b64url = (input: Buffer | string) => Buffer.from(input).toString("base64url");

export interface TokenPayload {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export function signToken(sub: string, role: UserRole, ttlSeconds = config.tokenTtlSeconds()) {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = { sub, role, iat: now, exp: now + ttlSeconds };
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", getSecretKey()).update(`${head}.${body}`).digest();
  return { token: `${head}.${body}.${b64url(sig)}`, expiresIn: ttlSeconds };
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [head, body, sig] = parts;
  const expected = createHmac("sha256", getSecretKey()).update(`${head}.${body}`).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as TokenPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export interface Actor {
  id: string;
  role: UserRole;
  departmentId: string | null;
  email: string | null;
  name: string | null;
}

/** Resolves the bearer token to an active user; optionally enforces allowed roles. */
export async function requireUser(req: Request, roles?: readonly UserRole[]): Promise<Actor> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) throw Errors.unauthenticated();
  const payload = verifyToken(match[1]);
  if (!payload) throw Errors.unauthenticated("Invalid or expired token");

  const [user] = await db.select().from(citizen).where(eq(citizen.id, payload.sub)).limit(1);
  if (!user || !user.isActive) throw Errors.unauthenticated("Account not found or disabled");

  // Role is taken from the DB (not the token) so role changes apply immediately.
  const actor: Actor = {
    id: user.id,
    role: user.role,
    departmentId: user.departmentId,
    email: user.email,
    name: user.name,
  };
  if (roles && !roles.includes(actor.role)) throw Errors.forbidden();
  return actor;
}
