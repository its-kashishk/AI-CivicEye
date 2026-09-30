import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { citizens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encodeSession, SESSION_COOKIE } from "@/lib/auth";
import { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, phone, role, departmentCode } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Email and password are required.",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Password must be at least 6 characters.",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Check if email already registered
    const [existing] = await db
      .select()
      .from(citizens)
      .where(eq(citizens.email, email.trim().toLowerCase()))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        {
          error: {
            code: "DUPLICATE_ACCOUNT",
            message: "An account with this email already exists. Please log in.",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    const assignedRole: UserRole = role || "CITIZEN";

    const [newUser] = await db
      .insert(citizens)
      .values({
        name: name?.trim() || "Citizen User",
        email: email.trim().toLowerCase(),
        passwordHash: password, // For demonstration/hackathon environment
        phone: phone || null,
        role: assignedRole,
        departmentCode: departmentCode || null,
      })
      .returning();

    const sessionPayload = {
      userId: newUser.id,
      email: newUser.email || "",
      name: newUser.name || "Citizen",
      role: newUser.role as UserRole,
      departmentCode: newUser.departmentCode,
    };

    const token = encodeSession(sessionPayload);

    const response = NextResponse.json(
      {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          departmentCode: newUser.departmentCode,
          createdAt: newUser.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL",
          message: "Registration failed. Please try again.",
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
