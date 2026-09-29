// Registration / login / current-user (backend PRD §6). Public registration always creates
// role CITIZEN; authority accounts are created with `node scripts/create-staff.mjs`.
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import { citizen, department } from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { type Actor, hashPassword, signToken, verifyPassword } from "@/lib/auth";
import { Errors } from "@/lib/http";
import type { loginInput, registerInput } from "@/lib/validation";

export function publicUser(u: typeof citizen.$inferSelect, departmentCode: string | null = null) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    department: departmentCode,
    created_at: u.createdAt,
  };
}

function authResponse(u: typeof citizen.$inferSelect, departmentCode: string | null) {
  const { token, expiresIn } = signToken(u.id, u.role);
  return { user: publicUser(u, departmentCode), access_token: token, token_type: "Bearer", expires_in: expiresIn };
}

export async function registerCitizen(input: z.infer<typeof registerInput>) {
  const [existing] = await db.select({ id: citizen.id }).from(citizen).where(eq(citizen.email, input.email));
  if (existing) throw Errors.conflict("An account with this email already exists");
  const passwordHash = await hashPassword(input.password);
  try {
    const [u] = await db
      .insert(citizen)
      .values({ name: input.name, email: input.email, phone: input.phone ?? null, passwordHash, role: "CITIZEN" })
      .returning();
    await writeAudit(db, { entityType: "citizen", entityId: u.id, action: "USER_REGISTER", actorId: u.id });
    return authResponse(u, null);
  } catch (e) {
    // Unique-violation race on email.
    if ((e as { code?: string; cause?: { code?: string } }).code === "23505" || (e as { cause?: { code?: string } }).cause?.code === "23505") {
      throw Errors.conflict("An account with this email already exists");
    }
    throw e;
  }
}

export async function login(input: z.infer<typeof loginInput>) {
  const [row] = await db
    .select({ user: citizen, departmentCode: department.code })
    .from(citizen)
    .leftJoin(department, eq(citizen.departmentId, department.id))
    .where(eq(citizen.email, input.email));
  const ok = await verifyPassword(input.password, row?.user.passwordHash ?? null);
  if (!row || !ok || !row.user.isActive) {
    // Same message for unknown email / wrong password / disabled account.
    throw Errors.unauthenticated("Invalid email or password");
  }
  return authResponse(row.user, row.departmentCode);
}

export async function currentUser(actor: Actor) {
  const [row] = await db
    .select({ user: citizen, departmentCode: department.code })
    .from(citizen)
    .leftJoin(department, eq(citizen.departmentId, department.id))
    .where(eq(citizen.id, actor.id));
  return publicUser(row.user, row.departmentCode);
}
