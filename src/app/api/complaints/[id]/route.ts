import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  complaints,
  locations,
  departments,
  duplicateClusters,
  complaintMedia,
  aiAnalyses,
  priorityAssessments,
  complaintStatusHistories,
  citizens,
} from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { PriorityLevel } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Complaint ID is required",
          },
        },
        { status: 400 }
      );
    }

    const [row] = await db
      .select({
        complaint: complaints,
        location: locations,
        department: departments,
        priority: priorityAssessments,
        analysis: aiAnalyses,
        cluster: duplicateClusters,
        citizen: citizens,
      })
      .from(complaints)
      .leftJoin(departments, eq(complaints.departmentId, departments.id))
      .leftJoin(locations, eq(complaints.locationId, locations.id))
      .leftJoin(priorityAssessments, eq(complaints.id, priorityAssessments.complaintId))
      .leftJoin(aiAnalyses, eq(complaints.id, aiAnalyses.complaintId))
      .leftJoin(duplicateClusters, eq(complaints.clusterId, duplicateClusters.id))
      .leftJoin(citizens, eq(complaints.citizenId, citizens.id))
      .where(eq(complaints.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Complaint with ID '${id}' was not found.`,
            retryable: false,
          },
        },
        { status: 404 }
      );
    }

    // Fetch media and status history
    const media = await db
      .select()
      .from(complaintMedia)
      .where(eq(complaintMedia.complaintId, id));

    const statusHistory = await db
      .select()
      .from(complaintStatusHistories)
      .where(eq(complaintStatusHistories.complaintId, id))
      .orderBy(asc(complaintStatusHistories.createdAt));

    const { complaint, location, department, priority, analysis, cluster, citizen } = row;

    return NextResponse.json({
      id: complaint.id,
      citizenId: complaint.citizenId,
      text: complaint.text,
      category: complaint.category,
      categoryHint: complaint.categoryHint,
      severity: complaint.severity,
      urgency: complaint.urgency,
      status: complaint.status,
      departmentId: complaint.departmentId,
      clusterId: complaint.clusterId,
      createdAt: complaint.createdAt.toISOString(),
      updatedAt: complaint.updatedAt.toISOString(),
      citizen: citizen
        ? {
            id: citizen.id,
            name: citizen.name,
            email: citizen.email,
            phone: citizen.phone,
            role: citizen.role,
          }
        : null,
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
      cluster: cluster
        ? {
            id: cluster.id,
            category: cluster.category,
            size: cluster.size,
            representativeComplaintId: cluster.representativeComplaintId,
          }
        : null,
      priority: priority
        ? {
            score: priority.score,
            level: priority.level as PriorityLevel,
            signals: priority.signals,
            reasons: priority.reasons,
          }
        : null,
      analysis: analysis
        ? {
            status: analysis.status,
            category: analysis.category,
            categoryConfidence: analysis.categoryConfidence,
            severity: analysis.severity,
            severityConfidence: analysis.severityConfidence,
            explanation: analysis.explanation,
          }
        : null,
      media: media.map((m) => ({
        id: m.id,
        type: m.type,
        storageKey: m.storageKey,
        mime: m.mime,
        filename: m.filename,
      })),
      status_history: statusHistory.map((sh) => ({
        id: sh.id,
        complaintId: sh.complaintId,
        fromStatus: sh.fromStatus,
        toStatus: sh.toStatus,
        note: sh.note,
        changedBy: sh.changedBy,
        changedByName: sh.changedByName,
        createdAt: sh.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Complaint detail error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL",
          message: "Failed to retrieve complaint details.",
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
