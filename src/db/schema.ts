// AI CivicEye database schema — implements docs/08_DATABASE_SCHEMA.md.
// Deviations from the doc (all documented in docs/08 "Implementation notes"):
//   - citizen: + password_hash, department_id (dept-scoped officers), is_active
//   - complaint: + resolution_note / resolved_at / resolved_by (resolution information)
//   - complaint_media: complaint_id nullable (upload happens before the complaint exists),
//     + uploaded_by, size_bytes
//   - ai_analysis: + needs_review, provider, duplicate_result
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  ANALYSIS_STATUSES,
  CATEGORIES,
  COMPLAINT_STATUSES,
  MEDIA_TYPES,
  PRIORITY_LEVELS,
  SEVERITIES,
  USER_ROLES,
  type Category,
} from "@/lib/enums";

export const categoryEnum = pgEnum("category", CATEGORIES);
export const severityEnum = pgEnum("severity", SEVERITIES);
export const priorityLevelEnum = pgEnum("priority_level", PRIORITY_LEVELS);
export const complaintStatusEnum = pgEnum("complaint_status", COMPLAINT_STATUSES);
export const mediaTypeEnum = pgEnum("media_type", MEDIA_TYPES);
export const userRoleEnum = pgEnum("user_role", USER_ROLES);
export const analysisStatusEnum = pgEnum("analysis_status", ANALYSIS_STATUSES);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const orderedCreatedAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().default(sql`clock_timestamp()`);

export const department = pgTable("department", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  defaultCategories: jsonb("default_categories")
    .$type<Category[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
});

export const citizen = pgTable(
  "citizen",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    phone: text("phone"),
    email: text("email").unique(),
    passwordHash: text("password_hash"),
    role: userRoleEnum("role").notNull().default("CITIZEN"),
    departmentId: uuid("department_id").references(() => department.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("citizen_department_idx").on(t.departmentId)],
);

export const location = pgTable(
  "location",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    address: text("address"),
    ward: text("ward"),
    geohash: text("geohash").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("location_geohash_idx").on(t.geohash),
    check("location_lat_range", sql`${t.lat} between -90 and 90`),
    check("location_lng_range", sql`${t.lng} between -180 and 180`),
  ],
);

export const duplicateCluster = pgTable(
  "duplicate_cluster",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: categoryEnum("category").notNull(),
    representativeComplaintId: uuid("representative_complaint_id").references(
      (): AnyPgColumn => complaint.id,
      { onDelete: "set null" },
    ),
    centroid: jsonb("centroid").$type<{ lat: number; lng: number } | null>(),
    size: integer("size").notNull().default(1),
    createdAt: createdAt(),
  },
  (t) => [check("duplicate_cluster_size_positive", sql`${t.size} >= 1`)],
);

export const complaint = pgTable(
  "complaint",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    citizenId: uuid("citizen_id")
      .notNull()
      .references(() => citizen.id, { onDelete: "restrict" }),
    locationId: uuid("location_id").references(() => location.id, { onDelete: "set null" }),
    text: text("text"),
    categoryHint: categoryEnum("category_hint"),
    category: categoryEnum("category"),
    severity: severityEnum("severity"),
    urgency: severityEnum("urgency"),
    status: complaintStatusEnum("status").notNull().default("SUBMITTED"),
    departmentId: uuid("department_id").references(() => department.id, { onDelete: "set null" }),
    clusterId: uuid("cluster_id").references(() => duplicateCluster.id, { onDelete: "set null" }),
    resolutionNote: text("resolution_note"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by").references(() => citizen.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("complaint_status_idx").on(t.status),
    index("complaint_category_idx").on(t.category),
    index("complaint_department_idx").on(t.departmentId),
    index("complaint_cluster_idx").on(t.clusterId),
    index("complaint_created_at_idx").on(t.createdAt),
    index("complaint_citizen_idx").on(t.citizenId),
  ],
);

export const complaintMedia = pgTable(
  "complaint_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Nullable: media is uploaded first (POST /api/complaints/image) and attached on create.
    complaintId: uuid("complaint_id").references(() => complaint.id, { onDelete: "cascade" }),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => citizen.id, { onDelete: "cascade" }),
    type: mediaTypeEnum("type").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("complaint_media_complaint_idx").on(t.complaintId),
    check("complaint_media_size_positive", sql`${t.sizeBytes} > 0`),
  ],
);

export const aiAnalysis = pgTable(
  "ai_analysis",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    complaintId: uuid("complaint_id")
      .notNull()
      .references(() => complaint.id, { onDelete: "cascade" }),
    status: analysisStatusEnum("status").notNull().default("PENDING"),
    // 'MOCK' = rule-based stub adapter (NOT a trained model); 'HTTP' = real ML service.
    provider: text("provider"),
    category: categoryEnum("category"),
    categoryConfidence: real("category_confidence"),
    severity: severityEnum("severity"),
    severityConfidence: real("severity_confidence"),
    needsReview: boolean("needs_review").notNull().default(false),
    cvResult: jsonb("cv_result"),
    nlpResult: jsonb("nlp_result"),
    duplicateResult: jsonb("duplicate_result"),
    explanation: jsonb("explanation").$type<string[]>(),
    modelVersions: jsonb("model_versions"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("ai_analysis_complaint_uq").on(t.complaintId),
    check(
      "ai_analysis_category_conf_range",
      sql`${t.categoryConfidence} is null or ${t.categoryConfidence} between 0 and 1`,
    ),
    check(
      "ai_analysis_severity_conf_range",
      sql`${t.severityConfidence} is null or ${t.severityConfidence} between 0 and 1`,
    ),
  ],
);

export const priorityAssessment = pgTable(
  "priority_assessment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    complaintId: uuid("complaint_id")
      .notNull()
      .references(() => complaint.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    level: priorityLevelEnum("level").notNull(),
    signals: jsonb("signals"),
    reasons: jsonb("reasons").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    weightsVersion: text("weights_version"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("priority_assessment_complaint_uq").on(t.complaintId),
    index("priority_assessment_score_idx").on(t.score),
    check("priority_assessment_score_range", sql`${t.score} between 0 and 100`),
  ],
);

export const complaintStatusHistory = pgTable(
  "complaint_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    complaintId: uuid("complaint_id")
      .notNull()
      .references(() => complaint.id, { onDelete: "cascade" }),
    fromStatus: complaintStatusEnum("from_status"),
    toStatus: complaintStatusEnum("to_status").notNull(),
    note: text("note"),
    // null = system (AI pipeline) action.
    changedBy: uuid("changed_by").references(() => citizen.id, { onDelete: "set null" }),
    // clock_timestamp() (not now()) so several rows written in one transaction stay strictly ordered.
    createdAt: orderedCreatedAt(),
  },
  (t) => [index("complaint_status_history_complaint_idx").on(t.complaintId, t.createdAt)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: text("action").notNull(),
    // No FK on purpose: the audit trail must outlive user rows. null = system.
    actorId: uuid("actor_id"),
    payload: jsonb("payload"),
    createdAt: orderedCreatedAt(),
  },
  (t) => [index("audit_log_entity_idx").on(t.entityType, t.entityId, t.createdAt)],
);
