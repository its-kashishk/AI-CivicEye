# 14 — Project Report

**Project:** AI CivicEye — Intelligent Civic Complaint & Prioritization System
**Hackathon PS:** PS 5 — AI Innovation for Public Services & Citizen-Centric Governance
**Status:** `[PROPOSED]` design report. Only the base Next.js + PostgreSQL scaffold is `[IMPLEMENTED]`. **No results, metrics, or screenshots are fabricated.**

> Written to be understandable by a teammate who has **not** worked on the project. Diagrams are used to explain, not decorate.

---

## 1. Executive Summary
AI CivicEye is a multimodal AI decision-support layer for civic grievance redressal. Citizens report issues via text, voice, image, and location; the system classifies, de-duplicates, scores priority, routes to the right department, and **explains** each decision — surfaced through a citizen app and an authority dashboard.

## 2. Problem
Civic complaint systems are mostly manual intake portals. They don't understand multimodal evidence, don't detect duplicates, and prioritize inconsistently. Authorities lack an objective, explainable way to decide what to fix first. (See `02_PRD.md`.)

## 3. Why Existing Systems Are Insufficient

```mermaid
flowchart LR
    subgraph Before[Existing grievance system]
        B1[Unstructured intake] --> B2[Manual triage]
        B2 --> B3[Subjective priority]
        B3 --> B4[Duplicates logged separately]
        B4 --> B5[Frequent misrouting]
    end
    subgraph After[AI CivicEye]
        A1[Multimodal intake] --> A2[AI classification]
        A2 --> A3[Explainable priority]
        A3 --> A4[Duplicate clustering]
        A4 --> A5[Auto routing]
    end
    Before -.improves into.-> After
```

## 4. AI CivicEye (Solution)
A three-domain system — Frontend (UI), Backend/API (orchestration + persistence), ML service (models) — that turns raw reports into structured, prioritized, routed, explainable incidents. (See `01_MASTER_ARCHITECTURE.md`.)

## 5. Innovation
Not just a registration portal: it **combines** CV + NLP + voice + duplicate detection + severity + explainable priority + routing + geospatial analytics into one decision-support layer.

```mermaid
flowchart TD
    P[Civic problem] --> S[AI CivicEye]
    S --> O1[Understood]
    S --> O2[Prioritized]
    S --> O3[De-duplicated]
    S --> O4[Routed]
    S --> O5[Explained]
```

## 6. Target Users
Citizen · Operator · Department officer · Administrator. (Personas in `02_PRD.md`.)

## 7. End-to-End Workflow (Citizen)
```mermaid
flowchart LR
    A[Open app] --> B[Report Issue]
    B --> C[Text/Voice/Image + Location]
    C --> D[AI Analysis Preview]
    D --> E[Submit]
    E --> F[Track status]
```

## 8. System Architecture
```mermaid
flowchart LR
    FE[Frontend - Next.js] --> API[Backend API - Next.js]
    API --> ML[ML Service - FastAPI PROPOSED]
    API --> DB[(PostgreSQL)]
    API --> OBJ[(Object Storage)]
    ML --> VEC[(Vector index)]
```
(Full version + ownership in `01_MASTER_ARCHITECTURE.md`.)

## 9. Data Architecture
```mermaid
flowchart LR
    RAW[data/raw - immutable] --> PROC[data/processed - splits/features]
    PROC --> TRAIN[Train]
    PROC --> VAL[Validation]
    PROC --> TEST[Test]
```
Datasets: synthetic BMC complaint dataset (text) + verified Zenodo road-image datasets (vision). (See `06_DATA_AND_DATASET_SPEC.md`.)

## 10. ML Architecture
Modules ML-01..ML-06: classification, CV, duplicate detection, severity, priority, explainability. (See `03_ML_PRD.md`.)

## 11. Computer Vision
```mermaid
flowchart LR
    IMG[Image] --> PRE[Preprocess] --> INF[Model] --> TH{Conf?} --> OUT[class + confidence]
    TH -->|low| REV[OTHER/review]
```
MVP class focus: road damage (verified data). (See `10_CV_MODULE.md`.)

## 12. NLP
```mermaid
flowchart LR
    T[Text] --> PRE[Preprocess+lang] --> CLF[Classifier] --> CAT[category]
    PRE --> EMB[Embeddings] --> SIM[similarity]
```
(See `11_NLP_MODULE.md`.)

## 13. Duplicate Detection
```mermaid
flowchart LR
    NEW[New] --> E[Embedding] --> ANN[NN search] --> GATES[geo+time+category gates] --> TH{sim>=t} --> CL[Cluster]
```
(See `12_DUPLICATE_DETECTION.md`.)

## 14. Priority Engine
```mermaid
flowchart LR
    SIG[s,c,u,l,d,k] --> N[Normalize] --> W[Weighted sum] --> SC[score 0-100] --> LV[level] --> R[reasons]
```
Configurable, explainable; weights **not yet validated**. (See `13_PRIORITY_ENGINE.md`.)

