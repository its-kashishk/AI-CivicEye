// Complaint service: persistence, lifecycle, AI orchestration results, and queries.
// Implements docs/04 (backend) and docs/07 (API contract). ML calls go through the
// `MlClient` adapter only.
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, ne, notInArray, type SQL, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { type Actor } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { config } from "@/lib/config";
import type { Category, ComplaintStatus, MediaType } from "@/lib/enums";
import { boundingBox, geohash } from "@/lib/geo";
import { Errors } from "@/lib/http";
import { canManualTransition, EDITABLE_STATUSES, INACTIVE_STATUSES } from "@/lib/lifecycle";
import { getMlClient, MlUnavailableError, type MlClient } from "@/lib/ml";
import { type PipelineDeps, type PipelineInput, type PipelineResult, runPipeline } from "@/lib/pipeline";
import { departmentCodeForCategory } from "@/lib/routing";
import type { complaintInput, complaintPatch, listQuery, priorityQuery, statusInput } from "@/lib/validation";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------------
// Summary query (one shape reused by create response, list, priority queue, detail)
// ---------------------------------------------------------------------------------
const summaryColumns = {
  id: s.complaint.id,
  citizenId: s.complaint.citizenId,
  status: s.complaint.status,
  text: s.complaint.text,
  categoryHint: s.complaint.categoryHint,
  category: s.complaint.category,
  severity: s.complaint.severity,
  urgency: s.complaint.urgency,
  clusterId: s.complaint.clusterId,
  departmentId: s.complaint.departmentId,
  locationId: s.complaint.locationId,
  resolutionNote: s.complaint.resolutionNote,
  resolvedAt: s.complaint.resolvedAt,
  resolvedBy: s.complaint.resolvedBy,
  createdAt: s.complaint.createdAt,
  updatedAt: s.complaint.updatedAt,
  departmentCode: s.department.code,
  departmentName: s.department.name,
  priorityScore: s.priorityAssessment.score,
  priorityLevel: s.priorityAssessment.level,
  priorityReasons: s.priorityAssessment.reasons,
  analysisStatus: s.aiAnalysis.status,
  analysisProvider: s.aiAnalysis.provider,
  needsReview: s.aiAnalysis.needsReview,
  clusterSize: s.duplicateCluster.size,
  lat: s.location.lat,
  lng: s.location.lng,
  address: s.location.address,
};

function baseSummary() {
  return db
    .select(summaryColumns)
    .from(s.complaint)
    .leftJoin(s.department, eq(s.complaint.departmentId, s.department.id))
    .leftJoin(s.priorityAssessment, eq(s.priorityAssessment.complaintId, s.complaint.id))
    .leftJoin(s.aiAnalysis, eq(s.aiAnalysis.complaintId, s.complaint.id))
    .leftJoin(s.duplicateCluster, eq(s.complaint.clusterId, s.duplicateCluster.id))
    .leftJoin(s.location, eq(s.complaint.locationId, s.location.id));
}

function baseCount() {
  return db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.complaint)
    .leftJoin(s.department, eq(s.complaint.departmentId, s.department.id))
    .leftJoin(s.priorityAssessment, eq(s.priorityAssessment.complaintId, s.complaint.id))
    .leftJoin(s.location, eq(s.complaint.locationId, s.location.id));
}

type SummaryRow = Awaited<ReturnType<typeof baseSummary>>[number];

