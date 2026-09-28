# 17 — Deployment

**Project:** AI CivicEye
**Status:** `[PROPOSED]`. Nothing is deployed. Only local scaffold runs.

---

## 1. Components to Deploy
| Component | Tech | Status |
| --- | --- | --- |
| Frontend + Backend API | Next.js (App Router) | `[IMPLEMENTED scaffold]` |
| ML service | Python + FastAPI | `[PROPOSED]` |
| Database | PostgreSQL | `[IMPLEMENTED locally]` |
| Object/file storage | blob/object store | `[PROPOSED]` |
| Vector index | pgvector / FAISS | `[PROPOSED]` |

## 2. Architecture
```mermaid
flowchart TB
    U[Users] --> LB[HTTPS reverse proxy]
    LB --> WEB[Next.js FE+API]
    WEB --> MLSVC[FastAPI ML - internal only]
    WEB --> PG[(PostgreSQL)]
    WEB --> OBJ[(Object Storage)]
    MLSVC --> MDL[(models/ artifacts)]
    MLSVC --> VEC[(Vector index)]
```

## 3. Local Development
- **App:** `npm run dev` (Next.js) — reads `DATABASE_URL` from `.env`.
- **DB:** local PostgreSQL (`postgresql://postgres:postgres@127.0.0.1:5432/app_db`).
- **Schema:** `npx drizzle-kit push` after defining `src/db/schema.ts` (later task).
- **ML service `[PLANNED]`:** `uvicorn app:app` in `ml/` with its own venv.

## 4. Production Deployment `[PROPOSED]`
- Next.js app behind HTTPS proxy.
- ML service on an internal network only (not public).
- Managed PostgreSQL; managed object storage.
- Health checks: `/api/health` (app), `/health` (ML).

## 5. Environment Variables
| Variable | Scope | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | server | PostgreSQL connection (exists) |
| `ML_SERVICE_URL` | server | internal ML base URL `[PROPOSED]` |
| `OBJECT_STORAGE_*` | server | media storage creds `[PROPOSED]` |
| `STT_API_KEY` | server | speech-to-text `[PROPOSED]` |
| `GEOCODING_API_KEY` | server | reverse geocode `[PROPOSED]` |
| `NEXT_PUBLIC_MAP_KEY` | client | map tiles (public-safe) `[PROPOSED]` |

- Only `NEXT_PUBLIC_*` reach the browser. All other secrets stay server-side and are read via `process.env`.

## 6. Docker `[PROPOSED]`
`docker/` may hold: `web.Dockerfile`, `ml.Dockerfile`, `docker-compose.yml` (web + ml + postgres). Do not commit model weights or secrets.

## 7. Logging & Monitoring `[PROPOSED]`
- Structured app logs (no PII where avoidable).
- ML request/latency logs; error tracking.
- Uptime checks on both health endpoints.

> Do not claim deployment is complete. This is a target architecture.