## 15. Backend
```mermaid
flowchart TB
    AUTH[Auth/RBAC] --> CS[Complaint svc]
    CS --> ORCH[AI orchestrator] --> ML[ML svc]
    CS --> DB[(PostgreSQL)]
    CS --> AUD[Audit]
```
(See `04_BACKEND_PRD.md`.)

## 16. Frontend
```mermaid
flowchart LR
    subgraph Citizen App
        H[Home] --> R[Report] --> P[Preview] --> TR[Track]
    end
    subgraph Authority Dashboard
        O[Overview] --> Q[Priority Queue] --> CD[Details]
        O --> MP[Map] --> DC[Clusters]
    end
```
(See `05_FRONTEND_PRD.md`.)

## 17. Database
```mermaid
erDiagram
    CITIZEN ||--o{ COMPLAINT : files
    COMPLAINT ||--o| AI_ANALYSIS : has
    COMPLAINT ||--o| PRIORITY_ASSESSMENT : has
    COMPLAINT }o--o| DUPLICATE_CLUSTER : in
    COMPLAINT }o--|| DEPARTMENT : routed_to
    COMPLAINT ||--o{ COMPLAINT_STATUS_HISTORY : transitions
```
(Full ERD in `08_DATABASE_SCHEMA.md`.)

## 18. APIs
```mermaid
sequenceDiagram
    participant FE
    participant API
    participant ML
    participant DB
    FE->>API: POST /api/complaints
    API->>ML: analyze + duplicates + priority
    ML-->>API: results
    API->>DB: persist + audit
    API-->>FE: complaint id + summary
```
(Full contract in `07_API_CONTRACT.md`.)

## 19. Security
```mermaid
flowchart LR
    Browser -->|HTTPS + JWT| API
    API -->|internal| ML
    API --> DB
    Browser -.no direct.-> ML
    Browser -.no direct.-> DB
```
RBAC roles, server-side secrets, internal-only ML. (See `01` §8, `04` §6.)

## 20. Testing
Unit, API, ML, CV, NLP, integration, frontend, security, edge cases; system must **fail safely**. (See `16_TESTING_AND_VALIDATION.md`.)

## 21. Dataset Limitations
BMC dataset is **synthetic**; verified image datasets cover road damage only; other CV classes need data. (See `06` and `18`.)

## 22. Expected Impact `[PLANNED]`
Faster, more consistent, explainable triage; fewer duplicate work orders; better routing. Impact to be **measured**, not asserted.

## 23. Scalability
Stateless API scaling; ML service scaled independently; vector index for similarity; object storage for media; DB indexes for queries.

## 24. Future Scope
Multilingual at scale, SLA tracking, notifications, mobile app, offline reporting, retraining loop, richer geospatial analytics.

## 25. Risks
Synthetic-data mismatch, false duplicates, wrong severity, language variation, location inaccuracy, model bias, privacy. (See `18_RISKS_AND_LIMITATIONS.md`.)

## 26. Conclusion
AI CivicEye proposes a realistic, student-implementable, explainable AI layer for civic grievance redressal. This report is a **design specification**; implementation and evaluation follow in later steps.

---

## Appendix A — Complaint Lifecycle
```mermaid
stateDiagram-v2
    [*] --> SUBMITTED
    SUBMITTED --> ANALYZED
    ANALYZED --> ROUTED
    ROUTED --> ACKNOWLEDGED
    ACKNOWLEDGED --> IN_PROGRESS
    IN_PROGRESS --> RESOLVED
    RESOLVED --> CLOSED
    RESOLVED --> REOPENED
    REOPENED --> IN_PROGRESS
    SUBMITTED --> DUPLICATE_MERGED
    ANALYZED --> REJECTED
```

## Appendix B — Deployment Architecture
```mermaid
flowchart TB
    U[Users] --> LB[HTTPS proxy]
    LB --> WEB[Next.js FE+API]
    WEB --> MLSVC[FastAPI ML]
    WEB --> PG[(PostgreSQL)]
    WEB --> OBJ[(Object Storage)]
    MLSVC --> MDL[(models/)]
```

## Appendix C — Authority Dashboard Conceptual Layout
```mermaid
flowchart TB
    subgraph Dashboard
        KPI[KPI cards]
        CHARTS[Charts: category/severity/status]
        QUEUE[Priority queue table]
        MAP[Hotspot map]
        CLUS[Duplicate clusters panel]
    end
    KPI --> CHARTS --> QUEUE --> MAP --> CLUS
```

## Appendix D — Recommended Charts (real data only)
Category distribution · severity distribution · department distribution · volume over time · resolution status · duplicate cluster sizes · geographic hotspots · confusion matrix · precision/recall/F1 · priority distribution.

> **Do not fabricate performance graphs.** Where results are unavailable, write `[Insert model evaluation results after training]`. Any illustrative chart must be labeled **"Illustrative — not actual model results."**
