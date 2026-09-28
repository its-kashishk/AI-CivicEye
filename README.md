# AI CivicEye — Intelligent Civic Complaint & Prioritization System

**Hackathon PS:** PS 5 — AI Innovation for Public Services & Citizen-Centric Governance
**Areas:** Citizen grievance redressal · Urban governance

> **Status:** This repository currently contains a **Next.js (App Router) + PostgreSQL (Drizzle ORM) scaffold** plus the full **design documentation** for AI CivicEye. The AI CivicEye application features are **`[PROPOSED]` / not yet implemented**. Status labels used throughout: `[PROPOSED]` `[PLANNED]` `[IMPLEMENTED]` `[VERIFIED]` `[REQUIRES VERIFICATION]`.

---

## 1. Project Overview
AI CivicEye is a multimodal AI **decision-support layer** for civic grievance redressal. Citizens report civic problems via **text, voice, image, and location**; the system produces a **classified, de-duplicated, severity-assessed, priority-scored, department-routed, and explainable** civic incident — surfaced through a citizen app and an authority dashboard.

## 2. Features (Proposed)
- Multimodal complaint intake (text / voice / image / location)
- AI issue classification + confidence
- Severity assessment
- Explainable priority scoring
- Duplicate / similar complaint detection
- Automatic department routing
- Citizen complaint tracking
- Authority dashboard: priority queue, clusters, map/hotspots, analytics
- Audit trail for AI-influenced decisions

All features are `[PROPOSED]` except the base scaffold below.

## 3. Architecture (summary)
Three non-overlapping domains (see `docs/01_MASTER_ARCHITECTURE.md`):

| Domain | Owns | Tech |
| --- | --- | --- |
| Frontend | Citizen app + authority dashboard (UI) | Next.js + React + Tailwind `[IMPLEMENTED scaffold]` |
| Backend/API | APIs, auth, persistence, orchestration, routing | Next.js Route Handlers + Drizzle + PostgreSQL `[IMPLEMENTED scaffold]` |
| ML service | CV, NLP, embeddings, duplicate, severity, priority, explainability | Python + FastAPI `[PROPOSED]` |

## 4. Repository Structure

**Current (actual):**
```
.
├── src/app/            # Next.js App Router (pages, /api/health)
├── src/db/             # Drizzle client (index.ts) + schema.ts (empty scaffold)
├── docs/               # AI CivicEye design documentation (this task)
├── package.json, next.config.ts, drizzle.config.json, .env
```

**Proposed target (do NOT restructure yet — see `docs/15`):**
```
ai-civiceye/
├── docs/
├── frontend/            # or keep Next.js app at repo root
├── backend/             # (Next.js API here in this repo's reconciled design)
├── ml/
│   ├── cv/ · nlp/ · duplicate_detection/ · priority_engine/ · common/
├── data/ (raw/ · processed/ · README.md)
├── models/
├── tests/ · scripts/ · docker/
└── README.md · .gitignore
```

## 5. Setup
```bash
npm install
# Ensure PostgreSQL is running and .env has DATABASE_URL
```
`.env` (already present):
```
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
```

## 6. Environment Variables
| Variable | Scope | Status |
| --- | --- | --- |
| `DATABASE_URL` | server | present |
| `ML_SERVICE_URL`, `OBJECT_STORAGE_*`, `STT_API_KEY`, `GEOCODING_API_KEY` | server | `[PROPOSED]` |
| `NEXT_PUBLIC_MAP_KEY` | client | `[PROPOSED]` |

Only `NEXT_PUBLIC_*` vars reach the browser; all secrets stay server-side.

## 7. Running

### Frontend + Backend (Next.js) — `[IMPLEMENTED scaffold]`
```bash
npm run dev     # development
npm run build   # production build
```
Health check: `GET /api/health` → `{ "ok": true }`.

### ML service — `[PLANNED]`
```bash
# planned: cd ml && uvicorn app:app --reload
```
> Not yet implemented; command shown as planned.

## 8. Testing — `[PLANNED]`
```bash
npx next typegen
npm exec tsc -- --noEmit
npm run build
```
See `docs/16_TESTING_AND_VALIDATION.md`.

## 9. Datasets
- **Dataset A (text):** synthetically generated, BMC-grounded civic complaint dataset — https://www.kaggle.com/competitions/mumbai-nagar-seva-bmc-civic-complaint-resolution-2018-2024/data
- **Dataset B (vision):** Zenodo 7681359 (road healthy/damaged, `[VERIFIED]`), Zenodo 17952339 (UAV road-defect segmentation, `[VERIFIED]`).

Details, limitations, and verification status: `docs/06_DATA_AND_DATASET_SPEC.md`.

## 10. Documentation Index
| # | Doc |
| --- | --- |
| 01 | [Master Architecture](docs/01_MASTER_ARCHITECTURE.md) |
| 02 | [PRD](docs/02_PRD.md) |
| 03 | [ML PRD](docs/03_ML_PRD.md) |
| 04 | [Backend PRD](docs/04_BACKEND_PRD.md) |
| 05 | [Frontend PRD](docs/05_FRONTEND_PRD.md) |
| 06 | [Data & Dataset Spec](docs/06_DATA_AND_DATASET_SPEC.md) |
| 07 | [API Contract](docs/07_API_CONTRACT.md) |
| 08 | [Database Schema](docs/08_DATABASE_SCHEMA.md) |
| 09 | [AI Pipeline](docs/09_AI_PIPELINE.md) |
| 10 | [CV Module](docs/10_CV_MODULE.md) |
| 11 | [NLP Module](docs/11_NLP_MODULE.md) |
| 12 | [Duplicate Detection](docs/12_DUPLICATE_DETECTION.md) |
| 13 | [Priority Engine](docs/13_PRIORITY_ENGINE.md) |
| 14 | [Project Report](docs/14_PROJECT_REPORT.md) |
| 15 | [Team Implementation Guide](docs/15_TEAM_IMPLEMENTATION_GUIDE.md) |
| 16 | [Testing & Validation](docs/16_TESTING_AND_VALIDATION.md) |
| 17 | [Deployment](docs/17_DEPLOYMENT.md) |
| 18 | [Risks & Limitations](docs/18_RISKS_AND_LIMITATIONS.md) |

## 11. Team Responsibilities (proposed)
- **Member A — ML/CV**, **Member B — NLP/AI**, **Member C — Backend**, **Member D — Frontend**. Flexible for smaller teams. See `docs/15_TEAM_IMPLEMENTATION_GUIDE.md`.

## 12. Important Notes
- This is **decision-support**, not autonomous decision-making — a human stays in the loop.
- All example numbers in docs (e.g., priority 91/100, "17 similar complaints") are **illustrative**, not real model results.
- No accuracy/F1/latency/dataset statistics are claimed until measured/verified.
