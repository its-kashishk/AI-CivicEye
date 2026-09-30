import { cookies } from "next/headers";
import { db } from "@/db";
import { citizens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { User, UserRole } from "./types";

const SESSION_COOKIE = "civiceye_session";

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  departmentCode?: string | null;
}

export function encodeSession(data: SessionData): string {
  return Buffer.from(JSON.stringify(data)).toString("base64");
}

export function decodeSession(token: string): SessionData | null {
  try {
    const json = Buffer.from(token, "base64").toString("utf-8");
    return JSON.parse(json) as SessionData;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionToken) return null;

    const session = decodeSession(sessionToken);
    if (!session?.userId) return null;

    const [user] = await db
      .select()
      .from(citizens)
      .where(eq(citizens.id, session.userId))
      .limit(1);

    if (!user) {
      // Fallback to session data if user record was purged
      return {
        id: session.userId,
        name: session.name,
        email: session.email,
        phone: null,
        role: session.role,
        departmentCode: session.departmentCode,
      };
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role as UserRole,
      departmentCode: user.departmentCode,
      createdAt: user.createdAt.toISOString(),
    };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE };
