# 07 — API Contract

**Project:** AI CivicEye
**Status:** All endpoints below are `[PROPOSED]` unless marked otherwise. Only `GET /api/health` is `[IMPLEMENTED]`.

**Base:** `/api` (Next.js Route Handlers). JSON over HTTPS. Auth via session/JWT (see `04_BACKEND_PRD.md`). Enumerations match `03_ML_PRD.md` §0 and `08_DATABASE_SCHEMA.md`.

**Standard error envelope**
```json
{ "error": { "code": "STRING_CODE", "message": "human readable", "retryable": false } }
```
Common codes: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `ML_UNAVAILABLE`, `RATE_LIMITED`, `INTERNAL`.

---

## 0. GET /api/health `[IMPLEMENTED]`
- **Purpose:** liveness + DB check.
- **Auth:** none.
- **200:** `{ "ok": true }` · **500:** `{ "ok": false }`

---

## 1. POST /api/complaints `[PROPOSED]`
- **Purpose:** Create & persist a complaint (runs full orchestration).
- **Auth:** citizen or authority.
- **Request**
```json
{
  "text": "Large pothole near main road",
  "category_hint": "POTHOLE_ROAD_DAMAGE",
  "urgency": "HIGH",
  "location": { "lat": 19.07, "lng": 72.87, "address": "Main Rd" },
  "media": [{ "type": "IMAGE", "upload_id": "uuid" }]
}
```
- **201**
```json
{
  "id": "uuid",
  "status": "ROUTED",
  "category": "POTHOLE_ROAD_DAMAGE",
  "severity": "HIGH",
  "priority": { "score": 0, "level": "HIGH", "reasons": ["severity=HIGH"] },
  "department": "ROADS_MUNICIPAL_ENGINEERING",
  "duplicate": { "is_duplicate": false, "cluster_id": null }
}
```
- **Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `503 ML_UNAVAILABLE` (complaint still saved as `SUBMITTED`, analysis deferred).

---

## 2. POST /api/complaints/analyze `[PROPOSED]`
- **Purpose:** AI analysis **preview** (no persistence).
- **Auth:** citizen.
- **Request:** same shape as create (media optional via `upload_id`).
- **200**
```json
{
  "category": "POTHOLE_ROAD_DAMAGE",
  "category_confidence": 0.0,
  "severity": "HIGH",
  "priority": { "score": 0, "level": "HIGH", "reasons": ["..."] },
  "duplicate_preview": { "is_duplicate": false, "similar_count": 0 },
  "explanation": ["..."]
}
```
- **Errors:** `422` unanalyzable input; `503 ML_UNAVAILABLE` (client may still submit).

---

## 3. POST /api/complaints/image `[PROPOSED]`
- **Purpose:** Upload image evidence; returns `upload_id` (+ optional CV preview).
- **Auth:** citizen. **Content-Type:** `multipart/form-data`.
- **200**
```json
{ "upload_id": "uuid", "cv_preview": { "category": "POTHOLE_ROAD_DAMAGE", "confidence": 0.0 } }
```
- **Errors:** `400` unsupported type/size; `422` unrecognized image (low confidence → suggest add text).

---

## 4. POST /api/complaints/voice `[PROPOSED]`
- **Purpose:** Upload audio; returns transcript via STT.
- **Auth:** citizen. **Content-Type:** `multipart/form-data`.
- **200**
```json
{ "upload_id": "uuid", "transcript": "there is a pothole ...", "language": "en" }
```
- **Errors:** `400` unsupported audio; `503` STT unavailable (fallback to text).

---

## 5. GET /api/complaints/{id} `[PROPOSED]`
- **Purpose:** Full complaint detail (with AI analysis, priority, status history).
- **Auth:** owner or authority (dept-scoped).
- **200:** complaint object incl. `status_history[]`, `analysis`, `priority`, `department`, `media[]`, `location`, `cluster_id`.
- **Errors:** `403`, `404`.

---

## 6. GET /api/complaints `[PROPOSED]`
- **Purpose:** List/filter complaints.
- **Auth:** authority (all/dept-scoped) or citizen (`mine=true`).
- **Query:** `mine`, `status`, `category`, `department`, `severity`, `bbox`, `page`, `pageSize`, `sort`.
- **200:** `{ "items": [...], "page": 1, "pageSize": 20, "total": 0 }`

---

## 7. GET /api/complaints/priority `[PROPOSED]`
- **Purpose:** Priority-ordered queue.
- **Auth:** authority.
- **Query:** `department?`, `level?`, `page`, `pageSize`.
- **200:** `{ "items": [{ "id": "...", "priority": {"score":0,"level":"HIGH"}, "category":"...", "severity":"..." }], "total": 0 }`

---

## 8. GET /api/complaints/duplicates `[PROPOSED]`
- **Purpose:** List duplicate clusters.
- **Auth:** authority.
- **200**
```json
{ "clusters": [{ "cluster_id": "uuid", "size": 0, "category": "POTHOLE_ROAD_DAMAGE", "representative_id": "uuid", "member_ids": ["..."] }] }
```

---

## 9. PATCH /api/complaints/{id}/status `[PROPOSED]`
- **Purpose:** Update lifecycle status.
- **Auth:** operator/dept-officer/admin.
- **Request**
```json
{ "status": "IN_PROGRESS", "note": "Inspection scheduled" }
```
- **200:** updated complaint summary + new `status_history` entry. Appends `AuditLog`.
- **Errors:** `400` invalid transition; `403`; `404`.

---

## 10. GET /api/dashboard/overview `[PROPOSED]`
- **Purpose:** KPIs + aggregates for the dashboard.
- **Auth:** authority.
- **200**
```json
{
  "totals": { "open": 0, "resolved": 0, "clusters": 0 },
  "by_category": [], "by_severity": [], "by_status": [],
  "volume_over_time": [], "top_hotspots": []
}
```
> Aggregates return **real** computed data only; empty arrays until data exists. No fabricated figures.

---

## 11. Endpoint Summary

| Method | Path | Auth | Status |
| --- | --- | --- | --- |
| GET | /api/health | none | `[IMPLEMENTED]` |
| POST | /api/complaints | citizen/auth | `[PROPOSED]` |
| POST | /api/complaints/analyze | citizen | `[PROPOSED]` |
| POST | /api/complaints/image | citizen | `[PROPOSED]` |
| POST | /api/complaints/voice | citizen | `[PROPOSED]` |
| GET | /api/complaints/{id} | owner/auth | `[PROPOSED]` |
| GET | /api/complaints | auth/citizen | `[PROPOSED]` |
| GET | /api/complaints/priority | auth | `[PROPOSED]` |
| GET | /api/complaints/duplicates | auth | `[PROPOSED]` |
| PATCH | /api/complaints/{id}/status | auth | `[PROPOSED]` |
| GET | /api/dashboard/overview | auth | `[PROPOSED]` |

All example values are **illustrative**, not real results.
