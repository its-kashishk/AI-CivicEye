import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { complaints, locations, pendingUploads } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { analyzeComplaintTextAndMedia } from "@/lib/ai-engine";
import { Category, Severity } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, category_hint, urgency, location, media } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Description text is required for AI analysis.",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Inspect if media upload has CV category
    let cvCategory: Category | null = null;
    let cvConfidence = 0.85;

    if (media && Array.isArray(media) && media.length > 0) {
      const imgMedia = media.find((m: { type: string }) => m.type === "IMAGE");
      if (imgMedia?.upload_id) {
        const [uploadRecord] = await db
          .select()
          .from(pendingUploads)
          .where(eq(pendingUploads.id, imgMedia.upload_id))
          .limit(1);

        if (uploadRecord?.cvPreview) {
          const preview = uploadRecord.cvPreview as {
            category?: Category;
            confidence?: number;
          };
          if (preview.category) cvCategory = preview.category;
          if (preview.confidence) cvConfidence = preview.confidence;
        }
      }
    }

    // Query recent complaints for duplicate detection
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

    const analysis = analyzeComplaintTextAndMedia({
      text,
      categoryHint: category_hint as Category,
      urgency: urgency as Severity,
      cvCategory,
      cvConfidence,
      location,
      existingComplaints: recentRows,
    });

    return NextResponse.json({
      category: analysis.category,
      category_confidence: analysis.categoryConfidence,
      severity: analysis.severity,
      severity_confidence: analysis.severityConfidence,
      priority: {
        score: analysis.priorityScore,
        level: analysis.priorityLevel,
        reasons: analysis.priorityReasons,
        signals: analysis.prioritySignals,
      },
      duplicate_preview: {
        is_duplicate: analysis.duplicateMatch.isDuplicate,
        cluster_id: analysis.duplicateMatch.clusterId,
        similar_count: analysis.duplicateMatch.similarCount,
        similar_ids: analysis.duplicateMatch.matchedComplaintIds,
      },
      explanation: analysis.explanation,
      suggested_department: analysis.departmentCode,
    });
  } catch (error) {
    console.error("AI analysis preview error:", error);
    return NextResponse.json(
      {
        error: {
          code: "ML_UNAVAILABLE",
          message: "AI analysis is temporarily unavailable. You can still submit your complaint.",
          retryable: true,
        },
      },
      { status: 503 }
    );
  }
}
