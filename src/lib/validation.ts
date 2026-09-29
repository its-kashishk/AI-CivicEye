// Request validation schemas (zod). Enumerations come from src/lib/enums.ts.
import { z } from "zod";
import { CATEGORIES, COMPLAINT_STATUSES, MEDIA_TYPES, PRIORITY_LEVELS, SEVERITIES } from "@/lib/enums";

export const locationInput = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().trim().max(500).nullish(),
  ward: z.string().trim().max(100).nullish(),
});

const mediaRef = z.object({
  type: z.enum(MEDIA_TYPES),
  upload_id: z.uuid(),
});

const complaintFields = {
  text: z.string().trim().max(5000).optional(),
  category_hint: z.enum(CATEGORIES).nullish(),
  urgency: z.enum(SEVERITIES).nullish(),
  location: locationInput.nullish(),
  media: z.array(mediaRef).max(5).default([]),
};

/** Body of POST /api/complaints and POST /api/complaints/analyze. */
export const complaintInput = z.object(complaintFields).refine(
  (v) => (v.text !== undefined && v.text.length >= 5) || v.media.length > 0,
  { message: "Provide complaint text (min 5 characters) or at least one media upload", path: ["text"] },
);

export const complaintPatch = z
  .object({
    text: z.string().trim().min(5).max(5000).optional(),
    category_hint: z.enum(CATEGORIES).nullish(),
    urgency: z.enum(SEVERITIES).nullish(),
    location: locationInput.optional(),
    // Authority-only fields:
    department_code: z.string().trim().min(1).max(64).optional(),
    category: z.enum(CATEGORIES).optional(),
    resolution_note: z.string().trim().min(1).max(2000).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: "No updatable fields provided" });

export const statusInput = z.object({
  status: z.enum(COMPLAINT_STATUSES),
  note: z.string().trim().max(1000).optional(),
  resolution_note: z.string().trim().min(1).max(2000).optional(),
});

const page = z.coerce.number().int().min(1).default(1);
const pageSize = z.coerce.number().int().min(1).max(100).default(20);

const bbox = z
  .string()
  .transform((s) => s.split(",").map(Number))
  .refine((a) => a.length === 4 && a.every(Number.isFinite), "bbox must be minLng,minLat,maxLng,maxLat")
  .refine(
    ([minLng, minLat, maxLng, maxLat]) =>
      minLng >= -180 && maxLng <= 180 && minLat >= -90 && maxLat <= 90 && minLng <= maxLng && minLat <= maxLat,
    "bbox out of range",
  );

export const listQuery = z.object({
  mine: z.enum(["true", "false"]).optional(),
  status: z.enum(COMPLAINT_STATUSES).optional(),
  category: z.enum(CATEGORIES).optional(),
  severity: z.enum(SEVERITIES).optional(),
  department: z.string().trim().min(1).max(64).optional(),
  bbox: bbox.optional(),
  sort: z.enum(["created_at", "-created_at", "-priority"]).default("-created_at"),
  page,
  pageSize,
});

export const priorityQuery = z.object({
  department: z.string().trim().min(1).max(64).optional(),
  level: z.enum(PRIORITY_LEVELS).optional(),
  page,
  pageSize,
});

export const pageQuery = z.object({ page, pageSize });

export const registerInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(8).max(128),
  phone: z.string().trim().min(5).max(20).optional(),
});

export const loginInput = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(128),
});
