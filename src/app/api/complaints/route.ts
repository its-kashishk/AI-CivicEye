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
  auditLogs,
  pendingUploads,
  citizens,
} from "@/db/schema";
import { eq, desc, and, or, ilike, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { analyzeComplaintTextAndMedia } from "@/lib/ai-engine";
import { Category, Severity, ComplaintStatus, PriorityLevel } from "@/lib/types";

export const dynamic = "force-dynamic";

// POST /api/complaints - Create & orchestrate complaint
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { text, category_hint, urgency, location, media } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Complaint description is required.",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Ensure departments exist
    let allDepts = await db.select().from(departments);
    if (allDepts.length === 0) {
      // Seed departments
      const { CANONICAL_DEPARTMENTS } = await import("@/lib/constants");
      for (const d of CANONICAL_DEPARTMENTS) {
        await db.insert(departments).values({
          code: d.code,
          name: d.name,
          defaultCategories: d.categories,
        }).onConflictDoNothing();
      }
      allDepts = await db.select().from(departments);
    }

    // Ensure citizen record
    let citizenId = user?.id;
    if (!citizenId) {
      const [anon] = await db
        .insert(citizens)
        .values({
          name: "Anonymous Citizen",
          role: "CITIZEN",
        })
        .returning();
      citizenId = anon.id;
    }

    // 1. Save Location
    let locationId: string | null = null;
    if (location && (location.lat || location.lng || location.address)) {
      const [savedLoc] = await db
        .insert(locations)
        .values({
          lat: location.lat || null,
          lng: location.lng || null,
          address: location.address || null,
          ward: location.ward || "Ward A - Central",
          geohash:
            location.lat && location.lng
              ? `${Math.round(location.lat * 1000)}_${Math.round(location.lng * 1000)}`
              : null,
        })
        .returning();
      locationId = savedLoc.id;
    }

    // 2. Fetch pending uploads for CV info
    let cvCategory: Category | null = null;
    let cvConfidence = 0.85;
    const mediaRecords: Array<{
      type: "IMAGE" | "AUDIO";
      storageKey: string;
      mime?: string | null;
      filename?: string | null;
    }> = [];

    if (media && Array.isArray(media)) {
      for (const m of media) {
        if (m.upload_id) {
          const [pending] = await db
            .select()
            .from(pendingUploads)
            .where(eq(pendingUploads.id, m.upload_id))
            .limit(1);

          if (pending) {
            mediaRecords.push({
              type: (pending.type as "IMAGE" | "AUDIO") || "IMAGE",
              storageKey: pending.dataUrl || pending.transcript || "stored_asset",
              mime: pending.mime,
              filename: pending.filename,
            });

            if (pending.cvPreview) {
              const preview = pending.cvPreview as {
                category?: Category;
                confidence?: number;
              };
              if (preview.category) cvCategory = preview.category;
              if (preview.confidence) cvConfidence = preview.confidence;
            }
          }
        }
      }
    }

    // 3. Query recent complaints for duplicate clustering
    const recentRows = await db
      .select({
        id: complaints.id,
        text: complaints.text,
        category: complaints.category,
        clusterId: complaints.clusterId,
        createdAt: complaints.createdAt,
        lat: locations.lat,
        lng: locations.lng,
      })
      .from(complaints)
      .leftJoin(locations, eq(complaints.locationId, locations.id))
      .orderBy(desc(complaints.createdAt))
      .limit(50);

    // 4. Run AI Decision Pipeline
    const aiResult = analyzeComplaintTextAndMedia({
      text,
      categoryHint: category_hint as Category,
      urgency: urgency as Severity,
      cvCategory,
      cvConfidence,
      location,
      existingComplaints: recentRows,
    });

    // 5. Handle duplicate cluster linking
    let clusterId: string | null = null;
    if (aiResult.duplicateMatch.isDuplicate && aiResult.duplicateMatch.matchedComplaintIds.length > 0) {
      const matchId = aiResult.duplicateMatch.matchedComplaintIds[0];
      const [matchedRow] = await db
        .select()
        .from(complaints)
        .where(eq(complaints.id, matchId))
        .limit(1);

      if (matchedRow?.clusterId) {
        clusterId = matchedRow.clusterId;
        // Increment cluster size
        await db
          .update(duplicateClusters)
          .set({ size: sql`${duplicateClusters.size} + 1` })
          .where(eq(duplicateClusters.id, clusterId));
      } else if (matchedRow) {
        // Create new cluster
        const [newCluster] = await db
          .insert(duplicateClusters)
          .values({
            category: aiResult.category,
            representativeComplaintId: matchedRow.id,
            centroid: { lat: location?.lat, lng: location?.lng },
            size: 2,
          })
          .returning();
        clusterId = newCluster.id;

        // Update initial complaint with cluster id
        await db
          .update(complaints)
          .set({ clusterId: newCluster.id })
          .where(eq(complaints.id, matchedRow.id));
      }
    }

    // 6. Match Department ID
    const targetDept = allDepts.find((d) => d.code === aiResult.departmentCode) || allDepts[0];

    // 7. Insert Main Complaint
    const finalStatus: ComplaintStatus = "ROUTED";

    const [newComplaint] = await db
      .insert(complaints)
      .values({
        citizenId,
        locationId,
        text: text.trim(),
        categoryHint: (category_hint as Category) || null,
        category: aiResult.category,
        severity: aiResult.severity,
        urgency: (urgency as Severity) || null,
        status: finalStatus,
        departmentId: targetDept ? targetDept.id : null,
        clusterId,
      })
      .returning();

    // 8. Insert Media Items
    for (const m of mediaRecords) {
      await db.insert(complaintMedia).values({
        complaintId: newComplaint.id,
        type: m.type,
        storageKey: m.storageKey,
        mime: m.mime,
        filename: m.filename,
      });
    }

    // 9. Insert AI Analysis
    await db.insert(aiAnalyses).values({
      complaintId: newComplaint.id,
      status: "COMPLETED",
      category: aiResult.category,
      categoryConfidence: aiResult.categoryConfidence,
      severity: aiResult.severity,
      severityConfidence: aiResult.severityConfidence,
      explanation: aiResult.explanation,
      nlpResult: { signals: aiResult.prioritySignals },
      cvResult: cvCategory ? { cvCategory, cvConfidence } : null,
      modelVersions: { nlp: "civic-nlp-v2.1", cv: "civic-cv-v1.4", priority: "v1.0" },
    });

    // 10. Insert Priority Assessment
    await db.insert(priorityAssessments).values({
      complaintId: newComplaint.id,
      score: aiResult.priorityScore,
      level: aiResult.priorityLevel,
      signals: aiResult.prioritySignals,
      reasons: aiResult.priorityReasons,
      weightsVersion: "v1.0",
    });

    // 11. Insert Status History & Audit Log
    await db.insert(complaintStatusHistories).values({
      complaintId: newComplaint.id,
      fromStatus: null,
      toStatus: "SUBMITTED",
      note: "Complaint lodged via citizen portal",
      changedBy: citizenId,
      changedByName: user?.name || "Citizen",
    });

    await db.insert(complaintStatusHistories).values({
      complaintId: newComplaint.id,
      fromStatus: "SUBMITTED",
      toStatus: "ANALYZED",
      note: `AI classified as ${aiResult.category} (${Math.round(aiResult.categoryConfidence * 100)}% conf), Severity ${aiResult.severity}`,
      changedBy: null,
      changedByName: "AI Decision Engine",
    });

    await db.insert(complaintStatusHistories).values({
      complaintId: newComplaint.id,
      fromStatus: "ANALYZED",
      toStatus: "ROUTED",
      note: `Auto-routed to ${targetDept.name}`,
      changedBy: null,
      changedByName: "Orchestration Engine",
    });

    await db.insert(auditLogs).values({
      entityType: "COMPLAINT",
      entityId: newComplaint.id,
      action: "COMPLAINT_CREATED",
      actorId: citizenId,
      actorName: user?.name || "Citizen",
      payload: {
        category: aiResult.category,
        priority: aiResult.priorityScore,
        department: targetDept.code,
      },
    });

    return NextResponse.json(
      {
        id: newComplaint.id,
        status: finalStatus,
        category: aiResult.category,
        severity: aiResult.severity,
        priority: {
          score: aiResult.priorityScore,
          level: aiResult.priorityLevel,
          reasons: aiResult.priorityReasons,
        },
        department: targetDept.code,
        duplicate: {
          is_duplicate: aiResult.duplicateMatch.isDuplicate,
          cluster_id: clusterId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Complaint creation error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL",
          message: "Failed to create complaint. Please try again.",
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}

// GET /api/complaints - List & filter complaints
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);

    const mineOnly = searchParams.get("mine") === "true";
    const statusParam = searchParams.get("status") as ComplaintStatus | null;
    const categoryParam = searchParams.get("category") as Category | null;
    const severityParam = searchParams.get("severity") as Severity | null;
    const deptParam = searchParams.get("department");
    const searchQuery = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (mineOnly && user?.id) {
      conditions.push(eq(complaints.citizenId, user.id));
    }

    if (statusParam) {
      conditions.push(eq(complaints.status, statusParam));
    }

    if (categoryParam) {
      conditions.push(eq(complaints.category, categoryParam));
    }

    if (severityParam) {
      conditions.push(eq(complaints.severity, severityParam));
    }

    if (deptParam) {
      conditions.push(eq(departments.code, deptParam));
    }

    if (searchQuery && searchQuery.trim().length > 0) {
      const q = `%${searchQuery.trim()}%`;
      conditions.push(
        or(
          ilike(complaints.text, q),
          ilike(locations.address, q),
          ilike(departments.name, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(complaints)
      .leftJoin(departments, eq(complaints.departmentId, departments.id))
      .leftJoin(locations, eq(complaints.locationId, locations.id))
      .where(whereClause);

    const total = Number(countResult[0]?.count || 0);

    // Fetch items with joined metadata
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
      .orderBy(desc(complaints.createdAt))
      .limit(pageSize)
      .offset(offset);

    // Fetch media for these complaints
    const complaintIds = rows.map((r) => r.complaint.id);
    let allMedia: Array<typeof complaintMedia.$inferSelect> = [];
    if (complaintIds.length > 0) {
      allMedia = await db
        .select()
        .from(complaintMedia)
        .where(
          sql`${complaintMedia.complaintId} in (${sql.join(
            complaintIds.map((id) => sql`${id}::uuid`),
            sql`, `
          )})`
        );
    }

    const formattedItems = rows.map(({ complaint, location, department, priority, analysis }) => {
      const mediaList = allMedia.filter((m) => m.complaintId === complaint.id);
      return {
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
        media: mediaList.map((m) => ({
          id: m.id,
          type: m.type,
          storageKey: m.storageKey,
          mime: m.mime,
          filename: m.filename,
        })),
      };
    });

    return NextResponse.json({
      items: formattedItems,
      page,
      pageSize,
      total,
    });
  } catch (error) {
    console.error("Fetch complaints error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL",
          message: "Failed to fetch complaints.",
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
