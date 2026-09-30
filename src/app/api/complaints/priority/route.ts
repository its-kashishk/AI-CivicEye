import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  complaints,
  locations,
  departments,
  priorityAssessments,
  aiAnalyses,
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { PriorityLevel } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deptParam = searchParams.get("department");
    const levelParam = searchParams.get("level") as PriorityLevel | null;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25", 10)));
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (deptParam) {
      conditions.push(eq(departments.code, deptParam));
    }

    if (levelParam) {
      conditions.push(eq(priorityAssessments.level, levelParam));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        complaint: complaints,
        location: locations,
        department: departments,
        priority: priorityAssessments,
        analysis: aiAnalyses,
      })
      .from(complaints)
      .leftJoin(departments, eq(complaints.departmentId, departments.id))
      .leftJoin(locations, eq(complaints.locationId, locations.id))
      .leftJoin(priorityAssessments, eq(complaints.id, priorityAssessments.complaintId))
      .leftJoin(aiAnalyses, eq(complaints.id, aiAnalyses.complaintId))
      .where(whereClause)
      .orderBy(desc(priorityAssessments.score), desc(complaints.createdAt))
      .limit(pageSize)
      .offset(offset);

    const items = rows.map(({ complaint, location, department, priority, analysis }) => ({
      id: complaint.id,
      text: complaint.text,
      category: complaint.category,
      severity: complaint.severity,
      status: complaint.status,
      createdAt: complaint.createdAt.toISOString(),
      location: location
        ? {
            id: location.id,
            lat: location.lat,
            lng: location.lng,
            address: location.address,
            ward: location.ward,
          }
        : null,
      department: department
        ? {
            id: department.id,
            code: department.code,
            name: department.name,
          }
        : null,
      priority: priority
        ? {
            score: priority.score,
            level: priority.level as PriorityLevel,
            reasons: priority.reasons,
            signals: priority.signals,
          }
        : {
            score: 0,
            level: "LOW" as PriorityLevel,
            reasons: [],
          },
      analysis: analysis
        ? {
            categoryConfidence: analysis.categoryConfidence,
            severityConfidence: analysis.severityConfidence,
            explanation: analysis.explanation,
          }
        : null,
    }));

    return NextResponse.json({
      items,
      page,
      pageSize,
      total: items.length,
    });
  } catch (error) {
    console.error("Priority queue error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL",
          message: "Failed to load priority queue.",
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