export function toSummary(r: SummaryRow) {
  return {
    id: r.id,
    status: r.status,
    text: r.text,
    category: r.category,
    category_hint: r.categoryHint,
    severity: r.severity,
    urgency: r.urgency,
    priority:
      r.priorityScore == null
        ? null
        : { score: r.priorityScore, level: r.priorityLevel, reasons: r.priorityReasons ?? [] },
    department: r.departmentCode,
    department_name: r.departmentName,
    duplicate: { is_duplicate: (r.clusterSize ?? 0) > 1, cluster_id: r.clusterId },
    analysis_status: r.analysisStatus,
    // true when the analysis came from the rule-based mock adapter (not a trained model)
    mock: r.analysisProvider === "MOCK",
    needs_review: r.needsReview ?? false,
    location: r.lat == null || r.lng == null ? null : { lat: r.lat, lng: r.lng, address: r.address },
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

async function getSummaryRow(id: string): Promise<SummaryRow> {
  const [row] = await baseSummary().where(eq(s.complaint.id, id)).limit(1);
  if (!row) throw Errors.notFound("Complaint not found");
  return row;
}

function assertCanView(actor: Actor, row: { citizenId: string; departmentId: string | null }) {
  if (actor.role === "ADMIN" || actor.role === "OPERATOR") return;
  if (actor.role === "CITIZEN") {
    if (row.citizenId !== actor.id) throw Errors.forbidden("You can only access your own complaints");
    return;
  }
  if (!actor.departmentId || row.departmentId !== actor.departmentId) {
    throw Errors.forbidden("This complaint is not assigned to your department");
  }
}

/** Access-checked fetch of the summary row. */
async function loadAuthorized(actor: Actor, id: string): Promise<SummaryRow> {
  const row = await getSummaryRow(id);
  assertCanView(actor, row);
  return row;
}

export async function getComplaintSummary(id: string) {
  return toSummary(await getSummaryRow(id));
}

// ---------------------------------------------------------------------------------
// Uploads referenced by a complaint
// ---------------------------------------------------------------------------------
type MediaRow = typeof s.complaintMedia.$inferSelect;

async function resolveUploads(actor: Actor, refs: { type: MediaType; upload_id: string }[]): Promise<MediaRow[]> {
  if (refs.length === 0) return [];
  const ids = [...new Set(refs.map((r) => r.upload_id))];
  const rows = await db.select().from(s.complaintMedia).where(inArray(s.complaintMedia.id, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const ref of refs) {
    const row = byId.get(ref.upload_id);
    if (!row || row.uploadedBy !== actor.id) {
      throw Errors.validation(`Unknown upload_id: ${ref.upload_id}`);
    }
    if (row.complaintId) throw Errors.validation(`upload_id ${ref.upload_id} is already attached to a complaint`);
    if (row.type !== ref.type) throw Errors.validation(`upload_id ${ref.upload_id} is not of type ${ref.type}`);
  }
  return ids.map((id) => byId.get(id)!);
}

// ---------------------------------------------------------------------------------
// Pipeline dependencies (DB-backed candidate + cluster lookups)
// ---------------------------------------------------------------------------------
const pipelineDeps = (ml: MlClient): PipelineDeps => ({
  ml,
  async loadCandidates({ category, lat, lng, createdAt, excludeComplaintId }) {
    const since = new Date(createdAt.getTime() - config.duplicateWindowDays() * DAY_MS);
    const conds: SQL[] = [
      eq(s.complaint.category, category),
      gte(s.complaint.createdAt, since),
      ne(s.complaint.status, "REJECTED"),
    ];
    if (excludeComplaintId) conds.push(ne(s.complaint.id, excludeComplaintId));
    if (lat != null && lng != null) {
      const b = boundingBox(lat, lng, config.duplicateSearchRadiusM());
      conds.push(sql`${s.location.lat} between ${b.minLat} and ${b.maxLat}`);
      conds.push(sql`${s.location.lng} between ${b.minLng} and ${b.maxLng}`);
    }
    const rows = await db
      .select({
        id: s.complaint.id,
        text: s.complaint.text,
        lat: s.location.lat,
        lng: s.location.lng,
        createdAt: s.complaint.createdAt,
        category: s.complaint.category,
        clusterId: s.complaint.clusterId,
      })
      .from(s.complaint)
      .leftJoin(s.location, eq(s.complaint.locationId, s.location.id))
      .where(and(...conds))
      .orderBy(desc(s.complaint.createdAt))
      .limit(200);
    return rows;
  },
  async loadClusterContext(similarIds) {
    const rows = await db
      .select({ id: s.complaint.id, clusterId: s.complaint.clusterId, createdAt: s.complaint.createdAt })
      .from(s.complaint)
      .where(inArray(s.complaint.id, similarIds));
    if (rows.length === 0) return { clusterSize: 1, firstReportedAt: null };
    const firstReportedAt = rows.reduce((min, r) => (r.createdAt < min ? r.createdAt : min), rows[0].createdAt);
    const existing = rows.find((r) => r.clusterId)?.clusterId;
    if (existing) {
      const [cl] = await db.select({ size: s.duplicateCluster.size }).from(s.duplicateCluster).where(eq(s.duplicateCluster.id, existing));
      return { clusterSize: (cl?.size ?? rows.length) + 1, firstReportedAt };
    }
    return { clusterSize: rows.length + 1, firstReportedAt };
  },
});

async function insertLocation(tx: Tx, loc: NonNullable<z.infer<typeof complaintInput>["location"]>) {
  const [row] = await tx
    .insert(s.location)
    .values({
      lat: loc.lat,
      lng: loc.lng,
      address: loc.address ?? null,
      ward: loc.ward ?? null,
      geohash: geohash(loc.lat, loc.lng),
    })
    .returning({ id: s.location.id });
  return row.id;
}

// ---------------------------------------------------------------------------------
// Preview (POST /api/complaints/analyze) — no persistence
// ---------------------------------------------------------------------------------
export async function previewAnalysis(actor: Actor, input: z.infer<typeof complaintInput>) {
  const media = await resolveUploads(actor, input.media);
  const ml = getMlClient();
  let result: PipelineResult;
  try {
    result = await runPipeline(pipelineDeps(ml), {
      text: input.text ?? null,
      categoryHint: input.category_hint ?? null,
      urgency: input.urgency ?? null,
      lat: input.location?.lat ?? null,
      lng: input.location?.lng ?? null,
      createdAt: new Date(),
      images: media.filter((m) => m.type === "IMAGE").map((m) => ({ storageKey: m.storageKey, mime: m.mime })),
    });
  } catch (e) {
    if (e instanceof MlUnavailableError) throw Errors.mlUnavailable(e.message);
    throw e;
  }
  return {
    category: result.category,
    category_confidence: result.categoryConfidence,
    severity: result.severity,
    priority: { score: result.priority.score, level: result.priority.level, reasons: result.priority.reasons },
    duplicate_preview: {
      is_duplicate: result.duplicates.is_duplicate,
      similar_count: result.duplicates.similar_complaint_ids.length,
    },
    explanation: result.explanation,
    needs_review: result.needsReview,
    mock: result.provider === "MOCK",
  };
}

// ---------------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------------
export async function createComplaint(actor: Actor, input: z.infer<typeof complaintInput>) {
  const media = await resolveUploads(actor, input.media);

  const created = await db.transaction(async (tx) => {
    const locationId = input.location ? await insertLocation(tx, input.location) : null;
    const [c] = await tx
      .insert(s.complaint)
      .values({
        citizenId: actor.id,
        locationId,
        text: input.text ? input.text : null,
        categoryHint: input.category_hint ?? null,
        urgency: input.urgency ?? null,
      })
      .returning();
    if (media.length) {
      await tx
        .update(s.complaintMedia)
        .set({ complaintId: c.id })
        .where(inArray(s.complaintMedia.id, media.map((m) => m.id)));
    }
    await tx.insert(s.complaintStatusHistory).values({
      complaintId: c.id,
      fromStatus: null,
      toStatus: "SUBMITTED",
      changedBy: actor.id,
      note: "Complaint submitted",
    });
    await writeAudit(tx, {
      entityType: "complaint",
      entityId: c.id,
      action: "COMPLAINT_CREATE",
      actorId: actor.id,
      payload: { media: media.length, hasLocation: !!input.location },
    });
    return c;
  });

  // Fail-safe (docs/04 §8): the complaint is already saved; analysis problems never fail the request.
  await analyzeAndPersist(created.id);
  return getComplaintSummary(created.id);
}

/**
 * Runs the pipeline for a stored complaint and persists the outcome.
 * Returns true if analysis completed; false if it was deferred/failed (row marked PENDING/FAILED).
 */
export async function analyzeAndPersist(complaintId: string): Promise<boolean> {
  const ml = getMlClient();
  const [c] = await db
    .select({
      id: s.complaint.id,
      text: s.complaint.text,
      categoryHint: s.complaint.categoryHint,
      urgency: s.complaint.urgency,
      createdAt: s.complaint.createdAt,
      lat: s.location.lat,
      lng: s.location.lng,
    })
    .from(s.complaint)
    .leftJoin(s.location, eq(s.complaint.locationId, s.location.id))
    .where(eq(s.complaint.id, complaintId));
  if (!c) throw Errors.notFound("Complaint not found");
  const images = await db
    .select({ storageKey: s.complaintMedia.storageKey, mime: s.complaintMedia.mime })
    .from(s.complaintMedia)
    .where(and(eq(s.complaintMedia.complaintId, complaintId), eq(s.complaintMedia.type, "IMAGE")))
    .orderBy(asc(s.complaintMedia.createdAt));

  const input: PipelineInput = {
    text: c.text,
    categoryHint: c.categoryHint,
    urgency: c.urgency,
    lat: c.lat,
    lng: c.lng,
    createdAt: c.createdAt,
    images,
    excludeComplaintId: c.id,
  };

  try {
    const result = await runPipeline(pipelineDeps(ml), input);
    await applyAnalysis(complaintId, result);
    return true;
  } catch (e) {
    const deferred = e instanceof MlUnavailableError;
    if (!deferred) console.error("[analysis] unexpected failure", e);
    const message = e instanceof Error ? e.message : "unknown error";
    await db.transaction(async (tx) => {
      await tx
        .insert(s.aiAnalysis)
        .values({
          complaintId,
          status: deferred ? "PENDING" : "FAILED",
          provider: ml.provider,
          explanation: [deferred ? `Analysis deferred: ${message}` : "Analysis failed unexpectedly"],
        })
        .onConflictDoUpdate({
          target: s.aiAnalysis.complaintId,
          set: {
            status: deferred ? "PENDING" : "FAILED",
            provider: ml.provider,
            explanation: [deferred ? `Analysis deferred: ${message}` : "Analysis failed unexpectedly"],
          },
        });
      await writeAudit(tx, {
        entityType: "complaint",
        entityId: complaintId,
        action: deferred ? "AI_ANALYSIS_DEFERRED" : "AI_ANALYSIS_FAILED",
        actorId: null,
        payload: { reason: message },
      });
    });
    return false;
  }
}

async function applyAnalysis(complaintId: string, r: PipelineResult) {
  await db.transaction(async (tx) => {
    const [c] = await tx.select().from(s.complaint).where(eq(s.complaint.id, complaintId)).for("update");
    if (!c) throw Errors.notFound("Complaint not found");

    // ---- duplicate cluster (advisory; nothing is merged or deleted) -----------
    let clusterId = c.clusterId;
    const similarIds = r.duplicates.similar_complaint_ids.filter((id) => id !== complaintId);
    if (similarIds.length > 0) {
      const similar = await tx
        .select({ id: s.complaint.id, clusterId: s.complaint.clusterId, createdAt: s.complaint.createdAt })
        .from(s.complaint)
        .where(inArray(s.complaint.id, similarIds));
      if (similar.length > 0) {
        clusterId = similar.find((x) => x.clusterId)?.clusterId ?? clusterId;
        if (!clusterId) {
          const earliest = similar.reduce((m, x) => (x.createdAt < m.createdAt ? x : m), similar[0]);
          const [cl] = await tx
            .insert(s.duplicateCluster)
            .values({ category: r.category, representativeComplaintId: earliest.id, size: similar.length + 1 })
            .returning({ id: s.duplicateCluster.id });
          clusterId = cl.id;
        }
        await tx
          .update(s.complaint)
          .set({ clusterId })
          .where(and(inArray(s.complaint.id, [...similar.map((x) => x.id), complaintId]), isNull(s.complaint.clusterId)));
        const [{ n }] = await tx
          .select({ n: sql<number>`count(*)::int` })
          .from(s.complaint)
          .where(eq(s.complaint.clusterId, clusterId));
        await tx.update(s.duplicateCluster).set({ size: Math.max(1, n) }).where(eq(s.duplicateCluster.id, clusterId));
        await writeAudit(tx, {
          entityType: "cluster",
          entityId: clusterId,
          action: "CLUSTER_ASSIGN",
          actorId: null,
          payload: { complaintId, similar: similar.map((x) => x.id), scores: r.duplicates.similarity_scores },
        });
      }
    }

    // ---- ai_analysis + priority_assessment ------------------------------------
    const analysisValues = {
      status: "COMPLETED" as const,
      provider: r.provider,
      category: r.category,
      categoryConfidence: r.categoryConfidence,
      severity: r.severity,
      severityConfidence: r.severityConfidence,
      needsReview: r.needsReview,
      cvResult: r.cvResult ?? null,
      nlpResult: r.nlpResult ?? null,
      duplicateResult: r.duplicates,
      explanation: r.explanation,
      modelVersions: r.modelVersions,
    };
    await tx
      .insert(s.aiAnalysis)
      .values({ complaintId, ...analysisValues })
      .onConflictDoUpdate({ target: s.aiAnalysis.complaintId, set: analysisValues });

    const priorityValues = {
      score: r.priority.score,
      level: r.priority.level,
      signals: r.priority.signals,
      reasons: r.priority.reasons,
      weightsVersion: r.priority.weights_version,
    };
    await tx
      .insert(s.priorityAssessment)
      .values({ complaintId, ...priorityValues })
      .onConflictDoUpdate({ target: s.priorityAssessment.complaintId, set: priorityValues });

    // ---- lifecycle: SUBMITTED -> ANALYZED -> ROUTED --------------------------------
    let status: ComplaintStatus = c.status;
    if (status === "SUBMITTED") {
      await tx.insert(s.complaintStatusHistory).values({
        complaintId,
        fromStatus: "SUBMITTED",
        toStatus: "ANALYZED",
        changedBy: null,
        note: `AI analysis completed (provider: ${r.provider})`,
      });
      status = "ANALYZED";
    }

    let departmentId = c.departmentId;
    let deptCode: string | null = null;
    if (!departmentId) {
      deptCode = departmentCodeForCategory(r.category);
      const [dept] = await tx.select({ id: s.department.id }).from(s.department).where(eq(s.department.code, deptCode));
      departmentId = dept?.id ?? null;
    }
    if (status === "ANALYZED" && departmentId) {
      await tx.insert(s.complaintStatusHistory).values({
        complaintId,
        fromStatus: "ANALYZED",
        toStatus: "ROUTED",
        changedBy: null,
        note: deptCode ? `Routed to ${deptCode}` : "Routed (department already assigned)",
      });
      status = "ROUTED";
      await writeAudit(tx, {
        entityType: "complaint",
        entityId: complaintId,
        action: "ROUTE",
        actorId: null,
        payload: { department: deptCode, category: r.category, manual: false },
      });
    }

    await tx
      .update(s.complaint)
      .set({
        category: r.category,
        severity: r.severity,
        clusterId,
        departmentId,
        status,
        updatedAt: new Date(),
      })
      .where(eq(s.complaint.id, complaintId));

    await writeAudit(tx, {
      entityType: "complaint",
      entityId: complaintId,
      action: "AI_ANALYSIS_APPLIED",
      actorId: null,
      payload: {
        provider: r.provider,
        category: r.category,
        severity: r.severity,
        priority: r.priority.score,
        needsReview: r.needsReview,
      },
    });
  });
}

export async function reanalyzeComplaint(actor: Actor, id: string) {
  const row = await loadAuthorized(actor, id);
  if (row.analysisStatus === "COMPLETED") throw Errors.conflict("Analysis already completed for this complaint");
  const ok = await analyzeAndPersist(id);
  if (!ok) throw Errors.mlUnavailable("Analysis still unavailable; complaint remains pending");
  return getComplaintSummary(id);
}

// ---------------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------------
export async function getComplaintDetail(actor: Actor, id: string) {
  const row = await loadAuthorized(actor, id);
  const [loc] = row.locationId
    ? await db.select().from(s.location).where(eq(s.location.id, row.locationId))
    : [];
  const media = await db
    .select({
      id: s.complaintMedia.id,
      type: s.complaintMedia.type,
      mime: s.complaintMedia.mime,
      size_bytes: s.complaintMedia.sizeBytes,
      created_at: s.complaintMedia.createdAt,
    })
    .from(s.complaintMedia)
    .where(eq(s.complaintMedia.complaintId, id))
    .orderBy(asc(s.complaintMedia.createdAt));
  const [analysis] = await db.select().from(s.aiAnalysis).where(eq(s.aiAnalysis.complaintId, id));
  const [priority] = await db.select().from(s.priorityAssessment).where(eq(s.priorityAssessment.complaintId, id));
  const history = await listHistoryRows(id);

  return {
    ...toSummary(row),
    location: loc
      ? { lat: loc.lat, lng: loc.lng, address: loc.address, ward: loc.ward, geohash: loc.geohash }
      : null,
    media,
    cluster_id: row.clusterId,
    analysis: analysis
      ? {
          status: analysis.status,
          provider: analysis.provider,
          mock: analysis.provider === "MOCK",
          category: analysis.category,
          category_confidence: analysis.categoryConfidence,
          severity: analysis.severity,
          severity_confidence: analysis.severityConfidence,
          needs_review: analysis.needsReview,
          cv_result: analysis.cvResult,
          nlp_result: analysis.nlpResult,
          duplicate_result: analysis.duplicateResult,
          explanation: analysis.explanation ?? [],
          model_versions: analysis.modelVersions,
          created_at: analysis.createdAt,
        }
      : null,
    priority: priority
      ? {
          score: priority.score,
          level: priority.level,
          signals: priority.signals,
          reasons: priority.reasons,
          weights_version: priority.weightsVersion,
        }
      : null,
    resolution: {
      note: row.resolutionNote,
      resolved_at: row.resolvedAt,
      resolved_by: row.resolvedBy,
    },
    status_history: history,
  };
}

async function listHistoryRows(id: string) {
  const rows = await db
    .select()
    .from(s.complaintStatusHistory)
    .where(eq(s.complaintStatusHistory.complaintId, id))
    .orderBy(asc(s.complaintStatusHistory.createdAt), asc(s.complaintStatusHistory.id));
  return rows.map(toHistoryEntry);
}

function toHistoryEntry(h: typeof s.complaintStatusHistory.$inferSelect) {
  return {
    id: h.id,
    from_status: h.fromStatus,
    to_status: h.toStatus,
    note: h.note,
    changed_by: h.changedBy,
    created_at: h.createdAt,
  };
}

export async function getComplaintHistory(actor: Actor, id: string) {
  await loadAuthorized(actor, id);
  return { items: await listHistoryRows(id) };
}

function scopeConditions(actor: Actor, mine?: boolean): SQL[] {
  const conds: SQL[] = [];
  if (actor.role === "CITIZEN" || mine) conds.push(eq(s.complaint.citizenId, actor.id));
  if (actor.role === "DEPT_OFFICER") {
    conds.push(actor.departmentId ? eq(s.complaint.departmentId, actor.departmentId) : sql`false`);
  }
  return conds;
}

export async function listComplaints(actor: Actor, q: z.infer<typeof listQuery>) {
  const conds = scopeConditions(actor, q.mine === "true");
  if (q.status) conds.push(eq(s.complaint.status, q.status));
  if (q.category) conds.push(eq(s.complaint.category, q.category));
  if (q.severity) conds.push(eq(s.complaint.severity, q.severity));
  if (q.department) conds.push(eq(s.department.code, q.department));
  if (q.bbox) {
    const [minLng, minLat, maxLng, maxLat] = q.bbox;
    conds.push(sql`${s.location.lng} between ${minLng} and ${maxLng}`);
    conds.push(sql`${s.location.lat} between ${minLat} and ${maxLat}`);
  }
  const where = conds.length ? and(...conds) : undefined;
  const order =
    q.sort === "created_at"
      ? [asc(s.complaint.createdAt)]
      : q.sort === "-priority"
        ? [sql`${s.priorityAssessment.score} desc nulls last`, desc(s.complaint.createdAt)]
        : [desc(s.complaint.createdAt)];

  const [rows, [{ n }]] = await Promise.all([
    baseSummary().where(where).orderBy(...order).limit(q.pageSize).offset((q.page - 1) * q.pageSize),
    baseCount().where(where),
  ]);
  return { items: rows.map(toSummary), page: q.page, pageSize: q.pageSize, total: n };
}

export async function priorityQueue(actor: Actor, q: z.infer<typeof priorityQuery>) {
  const conds = [
    ...scopeConditions(actor),
    isNotNull(s.priorityAssessment.id),
    notInArray(s.complaint.status, INACTIVE_STATUSES),
  ];
  if (q.department) conds.push(eq(s.department.code, q.department));
  if (q.level) conds.push(eq(s.priorityAssessment.level, q.level));
  const where = and(...conds);
  const [rows, [{ n }]] = await Promise.all([
    baseSummary()
      .where(where)
      .orderBy(desc(s.priorityAssessment.score), asc(s.complaint.createdAt))
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize),
    baseCount().where(where),
  ]);
  return { items: rows.map(toSummary), page: q.page, pageSize: q.pageSize, total: n };
}

export async function duplicateClusters(actor: Actor, q: { page: number; pageSize: number }) {
  const conds: SQL[] = [sql`${s.duplicateCluster.size} > 1`];
  if (actor.role === "DEPT_OFFICER") {
    conds.push(
      actor.departmentId
        ? sql`exists (select 1 from complaint c where c.cluster_id = ${s.duplicateCluster.id} and c.department_id = ${actor.departmentId})`
        : sql`false`,
    );
  }
  const where = and(...conds);
  const [clusters, [{ n }]] = await Promise.all([
    db
      .select()
      .from(s.duplicateCluster)
      .where(where)
      .orderBy(desc(s.duplicateCluster.size), desc(s.duplicateCluster.createdAt))
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize),
    db.select({ n: sql<number>`count(*)::int` }).from(s.duplicateCluster).where(where),
  ]);

  const members = clusters.length
    ? await db
        .select({ id: s.complaint.id, clusterId: s.complaint.clusterId })
        .from(s.complaint)
        .where(
          and(
            inArray(s.complaint.clusterId, clusters.map((c) => c.id)),
            actor.role === "DEPT_OFFICER" && actor.departmentId
              ? eq(s.complaint.departmentId, actor.departmentId)
              : undefined,
          ),
        )
        .orderBy(asc(s.complaint.createdAt))
    : [];

  return {
    clusters: clusters.map((c) => ({
      cluster_id: c.id,
      size: c.size,
      category: c.category,
      representative_id: c.representativeComplaintId,
      member_ids: members.filter((m) => m.clusterId === c.id).map((m) => m.id),
    })),
    page: q.page,
    pageSize: q.pageSize,
    total: n,
  };
}

// ---------------------------------------------------------------------------------
// Updates
// ---------------------------------------------------------------------------------
export async function updateComplaint(actor: Actor, id: string, patch: z.infer<typeof complaintPatch>) {
  const row = await loadAuthorized(actor, id);
  const isOwner = row.citizenId === actor.id;
  const canEditContent = actor.role === "OPERATOR" || actor.role === "ADMIN" || (actor.role === "CITIZEN" && isOwner);
  const canAssign = actor.role === "OPERATOR" || actor.role === "ADMIN";

  const touchesContent =
    patch.text !== undefined || patch.category_hint !== undefined || patch.urgency !== undefined || patch.location !== undefined;
  if (touchesContent && !canEditContent) throw Errors.forbidden("You cannot edit this complaint's content");
  if (touchesContent && actor.role === "CITIZEN" && !EDITABLE_STATUSES.includes(row.status)) {
    throw Errors.conflict(`Complaint can no longer be edited in status ${row.status}`);
  }
  if ((patch.department_code !== undefined || patch.category !== undefined) && !canAssign) {
    throw Errors.forbidden("Only operators and admins can assign departments or override categories");
  }
  if (patch.resolution_note !== undefined) {
    if (actor.role === "CITIZEN") throw Errors.forbidden("Only authority users can set resolution information");
    if (row.status !== "RESOLVED" && row.status !== "CLOSED") {
      throw Errors.conflict("resolution_note can only be edited for RESOLVED or CLOSED complaints");
    }
  }

  let departmentId: string | undefined;
  if (patch.department_code !== undefined) {
    const [dept] = await db.select({ id: s.department.id }).from(s.department).where(eq(s.department.code, patch.department_code));
    if (!dept) throw Errors.validation(`Unknown department_code: ${patch.department_code}`);
    departmentId = dept.id;
  }

  await db.transaction(async (tx) => {
    const set: Partial<typeof s.complaint.$inferInsert> = { updatedAt: new Date() };
    if (patch.text !== undefined) set.text = patch.text;
    if (patch.category_hint !== undefined) set.categoryHint = patch.category_hint;
    if (patch.urgency !== undefined) set.urgency = patch.urgency;
    if (patch.category !== undefined) set.category = patch.category;
    if (patch.resolution_note !== undefined) set.resolutionNote = patch.resolution_note;
    if (patch.location) set.locationId = await insertLocation(tx, patch.location);

    let newStatus: ComplaintStatus | null = null;
    if (departmentId !== undefined) {
      set.departmentId = departmentId;
      if (row.status === "ANALYZED") {
        newStatus = "ROUTED";
        set.status = "ROUTED";
        await tx.insert(s.complaintStatusHistory).values({
          complaintId: id,
          fromStatus: "ANALYZED",
          toStatus: "ROUTED",
          changedBy: actor.id,
          note: `Assigned to ${patch.department_code}`,
        });
      }
    }
    await tx.update(s.complaint).set(set).where(eq(s.complaint.id, id));
    await writeAudit(tx, {
      entityType: "complaint",
      entityId: id,
      action: departmentId !== undefined ? "ROUTE" : "COMPLAINT_UPDATE",
      actorId: actor.id,
      payload: {
        fields: Object.keys(patch),
        before: { department: row.departmentCode, category: row.category, status: row.status },
        after: { department: patch.department_code ?? row.departmentCode, category: patch.category ?? row.category, status: newStatus ?? row.status },
        manual: true,
      },
    });
  });
  return getComplaintSummary(id);
}

export async function updateStatus(actor: Actor, id: string, input: z.infer<typeof statusInput>) {
  const row = await loadAuthorized(actor, id);
  if (!canManualTransition(row.status, input.status)) {
    throw Errors.invalidTransition(`Cannot change status from ${row.status} to ${input.status}`);
  }
  if (input.resolution_note !== undefined && input.status !== "RESOLVED") {
    throw Errors.validation("resolution_note is only valid when moving to RESOLVED");
  }

  const entry = await db.transaction(async (tx) => {
    const now = new Date();
    const set: Partial<typeof s.complaint.$inferInsert> = { status: input.status, updatedAt: now };
    if (input.status === "RESOLVED") {
      set.resolvedAt = now;
      set.resolvedBy = actor.id;
      if (input.resolution_note !== undefined) set.resolutionNote = input.resolution_note;
    } else if (input.status === "REOPENED") {
      set.resolvedAt = null;
      set.resolvedBy = null;
    }
    // Optimistic guard: only transition if the status is still what we validated against.
    const updated = await tx
      .update(s.complaint)
      .set(set)
      .where(and(eq(s.complaint.id, id), eq(s.complaint.status, row.status)))
      .returning({ id: s.complaint.id });
    if (updated.length === 0) throw Errors.conflict("Complaint status changed concurrently; retry");

    const [h] = await tx
      .insert(s.complaintStatusHistory)
      .values({
        complaintId: id,
        fromStatus: row.status,
        toStatus: input.status,
        note: input.note ?? null,
        changedBy: actor.id,
      })
      .returning();
    await writeAudit(tx, {
      entityType: "complaint",
      entityId: id,
      action: "STATUS_CHANGE",
      actorId: actor.id,
      payload: { from: row.status, to: input.status, note: input.note ?? null },
    });
    return h;
  });

  return { ...(await getComplaintSummary(id)), status_history_entry: toHistoryEntry(entry) };
}

export type { Category };
