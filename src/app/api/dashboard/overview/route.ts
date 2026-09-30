import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  complaints,
  locations,
  duplicateClusters,
  priorityAssessments,
} from "@/db/schema";
import { eq, sql, desc, and, ne } from "drizzle-orm";
import { Category, Severity, ComplaintStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Total counts
    const allComplaints = await db
      .select({
        id: complaints.id,
        status: complaints.status,
        category: complaints.category,
        severity: complaints.severity,
        createdAt: complaints.createdAt,
        priorityLevel: priorityAssessments.level,
      })
      .from(complaints)
      .leftJoin(
        priorityAssessments,
        eq(complaints.id, priorityAssessments.complaintId)
      );

    const totalCount = allComplaints.length;
    let openCount = 0;
    let resolvedCount = 0;
    let criticalCount = 0;

    const categoryMap: Record<string, number> = {};
    const severityMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {};
    const dateMap: Record<string, number> = {};

    for (const item of allComplaints) {
      if (item.status === "RESOLVED" || item.status === "CLOSED") {
        resolvedCount++;
      } else if (item.status !== "REJECTED") {
        openCount++;
      }

      if (item.severity === "CRITICAL" || item.priorityLevel === "CRITICAL") {
        criticalCount++;
      }

      if (item.category) {
        categoryMap[item.category] = (categoryMap[item.category] || 0) + 1;
      }

      if (item.severity) {
        severityMap[item.severity] = (severityMap[item.severity] || 0) + 1;
      }

      if (item.status) {
        statusMap[item.status] = (statusMap[item.status] || 0) + 1;
      }

      // Volume over time (group by YYYY-MM-DD)
      const dateKey = item.createdAt.toISOString().split("T")[0];
      dateMap[dateKey] = (dateMap[dateKey] || 0) + 1;
    }

    // Clusters count
    const [clusterCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(duplicateClusters);
    const clusterCount = Number(clusterCountResult?.count || 0);

    // Hotspot aggregation (group by location / address)
    const hotspotRows = await db
      .select({
        address: locations.address,
        lat: locations.lat,
        lng: locations.lng,
        count: sql<number>`count(${complaints.id})`,
      })
      .from(complaints)
      .innerJoin(locations, eq(complaints.locationId, locations.id))
      .groupBy(locations.address, locations.lat, locations.lng)
      .orderBy(desc(sql`count(${complaints.id})`))
      .limit(8);

    const top_hotspots = hotspotRows
      .filter((h) => h.address || (h.lat && h.lng))
      .map((h) => ({
        address: h.address || "Unspecified Location",
        lat: h.lat || 19.076,
        lng: h.lng || 72.8777,
        count: Number(h.count || 1),
        dominant_category: "POTHOLE_ROAD_DAMAGE" as Category,
        severity: "HIGH" as Severity,
      }));

    const by_category = Object.entries(categoryMap).map(([category, count]) => ({
      category: category as Category,
      count,
    }));

    const by_severity = Object.entries(severityMap).map(([severity, count]) => ({
      severity: severity as Severity,
      count,
    }));

    const by_status = Object.entries(statusMap).map(([status, count]) => ({
      status: status as ComplaintStatus,
      count,
    }));

    const volume_over_time = Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        count,
      }));

    return NextResponse.json({
      totals: {
        open: openCount,
        resolved: resolvedCount,
        clusters: clusterCount,
        critical: criticalCount,
        total: totalCount,
      },
      by_category,
      by_severity,
      by_status,
      volume_over_time,
      top_hotspots,
    });
  } catch (error) {
    console.error("Dashboard overview error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL",
          message: "Failed to load dashboard overview data.",
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
