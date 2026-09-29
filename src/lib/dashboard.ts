// GET /api/dashboard/overview aggregates (docs/07 §10). Real computed data only;
// arrays are empty until data exists. Department officers see their department only.
import { and, eq, notInArray, type SQL, sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import type { Actor } from "@/lib/auth";
import { INACTIVE_STATUSES } from "@/lib/lifecycle";

export async function dashboardOverview(actor: Actor) {
  const scope: SQL | undefined =
    actor.role === "DEPT_OFFICER"
      ? actor.departmentId
        ? eq(s.complaint.departmentId, actor.departmentId)
        : sql`false`
      : undefined;

  const [totals] = await db
    .select({
      open: sql<number>`count(*) filter (where ${s.complaint.status} not in ('RESOLVED','CLOSED','REJECTED','DUPLICATE_MERGED'))::int`,
      resolved: sql<number>`count(*) filter (where ${s.complaint.status} in ('RESOLVED','CLOSED'))::int`,
      clusters: sql<number>`count(distinct ${s.complaint.clusterId}) filter (where ${s.duplicateCluster.size} > 1)::int`,
    })
    .from(s.complaint)
    .leftJoin(s.duplicateCluster, eq(s.complaint.clusterId, s.duplicateCluster.id))
    .where(scope);

  const [byCategory, bySeverity, byStatus, volume, hotspots, byPriority] = await Promise.all([
    db
      .select({ category: s.complaint.category, count: sql<number>`count(*)::int` })
      .from(s.complaint)
      .where(and(scope, sql`${s.complaint.category} is not null`))
      .groupBy(s.complaint.category)
      .orderBy(sql`count(*) desc`),
    db
      .select({ severity: s.complaint.severity, count: sql<number>`count(*)::int` })
      .from(s.complaint)
      .where(and(scope, sql`${s.complaint.severity} is not null`))
      .groupBy(s.complaint.severity)
      .orderBy(sql`count(*) desc`),
    db
      .select({ status: s.complaint.status, count: sql<number>`count(*)::int` })
      .from(s.complaint)
      .where(scope)
      .groupBy(s.complaint.status)
      .orderBy(sql`count(*) desc`),
    db
      .select({
        date: sql<string>`to_char(date_trunc('day', ${s.complaint.createdAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(s.complaint)
      .where(and(scope, sql`${s.complaint.createdAt} >= now() - interval '30 days'`))
      .groupBy(sql`date_trunc('day', ${s.complaint.createdAt})`)
      .orderBy(sql`date_trunc('day', ${s.complaint.createdAt})`),
    db
      .select({
        geohash: sql<string>`left(${s.location.geohash}, 5)`,
        count: sql<number>`count(*)::int`,
        lat: sql<number>`avg(${s.location.lat})`,
        lng: sql<number>`avg(${s.location.lng})`,
      })
      .from(s.complaint)
      .innerJoin(s.location, eq(s.complaint.locationId, s.location.id))
      .where(and(scope, notInArray(s.complaint.status, INACTIVE_STATUSES)))
      .groupBy(sql`left(${s.location.geohash}, 5)`)
      .orderBy(sql`count(*) desc`)
      .limit(10),
    db
      .select({ level: s.priorityAssessment.level, count: sql<number>`count(*)::int` })
      .from(s.complaint)
      .innerJoin(s.priorityAssessment, eq(s.priorityAssessment.complaintId, s.complaint.id))
      .where(scope)
      .groupBy(s.priorityAssessment.level)
      .orderBy(sql`count(*) desc`),
  ]);

  return {
    totals: { open: totals.open, resolved: totals.resolved, clusters: totals.clusters },
    by_category: byCategory,
    by_severity: bySeverity,
    by_status: byStatus,
    by_priority_level: byPriority,
    volume_over_time: volume,
    top_hotspots: hotspots.map((h) => ({ geohash5: h.geohash, count: h.count, lat: Number(h.lat), lng: Number(h.lng) })),
  };
}
