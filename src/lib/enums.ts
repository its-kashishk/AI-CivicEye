// Canonical enumerations — single source of truth (docs/01 §10, docs/03 §0, docs/08 §2).
// Used by the Drizzle schema, zod validation, the ML adapter and the API layer.

export const CATEGORIES = [
  "POTHOLE_ROAD_DAMAGE",
  "GARBAGE",
  "DRAINAGE_WATERLOGGING",
  "STREETLIGHT_FAILURE",
  "FALLEN_TREE",
  "WATER_LEAKAGE",
  "OTHER",
] as const;

export const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const PRIORITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const COMPLAINT_STATUSES = [
  "SUBMITTED",
  "ANALYZED",
  "ROUTED",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "REJECTED",
  "DUPLICATE_MERGED",
] as const;

export const MEDIA_TYPES = ["IMAGE", "AUDIO"] as const;
export const USER_ROLES = ["CITIZEN", "OPERATOR", "DEPT_OFFICER", "ADMIN"] as const;
export const ANALYSIS_STATUSES = ["PENDING", "COMPLETED", "FAILED"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Severity = (typeof SEVERITIES)[number];
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];
export type MediaType = (typeof MEDIA_TYPES)[number];
export type UserRole = (typeof USER_ROLES)[number];
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

/** Roles that may see the authority dashboard / queues. */
export const AUTHORITY_ROLES: readonly UserRole[] = ["OPERATOR", "DEPT_OFFICER", "ADMIN"];
