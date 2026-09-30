import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  complaints,
  complaintStatusHistories,
  auditLogs,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { ComplaintStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser();
    const body = await req.json();
    const { status, note } = body as { status: ComplaintStatus; note?: string };

    if (!status) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Target status is required.",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(complaints)
      .where(eq(complaints.id, id))
      .limit(1);

    if (!existing) {
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

    const fromStatus = existing.status;

    // Update status
    const [updated] = await db
      .update(complaints)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(complaints.id, id))
      .returning();

    const actorName = user?.name || "Authority Operator";

    // Insert status history
    const [historyEntry] = await db
      .insert(complaintStatusHistories)
      .values({
        complaintId: id,
        fromStatus,
        toStatus: status,
        note: note?.trim() || `Status updated from ${fromStatus} to ${status}`,
        changedBy: user?.id || null,
        changedByName: actorName,
      })
      .returning();

    // Insert audit log
    await db.insert(auditLogs).values({
      entityType: "COMPLAINT",
      entityId: id,
      action: "STATUS_CHANGE",
      actorId: user?.id || null,
      actorName,
      payload: {
        from: fromStatus,
        to: status,
        note: note || null,
      },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      updated_at: updated.updatedAt.toISOString(),
      status_history_entry: {
        id: historyEntry.id,
        fromStatus: historyEntry.fromStatus,
        toStatus: historyEntry.toStatus,
        note: historyEntry.note,
        changedByName: historyEntry.changedByName,
        createdAt: historyEntry.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Status update error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL",
          message: "Failed to update complaint status.",
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
