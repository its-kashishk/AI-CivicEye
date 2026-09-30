import { NextResponse } from "next/server";
import { db } from "@/db";
import { duplicateCluster, complaint, location, department } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clusterRows = await db
      .select()
      .from(duplicateCluster)
      .orderBy(desc(duplicateCluster.size), desc(duplicateCluster.createdAt));

    const clustersWithMembers = await Promise.all(
      clusterRows.map(async (cluster) => {
        const memberComplaints = await db
          .select({
            complaint: complaint,
            location: location,
            department: department,
          })
          .from(complaint)
          .leftJoin(location, eq(complaint.locationId, location.id))
          .leftJoin(department, eq(complaint.departmentId, department.id))
          .where(eq(complaint.clusterId, cluster.id))
          .orderBy(desc(complaint.createdAt));

        const representative = memberComplaints.find(
          (m) => m.complaint.id === cluster.representativeComplaintId
        ) || memberComplaints[0];

        return {
          cluster_id: cluster.id,
          category: cluster.category,
          size: cluster.size,
          centroid: cluster.centroid,
          created_at: cluster.createdAt.toISOString(),
          representative: representative
            ? {
                id: representative.complaint.id,
                text: representative.complaint.text,
                status: representative.complaint.status,
                severity: representative.complaint.severity,
                created_at: representative.complaint.createdAt.toISOString(),
                location: representative.location?.address || "Unknown location",
                department: representative.department?.name || "General",
              }
            : null,
          member_ids: memberComplaints.map((m) => m.complaint.id),
          members: memberComplaints.map(({ complaint, location, department }) => ({
            id: complaint.id,
            text: complaint.text,
            status: complaint.status,
            severity: complaint.severity,
            created_at: complaint.createdAt.toISOString(),
            location: location?.address || "Unknown",
            department: department?.name || "General",
          })),
        };
      })
    );

    return NextResponse.json({ clusters: clustersWithMembers });
  } catch (error) {
    console.error("Duplicate clusters error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL",
          message: "Failed to fetch duplicate clusters.",
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
