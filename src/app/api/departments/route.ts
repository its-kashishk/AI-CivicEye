import { NextResponse } from "next/server";
import { db } from "@/db";
import { departments } from "@/db/schema";
import { CANONICAL_DEPARTMENTS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let allDepts = await db.select().from(departments);

    if (allDepts.length === 0) {
      // Seed canonical departments
      for (const d of CANONICAL_DEPARTMENTS) {
        await db.insert(departments).values({
          code: d.code,
          name: d.name,
          defaultCategories: d.categories,
        }).onConflictDoNothing();
      }
      allDepts = await db.select().from(departments);
    }

    return NextResponse.json({ departments: allDepts });
  } catch (error) {
    console.error("Departments fetch error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL",
          message: "Failed to fetch departments",
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
