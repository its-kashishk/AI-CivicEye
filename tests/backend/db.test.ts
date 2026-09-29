import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import * as s from "@/db/schema";
import { CATEGORIES } from "@/lib/enums";
import { CATEGORY_TO_DEPARTMENT } from "@/lib/routing";
import { makeUser, short } from "./helpers";

async function newComplaint() {
  const u = await makeUser();
  const [c] = await db.insert(s.complaint).values({ citizenId: u.id, text: "direct insert" }).returning();
  return { u, c };
}

describe("migrations", () => {
  it("created every documented table", async () => {
    const res = await db.execute(sql`select table_name from information_schema.tables where table_schema = 'public'`);
    const names = res.rows.map((r) => (r as { table_name: string }).table_name);
    for (const t of [
      "citizen", "department", "location", "complaint", "complaint_media", "ai_analysis",
      "priority_assessment", "duplicate_cluster", "complaint_status_history", "audit_log",
    ]) {
      expect(names).toContain(t);
    }
  });

  it("seeded the canonical departments used by routing", async () => {
    const rows = await db.select().from(s.department);
    const codes = rows.map((d) => d.code);
    for (const code of new Set(Object.values(CATEGORY_TO_DEPARTMENT))) expect(codes).toContain(code);
    // every category is covered by exactly the seeded default_categories
    const covered = rows.flatMap((d) => d.defaultCategories);
    for (const cat of CATEGORIES) expect(covered).toContain(cat);
  });

  it("created the documented indexes", async () => {
    const res = await db.execute(sql`select indexname from pg_indexes where schemaname = 'public'`);
    const names = res.rows.map((r) => (r as { indexname: string }).indexname);
    for (const i of ["complaint_status_idx", "complaint_category_idx", "complaint_department_idx", "complaint_cluster_idx", "complaint_created_at_idx", "location_geohash_idx", "ai_analysis_complaint_uq", "priority_assessment_complaint_uq"]) {
      expect(names).toContain(i);
    }
  });
});

