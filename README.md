# AI CivicEye
### AI-Powered Civic Grievance Intelligence & Municipal Decision Support Platform

**Hackathon PS:** PS 5 — AI Innovation for Public Services & Citizen-Centric Governance  
**Areas:** Citizen grievance redressal · Urban governance

> **Status:** This repository currently contains a **Next.js (App Router) + PostgreSQL (Drizzle ORM) scaffold** plus the full **design documentation** for AI CivicEye. The AI CivicEye application features are **`[PROPOSED]` / not yet implemented**. Status labels used throughout: `[PROPOSED]` `[PLANNED]` `[IMPLEMENTED]` `[VERIFIED]` `[REQUIRES VERIFICATION]`.

AI CivicEye is a multimodal AI-powered civic grievance redressal platform that helps citizens report urban issues through text, voice, images, and geolocation while providing municipal authorities with intelligent complaint triage, severity assessment, priority scoring, duplicate detection, department routing, geospatial visualization, and resolution tracking.

**Safety Principle:** AI CivicEye is designed as an AI-assisted decision-support platform. AI-generated category, severity, priority, and duplicate insights support municipal review rather than replacing human authority judgment.

---

## Table of Contents

* [Project Overview](#project-overview)
* [Demo & Screenshots](#demo--screenshots)
* [Problem Statement](#problem-statement)
* [Solution](#solution)
* [Key Features](#key-features)

  * [Citizen Experience](#citizen-experience)
  * [Authority Command Center](#authority-command-center)
  * [Priority Queue](#priority-queue)
  * [Duplicate Complaint Detection](#duplicate-complaint-detection)
  * [Civic Issue Map](#civic-issue-map)
  * [Department Queues](#department-queues)
  * [Operations Analytics](#operations-analytics)
* [End-to-End Workflow](#end-to-end-workflow)
* [AI Decision Support](#ai-decision-support)
* [Fail-Safe Design](#fail-safe-design)
* [System Architecture](#system-architecture)
* [Technology Stack](#technology-stack)
* [Project Structure](#project-structure)
* [Getting Started](#getting-started)

  * [Prerequisites](#prerequisites)
  * [Clone the Repository](#1-clone-the-repository)
  * [Install Dependencies](#2-install-dependencies)
  * [Configure Environment Variables](#3-configure-environment-variables)
  * [Initialize the Database](#4-initialize-the-database)
  * [Run the Development Server](#5-run-the-development-server)
* [Testing and Validation](#testing-and-validation)
* [Functional Testing Checklist](#functional-testing-checklist)
* [API Surface](#api-surface)
* [Security and Privacy Principles](#security-and-privacy-principles)
* [Current Limitations](#current-limitations)
* [Future Scope](#future-scope)
* [Project Documentation](#project-documentation)
* [Project Contribution](#project-contribution)
* [Project Status](#project-status)
* [Contributing](#contributing)
* [License](#license)

---

# Project Overview

Urban civic bodies receive large volumes of complaints related to roads, drainage, waste management, streetlights, water supply, trees, and other public infrastructure.

These complaints are often:

* fragmented across different reporting channels
* unstructured and difficult to categorize
* duplicated by multiple citizens
* difficult to prioritize consistently
* slow to route to the appropriate department
* difficult for citizens to track transparently

**AI CivicEye** addresses this problem through a unified digital workflow connecting citizen reporting with municipal decision support.

Citizens can submit complaints using multiple input modalities, while the platform assists authorities by analyzing, prioritizing, clustering, routing, and tracking civic issues.

---

## Demo & Screenshots

### Demo Video

[Watch the AI CivicEye Demo](YOUR_DEMO_VIDEO_LINK)

The demo shows the complete civic grievance workflow:

```text
Citizen Complaint Submission
        ↓
Text + Image + Voice + Location
        ↓
AI-Assisted Complaint Analysis
        ↓
Category + Severity + Priority
        ↓
Duplicate Complaint Detection
        ↓
Department Routing
        ↓
Authority Review
        ↓
Status Update / Resolution
        ↓
Citizen Complaint Tracking
```

### Screenshots

#### 1. Citizen Complaint Submission

![AI CivicEye - Citizen Complaint Submission](docs/screenshots/AI-CivicEye_Citizen_Complaint_Submission.png)

Shows the citizen-facing complaint submission interface, including complaint description, image upload, voice input, and location capture.

#### 2. AI Analysis & Priority Assessment

![AI CivicEye - AI Analysis and Priority](docs/screenshots/AI-CivicEye_AI_Analysis_Priority.png)

Shows the AI-assisted analysis of a submitted civic complaint, including predicted category, severity, priority score, and supporting information.

#### 3. Complaint Tracking

![AI CivicEye - Complaint Tracking](docs/screenshots/AI-CivicEye_Complaint_Tracking.png)

Shows the citizen complaint tracking interface with complaint details, assigned department, current status, and complaint history.

#### 4. Authority Dashboard

![AI CivicEye - Authority Dashboard](docs/screenshots/AI-CivicEye_Authority_Dashboard.png)

Shows the authority command center with complaint overview, operational KPIs, priority complaints, and status information.

#### 5. Priority Queue

![AI CivicEye - Priority Queue](docs/screenshots/AI-CivicEye_Priority_Queue.png)

Shows the authority priority queue with complaint severity, priority score, category, department, and AI-generated reasoning.

#### 6. Duplicate Complaint Detection

![AI CivicEye - Duplicate Complaints](docs/screenshots/AI-CivicEye_Duplicate_Complaints.png)

Shows potentially duplicate complaints grouped into clusters to help authorities identify repeated reports of the same civic issue.

#### 7. Civic Issue Map

![AI CivicEye - Civic Issue Map](docs/screenshots/AI-CivicEye_Civic_Issue_Map.png)

Shows the geographic distribution of reported civic issues, allowing authorities to identify locations and potential issue concentrations.

#### 8. Analytics Dashboard

![AI CivicEye - Analytics Dashboard](docs/screenshots/AI-CivicEye_Analytics_Dashboard.png)

Shows operational analytics including complaint volume, category distribution, severity distribution, status information, and resolution activity.

> **Note:** AI CivicEye presents AI-generated category, severity, priority, and duplicate insights as decision-support information. These outputs are intended to assist authorities and do not replace human review or municipal decision-making.

---

# Problem Statement

Municipal corporations often struggle to efficiently process large volumes of heterogeneous civic grievances.

A single public issue may be reported multiple times, while genuinely critical hazards can remain buried among lower-priority complaints.

AI CivicEye is designed to provide a unified system where:

```text
Citizen Report
      ↓
Text / Image / Voice / Location
      ↓
AI-Assisted Analysis
      ↓
Category + Severity + Priority
      ↓
Duplicate Detection
      ↓
Department Routing
      ↓
Authority Review
      ↓
Status / Resolution Tracking
```

The objective is to improve visibility, prioritization, routing, and transparency across the civic grievance lifecycle.

---

# Solution

AI CivicEye combines a citizen-facing reporting application with an authority command center.

Citizens can submit complaints using multiple input modalities, while municipal operators and department officers receive structured information to support complaint triage, prioritization, routing, and resolution.

The platform connects the complete complaint lifecycle:

```text
Report
  ↓
Analyze
  ↓
Prioritize
  ↓
Route
  ↓
Review
  ↓
Resolve
  ↓
Track
```

The system is designed so that AI assists the workflow while municipal authorities retain control over final decisions.

---

# Key Features

## Citizen Experience

### Landing Page

The citizen-facing landing page provides:

* AI CivicEye branding
* civic-tech value proposition
* guided workflow explanation
* quick complaint tracking
* report issue CTA
* authentication entry points

### Authentication

The platform supports:

* Citizen registration
* Login
* Session management
* Role-aware authentication
* Citizen / authority workflow separation

### Multimodal Complaint Submission

Citizens can provide:

| Input    | Capability                                  |
| -------- | ------------------------------------------- |
| Text     | Describe the civic issue                    |
| Image    | Upload photographic evidence                |
| Voice    | Record complaint and preview transcript     |
| Location | Capture GPS coordinates or enter an address |

### AI Analysis Preview

The platform provides an AI-assisted assessment containing:

* predicted category
* confidence
* severity
* priority score
* priority reasoning
* duplicate detection information

The AI assessment is presented as decision support rather than replacing human authority judgment.

### Complaint Tracking

Citizens can:

* view submitted complaints
* search and filter complaints
* inspect complaint details
* view AI assessment
* view assigned department
* follow status progression
* inspect complaint history

---

# Authority Command Center

## Overview Dashboard

The authority dashboard provides operational KPIs including:

* open complaints
* resolved complaints
* active duplicate clusters
* critical-priority complaints

It also provides visual analytics for:

* category distribution
* severity distribution
* status distribution
* complaint volume trends

---

## Complaint Management

Authorities can:

* search complaints
* filter by status
* filter by category
* filter by severity
* filter by department
* open complaint details
* inspect AI assessment
* review duplicate information
* update complaint status

---

## Resolution and Status Management

Authorities can update complaint status and record resolution notes.

The complaint lifecycle is represented through a visual timeline so that citizens and authorities can understand the progression of an issue.

---

## Priority Queue

Complaints are presented through a ranked triage workflow.

The priority interface supports:

* priority score
* priority level
* severity
* category
* department
* complaint status
* AI-generated reasoning

Critical and high-priority complaints receive stronger visual emphasis.

---

## Duplicate Complaint Detection

AI CivicEye provides a duplicate-cluster inspection workflow.

Authorities can inspect:

* cluster identifier
* representative complaint
* cluster size
* dominant category
* related complaints

This helps reduce operational noise caused by multiple reports describing the same civic issue.

---

## Civic Issue Map

The authority interface provides an interactive geographic visualization of reported civic issues.

The map supports:

* incident locations
* category filtering
* severity-based visualization
* incident inspection
* geographic identification of issue concentrations

---

## Department Queues

Complaints can be organized around municipal departments including:

* Roads / Municipal Engineering
* Solid Waste Management
* Storm Water / Drainage
* Electrical / Street Lighting
* Gardens / Tree Authority
* Water Supply
* General

---

## Operations Analytics

The authority interface provides data-backed operational analytics covering areas such as:

* complaint volume
* category trends
* severity distribution
* resolution activity
* operational patterns

---

# End-to-End Workflow

```text
                         AI CIVICEYE
                              |
                 +------------+------------+
                 |                         |
              CITIZEN                  AUTHORITY
                 |                         |
          Report Civic Issue          Command Center
                 |                         |
       +---------+---------+       +-------+--------+
       |         |         |       |       |        |
      Text     Image     Voice   KPIs   Priority   Map
       |         |         |       |       |        |
       +---------+---------+       +-------+--------+
                 |
              Location
                 |
                 v
          AI Analysis Preview
                 |
        +--------+---------+
        |        |         |
     Category Severity  Priority
        |        |         |
        +--------+---------+
                 |
          Duplicate Check
                 |
                 v
          Complaint Created
                 |
                 v
          Department Routing
                 |
                 v
          Authority Review
                 |
                 v
          Status / Resolution
                 |
                 v
          Citizen Tracking
```

---

# AI Decision Support

AI CivicEye is designed around explainable decision support rather than opaque automated decisions.

The analysis pipeline considers:

```text
Complaint Inputs
      |
      +-- Text
      +-- Image
      +-- Voice / Transcript
      +-- Location
            |
            v
      AI Analysis Engine
            |
      +-----+-------------+
      |     |             |
      v     v             v
   Category Severity    Priority
      |     |             |
      +-----+-------------+
            |
            v
    Duplicate Detection
            |
            v
     Department Routing
```

The platform is designed to expose meaningful AI reasoning and confidence information to support human review.

---

# Fail-Safe Design

AI CivicEye follows a graceful degradation principle.

If an AI analysis component becomes unavailable:

```text
AI Analysis Failed
       ↓
Complaint is NOT discarded
       ↓
Citizen can still submit
       ↓
Complaint remains persisted
       ↓
Authority can review it
```

This prevents AI-service failure from becoming a complete reporting failure.

---

# System Architecture

```text
+-------------------------------------------------------------+
|                      CITIZEN APPLICATION                    |
|                                                             |
|  Landing | Auth | Report | Tracking | Complaint Details     |
+-----------------------------+-------------------------------+
                              |
                         REST APIs
                              |
                              v
+-------------------------------------------------------------+
|                    NEXT.JS APPLICATION                      |
|                                                             |
|  App Router | API Routes | Authentication | AI Engine       |
|  API Client | RBAC       | Validation     | Routing         |
+---------------+-----------------------------+---------------+
                |                             |
                v                             v
+-------------------------+       +---------------------------+
| PostgreSQL + Drizzle    |       | Authority Command Center  |
|                         |       |                           |
| Citizens                |       | KPI Dashboard             |
| Complaints              |       | Priority Queue            |
| Media                   |       | Duplicate Clusters        |
| AI Analysis             |       | Civic Issue Map           |
| Priority Scores         |       | Department Queues         |
| Locations               |       | Analytics                 |
| Departments             |       | Resolution Workflow       |
| Audit Logs              |       |                           |
+-------------------------+       +---------------------------+
```

The architecture consists of:

1. **Citizen Application** — reporting, tracking, authentication, and complaint interaction.
2. **Application/API Layer** — request handling, authentication, validation, AI integration, and routing.
3. **Data Layer** — complaint, citizen, media, location, department, and AI-related persistence.
4. **Authority Operations** — dashboard, prioritization, duplicate inspection, geographic visualization, analytics, and resolution workflows.

---

# Technology Stack

| Technology         | Purpose                               |
| ------------------ | ------------------------------------- |
| Next.js 16         | Full-stack web application framework  |
| React 19           | Frontend UI                           |
| TypeScript         | Type-safe development                 |
| Tailwind CSS       | Responsive styling                    |
| Lucide React       | Interface icons                       |
| Next.js App Router | Application routing                   |
| Next.js API Routes | Backend/API layer                     |
| PostgreSQL         | Persistent application database       |
| Drizzle ORM        | Database access and schema management |
| AI / ML Services   | Civic complaint analysis              |
| REST APIs          | Frontend ↔ backend communication      |
| Git / GitHub       | Version control and collaboration     |

---

# Project Structure

```text
AI-CivicEye/
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── complaints/
│   │   │   ├── dashboard/
│   │   │   ├── departments/
│   │   │   └── health/
│   │   │
│   │   ├── login/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── authority/
│   │   │   ├── InteractiveMap.tsx
│   │   │   ├── OverviewCharts.tsx
│   │   │   └── StatusUpdateModal.tsx
│   │   │
│   │   ├── citizen/
│   │   │   ├── AIAnalysisCard.tsx
│   │   │   ├── ComplaintTimeline.tsx
│   │   │   ├── ImageUploader.tsx
│   │   │   ├── LocationPicker.tsx
│   │   │   └── VoiceRecorder.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── AuthorityHeader.tsx
│   │   │   ├── AuthoritySidebar.tsx
│   │   │   └── Navbar.tsx
│   │   │
│   │   └── ui/
│   │       ├── CategoryBadge.tsx
│   │       ├── EmptyState.tsx
│   │       ├── ErrorState.tsx
│   │       ├── LoadingSkeleton.tsx
│   │       ├── Logo.tsx
│   │       ├── PriorityBadge.tsx
│   │       ├── SeverityBadge.tsx
│   │       └── StatusBadge.tsx
│   │
│   ├── db/
│   │   ├── index.ts
│   │   └── schema.ts
│   │
│   └── lib/
│       ├── ai-engine.ts
│       ├── auth.ts
│       ├── auth-context.tsx
│       ├── api/
│       │   └── client.ts
│       ├── constants/
│       │   └── index.ts
│       └── types/
│           └── index.ts
│
├── docs/
│   ├── 01_MASTER_ARCHITECTURE.md
│   ├── 02_PRD.md
│   ├── 05_FRONTEND_PRD.md
│   ├── 07_API_CONTRACT.md
│   ├── 08_DATABASE_SCHEMA.md
│   ├── 09_AI_PIPELINE.md
│   ├── 12_DUPLICATE_DETECTION.md
│   ├── 13_PRIORITY_ENGINE.md
│   ├── 15_TEAM_IMPLEMENTATION_GUIDE.md
│   ├── 16_TESTING_AND_VALIDATION.md
│   └── 17_DEPLOYMENT.md
│
├── drizzle.config.ts
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
├── eslint.config.mjs
└── README.md
```

---

# Getting Started

## Prerequisites

Before running the project, install:

* Node.js
* npm
* Git
* PostgreSQL
* Required AI/ML service credentials where applicable

The project dependencies are listed in `package.json`.

---

## 1. Clone the Repository

```bash
git clone <your-repository-url>
cd AI-CivicEye
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Environment Variables

Create:

```text
.env.local
```

Example:

```env
DATABASE_URL=your_postgresql_connection_string
NEXT_PUBLIC_APP_NAME=AI CivicEye
```

Any secret API keys used by AI, speech-to-text, machine-learning, storage, or other server-side services must remain server-side and must **not** be exposed through `NEXT_PUBLIC_` variables.

Never commit real credentials to GitHub.

If sharing the project, provide a safe `.env.example` instead.

---

## 4. Initialize the Database

```bash
npx drizzle-kit push
```

---

## 5. Run the Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# Testing and Validation

Run the following checks before submitting changes.

## Lint

```bash
npm run lint
```

## Type Check

```bash
npm run typecheck
```

## Production Build

```bash
npm run build
```

## Production Start

```bash
npm run start
```

Validation covers frontend behavior, API integration, complaint workflows, authority workflows, database integration, AI integration, and production build readiness.

---

# Functional Testing Checklist

## Citizen

* [ ] Registration
* [ ] Login
* [ ] Landing page
* [ ] Citizen dashboard
* [ ] Text complaint
* [ ] Image upload
* [ ] Voice recording
* [ ] Transcript preview
* [ ] Location capture
* [ ] Manual address input
* [ ] AI analysis preview
* [ ] AI failure fallback
* [ ] Complaint submission
* [ ] Complaint ID generation
* [ ] Complaint tracking
* [ ] Complaint details
* [ ] Status timeline
* [ ] Complaint history

## Authority

* [ ] Authority login
* [ ] Dashboard KPIs
* [ ] Complaint management
* [ ] Priority queue
* [ ] Filtering
* [ ] Complaint details
* [ ] AI assessment
* [ ] Status updates
* [ ] Resolution notes
* [ ] Duplicate clusters
* [ ] Geographic map
* [ ] Department queues
* [ ] Analytics

## Resilience

* [ ] Loading states
* [ ] Empty states
* [ ] API errors
* [ ] Retry states
* [ ] AI unavailable fallback
* [ ] Invalid routes
* [ ] Responsive layouts
* [ ] Accessibility checks

## Final Integration

Before final release, verify:

* [ ] Frontend ↔ backend communication
* [ ] Backend ↔ database integration
* [ ] Backend ↔ AI integration
* [ ] Authentication and authorization
* [ ] Complaint creation and retrieval
* [ ] Status updates
* [ ] Error handling
* [ ] Responsive layouts
* [ ] Production build
* [ ] Production configuration

---

# API Surface

The current application includes API routes for:

```text
/api/auth/login
/api/auth/register
/api/auth/logout
/api/auth/me

/api/complaints
/api/complaints/[id]
/api/complaints/[id]/status
/api/complaints/analyze
/api/complaints/image
/api/complaints/voice
/api/complaints/priority
/api/complaints/duplicates

/api/dashboard/overview
/api/departments
/api/health
```

These routes support the application's authentication, complaint lifecycle, AI analysis, prioritization, duplicate inspection, dashboard, department, and health-check workflows.

---

# Security and Privacy Principles

AI CivicEye follows several important security principles:

* Server-side secrets remain server-side.
* Database access is not exposed to the browser.
* Authentication is handled through the application layer.
* Role-based access is used for citizen and authority workflows.
* Backend validation remains authoritative.
* Client-side validation is used for UX, not security.
* AI failures do not silently fabricate results.
* Production dashboards should use persisted application data rather than fabricated complaints or statistics.

---

# Current Limitations

AI CivicEye is an evolving project and should be understood within the scope of its current implementation.

Current limitations include:

* AI predictions should be treated as decision-support outputs, not autonomous municipal decisions.
* Model accuracy and reliability depend on the underlying AI/ML services and available data.
* Geographic visualizations depend on valid complaint location data.
* Voice functionality depends on browser microphone permissions and the configured speech-processing service.
* External AI, speech, storage, or ML services may require additional production configuration.
* Operational deployment requires production database and environment configuration.
* Real-world municipal deployment would require additional governance, security review, scalability testing, and validation.

---

# Future Scope

Potential future extensions include:

* multilingual complaint submission
* improved regional-language speech recognition
* stronger multimodal AI models
* more advanced duplicate clustering
* predictive civic issue prioritization
* SLA-aware routing
* historical hotspot forecasting
* mobile application support
* offline/low-connectivity complaint submission
* deeper municipal workflow integrations
* enhanced fairness and bias monitoring
* production-scale observability and audit systems

---

# Project Documentation

Detailed technical documentation is available in:

| Document                          | Purpose                       |
| --------------------------------- | ----------------------------- |
| `01_MASTER_ARCHITECTURE.md`       | System architecture           |
| `02_PRD.md`                       | Product requirements          |
| `05_FRONTEND_PRD.md`              | Frontend and UX specification |
| `07_API_CONTRACT.md`              | API contracts                 |
| `08_DATABASE_SCHEMA.md`           | Database design               |
| `09_AI_PIPELINE.md`               | AI processing pipeline        |
| `12_DUPLICATE_DETECTION.md`       | Duplicate detection           |
| `13_PRIORITY_ENGINE.md`           | Priority scoring              |
| `15_TEAM_IMPLEMENTATION_GUIDE.md` | Team integration              |
| `16_TESTING_AND_VALIDATION.md`    | Testing strategy              |
| `17_DEPLOYMENT.md`                | Deployment configuration      |

---

# Project Contribution

## Frontend + User Experience

**Kashish Kamaal**

Responsibilities include:

* Citizen interface
* Authority dashboard
* Responsive UX
* Complaint submission workflow
* Text/image/voice/location interfaces
* AI analysis presentation
* Complaint tracking
* Authority complaint management UI
* Priority and analytics interfaces
* Frontend ↔ backend integration
* UI validation and testing
* Responsive and accessibility testing

The frontend work covers the citizen and authority experiences, including the multimodal reporting flow, AI preview, complaint tracking, priority queue, duplicate inspection, map, department queues, and analytics.

---

# Shared Testing and Deployment

Testing and deployment are shared responsibilities across the frontend and backend teams.

## Backend Responsibilities

* API testing
* Database testing
* Authentication testing
* API validation
* ML API integration testing
* Backend error handling
* PostgreSQL deployment
* Environment variables
* API configuration
* Production database configuration

## Frontend Responsibilities

* UI testing
* Form validation
* Image upload testing
* API response handling
* Responsive UI testing
* Citizen workflow testing
* Authority dashboard testing
* Frontend deployment
* API URL/environment configuration
* Production UI testing

## Joint Responsibilities

Both members contribute to:

* End-to-end testing
* Frontend ↔ Backend testing
* Backend ↔ ML testing
* Database integration testing
* Complete complaint workflow testing
* Final integration
* Production testing
* Deployment issue resolution

The shared documentation includes:

```text
16_TESTING_AND_VALIDATION.md
17_DEPLOYMENT.md
```

---

# Project Status

**Status: Active Development / Integration**

## Current Work

* [x] Core AI CivicEye architecture
* [x] Citizen-facing interface foundation
* [x] Authority interface foundation
* [x] Authentication flow foundation
* [x] Complaint API layer
* [x] AI analysis integration layer
* [x] Image upload workflow
* [x] Voice complaint workflow
* [x] Location capture workflow
* [x] AI analysis presentation
* [x] Complaint status workflow
* [x] Authority dashboard components
* [x] Priority workflow components
* [x] Duplicate detection interface
* [x] Civic issue map
* [x] Department workflow
* [x] Analytics components
* [x] Database integration layer
* [x] Project documentation structure

## Final Integration and Deployment

* [ ] Complete frontend ↔ backend integration
* [ ] Complete citizen end-to-end workflow
* [ ] Complete authority end-to-end workflow
* [ ] Verify API response handling
* [ ] Verify authentication and role access
* [ ] Verify image upload
* [ ] Verify voice workflow
* [ ] Verify location workflow
* [ ] Verify AI failure fallback
* [ ] Complete testing and validation
* [ ] Complete deployment configuration
* [ ] Perform final production testing
* [ ] Final GitHub security check
* [ ] Verify no secrets or API keys are committed

---

# Contributing

Contributions should follow the existing project architecture.

Before opening a pull request, run:

```bash
npm run lint
npm run typecheck
npm run build
```

Please avoid:

* introducing duplicate components
* bypassing the API layer
* exposing server-side secrets
* adding fake production data
* changing database structures without coordinating with the backend team
* introducing undocumented API behavior

All major architectural, database, API, and AI-related changes should be coordinated with the relevant team members before implementation.

---

# License

This project is currently developed as an academic / prototype project.

Add an explicit open-source license here if the repository is later released under one.

---

# Acknowledgement

AI CivicEye aims to make civic grievance reporting more accessible for citizens and make municipal issue triage more structured, transparent, and data-informed.

> **Report better. Prioritize smarter. Resolve faster.**
