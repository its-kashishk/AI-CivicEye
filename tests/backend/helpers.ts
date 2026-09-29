import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { citizen, department } from "@/db/schema";
import { hashPassword, signToken } from "@/lib/auth";
import type { UserRole } from "@/lib/enums";

type Handler = (req: Request, ctx: never) => Promise<Response>;

export const short = () => randomUUID().slice(0, 8);

export function mkReq(
  path: string,
  opts: { method?: string; token?: string; body?: unknown; form?: FormData; headers?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    body = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
  }
  return new Request(`http://localhost${path}`, { method: opts.method ?? (body ? "POST" : "GET"), headers, body });
}

/** Invokes a Next.js route handler directly and returns { status, body }. */
export async function call(handler: Handler, request: Request, params?: { id: string }) {
  const res = await handler(request, { params: Promise.resolve(params ?? {}) } as never);
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

/** Random far-apart coordinates so tests never accidentally cluster with each other. */
export function randomLocation() {
  return {
    lat: Math.round((Math.random() * 120 - 60) * 1e5) / 1e5,
    lng: Math.round((Math.random() * 340 - 170) * 1e5) / 1e5,
    address: "Test address (synthetic)",
  };
}

export async function makeUser(role: UserRole = "CITIZEN", departmentCode?: string) {
  let departmentId: string | null = null;
  if (departmentCode) {
    const [d] = await db.select({ id: department.id }).from(department).where(eq(department.code, departmentCode));
    departmentId = d.id;
  }
  const email = `${role.toLowerCase()}-${short()}@test.example`;
  const [u] = await db
    .insert(citizen)
    .values({ name: `Test ${role}`, email, passwordHash: await hashPassword("password123"), role, departmentId })
    .returning();
  return { id: u.id, email, token: signToken(u.id, role).token };
}

export const POTHOLE_TEXT = "There is a huge pothole near the main road and several people have already fallen.";