describe("models, defaults and relationships", () => {
  it("applies defaults and timestamps", async () => {
    const { c } = await newComplaint();
    expect(c.status).toBe("SUBMITTED");
    expect(c.createdAt).toBeInstanceOf(Date);
    expect(c.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("joins complaint -> department / location / analysis / priority / cluster", async () => {
    const { u } = await newComplaint();
    const [loc] = await db.insert(s.location).values({ lat: 19.07, lng: 72.87, geohash: "te7st12" }).returning();
    const [dept] = await db.select().from(s.department).where(eq(s.department.code, "WATER_SUPPLY"));
    const [cl] = await db.insert(s.duplicateCluster).values({ category: "WATER_LEAKAGE", size: 1 }).returning();
    const [c] = await db
      .insert(s.complaint)
      .values({ citizenId: u.id, locationId: loc.id, departmentId: dept.id, clusterId: cl.id, category: "WATER_LEAKAGE" })
      .returning();
    await db.insert(s.aiAnalysis).values({ complaintId: c.id, status: "COMPLETED", provider: "MOCK" });
    await db.insert(s.priorityAssessment).values({ complaintId: c.id, score: 42, level: "MEDIUM" });

    const [row] = await db
      .select({ code: s.department.code, lat: s.location.lat, score: s.priorityAssessment.score, provider: s.aiAnalysis.provider, size: s.duplicateCluster.size })
      .from(s.complaint)
      .innerJoin(s.department, eq(s.complaint.departmentId, s.department.id))
      .innerJoin(s.location, eq(s.complaint.locationId, s.location.id))
      .innerJoin(s.priorityAssessment, eq(s.priorityAssessment.complaintId, s.complaint.id))
      .innerJoin(s.aiAnalysis, eq(s.aiAnalysis.complaintId, s.complaint.id))
      .innerJoin(s.duplicateCluster, eq(s.complaint.clusterId, s.duplicateCluster.id))
      .where(eq(s.complaint.id, c.id));
    expect(row).toEqual({ code: "WATER_SUPPLY", lat: 19.07, score: 42, provider: "MOCK", size: 1 });
  });

  it("cascades deletes from complaint to its dependent rows", async () => {
    const { u, c } = await newComplaint();
    await db.insert(s.complaintStatusHistory).values({ complaintId: c.id, toStatus: "SUBMITTED" });
    await db.insert(s.aiAnalysis).values({ complaintId: c.id });
    await db.insert(s.priorityAssessment).values({ complaintId: c.id, score: 1, level: "LOW" });
    await db.insert(s.complaintMedia).values({ complaintId: c.id, uploadedBy: u.id, type: "IMAGE", storageKey: `k/${short()}`, mime: "image/png", sizeBytes: 5 });
    await db.delete(s.complaint).where(eq(s.complaint.id, c.id));
    for (const [table, col] of [
      [s.complaintStatusHistory, s.complaintStatusHistory.complaintId],
      [s.aiAnalysis, s.aiAnalysis.complaintId],
      [s.priorityAssessment, s.priorityAssessment.complaintId],
      [s.complaintMedia, s.complaintMedia.complaintId],
    ] as const) {
      expect(await db.select().from(table).where(eq(col, c.id))).toHaveLength(0);
    }
  });

  it("sets complaint.cluster_id to null when a cluster is deleted", async () => {
    const { u } = await newComplaint();
    const [cl] = await db.insert(s.duplicateCluster).values({ category: "GARBAGE" }).returning();
    const [c] = await db.insert(s.complaint).values({ citizenId: u.id, clusterId: cl.id }).returning();
    await db.delete(s.duplicateCluster).where(eq(s.duplicateCluster.id, cl.id));
    const [after] = await db.select().from(s.complaint).where(eq(s.complaint.id, c.id));
    expect(after.clusterId).toBeNull();
  });
});

describe("constraints", () => {
  it("rejects out-of-range coordinates", async () => {
    await expect(db.insert(s.location).values({ lat: 91, lng: 0, geohash: "x" })).rejects.toThrow();
    await expect(db.insert(s.location).values({ lat: 0, lng: -181, geohash: "x" })).rejects.toThrow();
  });

  it("rejects priority score outside 0..100 and confidence outside 0..1", async () => {
    const { c } = await newComplaint();
    await expect(db.insert(s.priorityAssessment).values({ complaintId: c.id, score: 101, level: "HIGH" })).rejects.toThrow();
    await expect(db.insert(s.aiAnalysis).values({ complaintId: c.id, categoryConfidence: 1.5 })).rejects.toThrow();
  });

  it("enforces one analysis and one priority row per complaint", async () => {
    const { c } = await newComplaint();
    await db.insert(s.aiAnalysis).values({ complaintId: c.id });
    await expect(db.insert(s.aiAnalysis).values({ complaintId: c.id })).rejects.toThrow();
    await db.insert(s.priorityAssessment).values({ complaintId: c.id, score: 5, level: "LOW" });
    await expect(db.insert(s.priorityAssessment).values({ complaintId: c.id, score: 6, level: "LOW" })).rejects.toThrow();
  });

  it("enforces unique emails, foreign keys, enums and positive sizes", async () => {
    const email = `dup-${short()}@test.example`;
    await db.insert(s.citizen).values({ email });
    await expect(db.insert(s.citizen).values({ email })).rejects.toThrow();
    await expect(db.insert(s.complaint).values({ citizenId: crypto.randomUUID() })).rejects.toThrow(); // FK
    await expect(db.execute(sql`insert into complaint (citizen_id, status) values (${crypto.randomUUID()}, 'NOT_A_STATUS')`)).rejects.toThrow(); // enum
    await expect(db.insert(s.duplicateCluster).values({ category: "GARBAGE", size: 0 })).rejects.toThrow();
    const { u } = await newComplaint();
    await expect(db.insert(s.complaintMedia).values({ uploadedBy: u.id, type: "IMAGE", storageKey: `k/${short()}`, mime: "image/png", sizeBytes: 0 })).rejects.toThrow();
  });

  it("prevents deleting a citizen who still has complaints", async () => {
    const { u } = await newComplaint();
    await expect(db.delete(s.citizen).where(eq(s.citizen.id, u.id))).rejects.toThrow();
  });
});
