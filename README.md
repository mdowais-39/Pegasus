<p align="center">
  <img src="docs/assets/finintel-banner.png" alt="FinIntel — Turning Financial Evidence into Intelligence" width="100%" />
</p>

<p align="center">
  <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/Rust-2021-DEA584?style=flat-square&logo=rust&logoColor=white" alt="Rust 2021" /></a>
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python 3.11" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" /></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-ML_Services-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" /></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL 16" /></a>
  <a href="https://neo4j.com/"><img src="https://img.shields.io/badge/Neo4j-5-008CC1?style=flat-square&logo=neo4j&logoColor=white" alt="Neo4j 5" /></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker Compose" /></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 6" /></a>
</p>

<h1 align="center">FinIntel</h1>

<p align="center"><strong>Turning Financial Evidence into Intelligence</strong></p>

<p align="center">
  An enterprise-grade financial crime investigation platform that ingests multi-format evidence,<br />
  runs specialized ML analysis pipelines, and surfaces actionable intelligence through graph analytics and investigator workflows.
</p>

<p align="center">
  <a href="#installation--setup"><strong>Quick Start</strong></a> ·
  <a href="#architecture"><strong>Architecture</strong></a> ·
  <a href="#platform-workflow"><strong>Workflow</strong></a> ·
  <a href="#usage-guide"><strong>Usage</strong></a> ·
  <a href="#contributing"><strong>Contributing</strong></a>
</p>

---

## Project Overview

FinIntel is a monorepo platform designed for financial crime investigators, compliance teams, and forensic analysts. It combines a high-throughput **Rust orchestration layer**, a fleet of **Python ML microservices**, a **React investigation workspace**, and dual persistence in **PostgreSQL** (transactional evidence store) and **Neo4j** (relationship graph).

The platform targets end-to-end workflows: upload bank statements, registry extracts, and scanned documents; normalize and validate transaction data; resolve entities; detect anomalies, temporal patterns, and graph-based risk; explain findings; and export court-ready investigation reports.

> **Current development stage:** Core infrastructure, service registry, database schema, and the investigator frontend workspace are in place. ML service endpoints are scaffolded with shared contracts; ingestion pipeline integration (Phase 1) is actively under development.

---

## Problem Statement

Financial crime investigations generate fragmented evidence across incompatible formats — CSV exports, PDF statements, scanned images, corporate registry filings, and blockchain traces. Analysts manually reconcile accounts, trace fund flows, identify round-tripping loops, and document findings under time pressure with limited tooling.

| Challenge | Impact |
|-----------|--------|
| Heterogeneous evidence formats | Slow ingestion, transcription errors, inconsistent schemas |
| High-volume transaction data | Manual pattern detection does not scale |
| Cross-jurisdictional entity networks | Relationship mapping requires graph-native analysis |
| Audit and regulatory requirements | Findings must be traceable, explainable, and exportable |
| Siloed analysis tools | Context switching between OCR, spreadsheets, and graph tools |

FinIntel addresses these gaps with a unified pipeline: structured ingestion, ML-assisted detection, graph analytics, and an investigator-centric workspace with AI-assisted query support.

---

## Key Features

### Evidence Ingestion & Processing

| Feature | Description |
|---------|-------------|
| Multi-format upload | PDF, CSV, Excel, and scanned image bank statements |
| OCR extraction | PaddleOCR-based text and table extraction from scanned documents |
| Schema standardization | Normalization of dates, amounts, narrations, and transaction types |
| Data validation | Row-level validation with forensic audit statistics |
| Async job pipeline | Queued processing with status polling (`queued` → `processing` → `complete` / `failed`) |

### Detection & Intelligence

| Feature | Description |
|---------|-------------|
| Entity resolution | NLP-driven extraction and linking of accounts, UPI IDs, phones, and corporate entities |
| Anomaly detection | Statistical and rule-based scoring for suspicious transaction patterns |
| Temporal analysis | Time-series pattern detection for structuring, velocity, and burst activity |
| Graph ML | GNN-based network scoring over account and entity relationship graphs |
| Explainability | SHAP and narrative generation for flagged findings |
| Round-trip detection | Circular capital flow identification across jurisdictions |
| Money flow visualization | Interactive network graph of senders, receivers, and transit nodes |
| FIFO money trails | Source-to-dispersion tracing with ratio and timing analysis |

### Investigator Workspace

| Module | Purpose |
|--------|---------|
| **Overview** | Evidence management, drag-and-drop upload, live pipeline orchestration diagram |
| **Round Trips** | Circular loop directory with flow paths and flagging rationale |
| **Money Flow** | Entity network visualization with role-based node inspection |
| **Money Trails** | FIFO asset tracing from inflow to dispersion accounts |
| **Reports** | Forensic brief compilation with PDF and Excel export |
| **Settings** | Investigator profile, agency code, and model configuration |
| **AI Copilot** | Gemini-powered conversational intelligence over case context |

### Platform Operations

| Feature | Description |
|---------|-------------|
| Service health registry | Aggregated health checks across all ML microservices via Rust backend |
| SQLx migrations | Version-controlled PostgreSQL schema evolution |
| Neo4j constraints | Unique constraints on accounts, entities, UPI handles, and phone numbers |
| Docker Compose infrastructure | One-command PostgreSQL and Neo4j deployment |

---

## Architecture

FinIntel follows a **microservices architecture** with a Rust API gateway orchestrating Python ML workers, backed by relational and graph databases, and served through a full-stack React application.

```mermaid
flowchart TB
    subgraph Client["Investigator Client"]
        UI["React 19 SPA<br/>Vite + Tailwind CSS"]
        Copilot["AI Copilot<br/>Express + Gemini API"]
    end

    subgraph Gateway["Orchestration Layer"]
        API["Rust Backend<br/>Axum · Port 8080"]
        Registry["Service Registry<br/>Health + Routing"]
    end

    subgraph ML["ML Microservices · FastAPI"]
        OCR["OCR :8001<br/>PaddleOCR · PDF/Image"]
        STD["Standardize :8002<br/>Schema Normalization"]
        ENT["Entity :8003<br/>NLP · Resolution"]
        ANO["Anomaly :8004<br/>Pattern Scoring"]
        TMP["Temporal :8005<br/>Time-Series Analysis"]
        GML["Graph-ML :8006<br/>GNN Scoring"]
        EXP["Explainer :8007<br/>SHAP · Narratives"]
    end

    subgraph Data["Persistence Layer"]
        PG[("PostgreSQL 16<br/>Statements · Transactions<br/>Entities · Risk Profiles")]
        NEO[("Neo4j 5<br/>Account · Entity Graph<br/>UPI · Phone Nodes")]
        FS["Local Storage<br/>Uploaded Evidence Files"]
    end

    UI --> API
    UI --> Copilot
    API --> Registry
    Registry --> OCR & STD & ENT & ANO & TMP & GML & EXP
    API --> PG
    API --> FS
    ENT --> NEO
    GML --> NEO
    OCR --> STD
    STD --> ENT
    ENT --> ANO & TMP & GML
    ANO & TMP & GML --> EXP
    EXP --> PG
```

### Data Model

PostgreSQL stores the evidentiary record layer:

| Table | Role |
|-------|------|
| `statements` | Uploaded file metadata, bank name, processing status, file path |
| `transactions` | Normalized ledger rows with sender/receiver accounts, amounts, narrations, raw JSON |
| `entities` | Resolved parties — accounts, corporations, UPI IDs, phones |
| `risk_profiles` | Composite risk scores (rule, statistical, temporal, graph, GNN) with pattern metadata |

Neo4j stores the relationship graph with uniqueness constraints on `Account`, `Entity`, `UpiId`, and `Phone` nodes.

---

## Technology Stack

### Backend & Orchestration

| Component | Technology | Role |
|-----------|------------|------|
| API Gateway | Rust 2021, Axum 0.8, Tokio | HTTP routing, service orchestration, PostgreSQL pool |
| HTTP Client | Reqwest | ML service health checks and inter-service calls |
| Database ORM | SQLx 0.8 | Async PostgreSQL queries and migrations |
| Serialization | Serde, Serde JSON | Request/response contracts |
| Observability | Tracing, Tracing Subscriber | Structured logging |

### ML & Analytics Services

| Component | Technology | Role |
|-----------|------------|------|
| Service Framework | FastAPI, Uvicorn | REST microservice endpoints |
| Deep Learning | PyTorch (CUDA 12.1) | Model inference and training |
| NLP | spaCy, Sentence Transformers, Transformers, Accelerate | Entity extraction and embeddings |
| OCR | PaddleOCR, OpenCV | Scanned document text extraction |
| Document Parsing | pdfplumber, Camelot, pypdf, openpyxl, xlrd | PDF, CSV, Excel ingestion |
| Anomaly & ML | scikit-learn, NumPy, Pandas, SciPy | Statistical detection |
| Explainability | SHAP | Feature attribution for flagged transactions |
| RAG | LangChain, LangChain Community, FAISS | Context retrieval for narrative generation |
| Graph Driver | neo4j Python driver | Neo4j read/write operations |

### Frontend

| Component | Technology | Role |
|-----------|------------|------|
| UI Framework | React 19, TypeScript 5.8 | Component-based investigator workspace |
| Build Tool | Vite 6 | Dev server and production bundling |
| Styling | Tailwind CSS 4, Framer Motion | Layout, animation, design system |
| Components | Radix UI, Lucide React, CVA, clsx | Accessible UI primitives and icons |
| Routing | React Router DOM 7 | Public landing, auth, and workspace routes |
| Server | Express 4, tsx | Full-stack dev server, Gemini Copilot API proxy |

### Infrastructure & Data

| Component | Technology | Role |
|-----------|------------|------|
| Relational DB | PostgreSQL 16 | Transactional evidence and risk profiles |
| Graph DB | Neo4j 5 | Entity relationship network |
| Containerization | Docker Compose | Local PostgreSQL and Neo4j deployment |
| Environment | Conda (`finintel`), environment.yml | Reproducible Python ML environment |
| AI Provider | Google Gemini (`@google/genai`) | Investigator Copilot conversational layer |

---

## Platform Workflow

### End-to-End Investigation Pipeline

```mermaid
sequenceDiagram
    participant Inv as Investigator
    participant FE as Frontend
    participant BE as Rust Backend
    participant OCR as OCR Service
    participant STD as Standardize
    participant ENT as Entity
    participant ML as Anomaly · Temporal · Graph-ML
    participant EXP as Explainer
    participant PG as PostgreSQL
    participant NEO as Neo4j

    Inv->>FE: Upload evidence (PDF/CSV/Image)
    FE->>BE: POST statement + file
    BE->>BE: Validate file, store to disk
    BE->>PG: Insert statement record, create job
    BE-->>FE: Return job_id

    loop Status polling
        FE->>BE: GET job status
        BE-->>FE: queued | processing | complete | failed
    end

    BE->>OCR: POST /extract
    OCR-->>BE: raw_rows
    BE->>STD: POST /standardize
    STD-->>BE: standardized transactions
    BE->>PG: Insert transactions
    BE->>ENT: POST /entities
    ENT->>NEO: Upsert graph nodes/edges
    ENT-->>BE: resolved entities
    BE->>ML: Parallel scoring requests
    ML-->>BE: scores + patterns
    BE->>EXP: POST /explain
    EXP-->>BE: narrative + attributions
    BE->>PG: Update risk_profiles

    Inv->>FE: Review Round Trips, Money Flow, Trails
    Inv->>FE: Export PDF/Excel report
```

### Investigator Workspace Flow

1. **Authenticate** — Sign in to the investigation workspace.
2. **Upload evidence** — Drag-and-drop bank statements, registry PDFs, or CSV exports on the Overview page.
3. **Run pipeline** — Initiate the diagnostics pipeline; monitor node-level progress (OCR → cleaning → validation → analysis routing).
4. **Analyze findings** — Navigate to Round Trips, Money Flow, and Money Trails modules for pattern inspection.
5. **Query with Copilot** — Ask natural-language questions about entities, flows, and risk indicators.
6. **Export report** — Generate PDF forensic briefs or Excel transaction extracts from the Reports module.

---

## Screenshots

> Screenshots will be added as the platform reaches stable UI milestones. Placeholder paths below.

| View | Description |
|------|-------------|
| `docs/screenshots/landing-page.png` | Public landing page with interactive evidence simulation |
| `docs/screenshots/workspace-overview.png` | Evidence upload and pipeline orchestration diagram |
| `docs/screenshots/round-trips.png` | Circular capital flow detection and cycle directory |
| `docs/screenshots/money-flow.png` | Interactive entity network graph |
| `docs/screenshots/money-trails.png` | FIFO source-to-dispersion asset tracing |
| `docs/screenshots/reports.png` | Investigation report compilation and export |
| `docs/screenshots/copilot.png` | AI Copilot conversational intelligence panel |

---

## Installation & Setup

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Rust | 1.70+ | Install via [rustup](https://rustup.rs/) |
| Python | 3.11 | Conda recommended |
| Node.js | 20+ | For frontend development |
| Docker | Latest | PostgreSQL and Neo4j containers |
| NVIDIA GPU | Optional | CUDA 12.1 for PyTorch ML workloads |

### 1. Clone the Repository

```bash
git clone https://github.com/<org>/AI-Powered-Financial-Crime-Investigation-Platform.git
cd AI-Powered-Financial-Crime-Investigation-Platform
```

### 2. Environment Configuration

Create a `.env` file at the repository root:

```env
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=finintel
POSTGRES_PORT=5432
DATABASE_URL=postgres://postgres:postgres@localhost:5432/finintel

# Neo4j
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
NEO4J_HTTP_PORT=7474
NEO4J_BOLT_PORT=7687
```

For the frontend Copilot, copy and configure:

```bash
cp frontend/.env.example frontend/.env
```

```env
GEMINI_API_KEY=your_gemini_api_key
APP_URL=http://localhost:3000
```

### 3. Start Infrastructure

```bash
docker compose up -d
```

Verify containers:

```bash
docker ps
# finintel-postgres  → localhost:5432
# finintel-neo4j     → localhost:7474 (Browser), localhost:7687 (Bolt)
```

Initialize PostgreSQL schema:

```bash
psql -h localhost -U postgres -d finintel -f scripts/init_postgres.sql
```

Apply Neo4j constraints via Neo4j Browser (`http://localhost:7474`) using `graph-db/constraints.cypher`.

### 4. Python ML Environment

```bash
conda create -n finintel python=3.11 -y
conda activate finintel
conda env update -f environment.yml
```

Install CUDA-enabled PyTorch (optional, for GPU inference):

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
python -m spacy download en_core_web_sm
```

### 5. Start ML Microservices

Each service runs independently on its assigned port:

| Service | Port | Start Command |
|---------|------|---------------|
| OCR | 8001 | `uvicorn main:app --reload --port 8001` |
| Standardize | 8002 | `uvicorn main:app --reload --port 8002` |
| Entity | 8003 | `uvicorn main:app --reload --port 8003` |
| Anomaly | 8004 | `uvicorn main:app --reload --port 8004` |
| Temporal | 8005 | `uvicorn main:app --reload --port 8005` |
| Graph-ML | 8006 | `uvicorn main:app --reload --port 8006` |
| Explainer | 8007 | `uvicorn main:app --reload --port 8007` |

Run from each respective directory under `ml-services/`.

### 6. Start Rust Backend

```bash
cd backend
cargo run
```

Backend listens on `http://localhost:8080`.

Run SQLx migrations when configured:

```bash
cd backend
sqlx migrate run
```

### 7. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend and Copilot API available at `http://localhost:3000`.

### 8. Verify Platform Health

```bash
# Backend health
curl http://localhost:8080/health

# Aggregated ML service health
curl http://localhost:8080/services/health
```

Expected response when all services are running:

```json
{
  "system_status": "healthy",
  "backend": { "service": "finintel-backend", "status": "healthy" },
  "services": {
    "ocr": { "service": "ocr", "status": "healthy" },
    "standardize": { "service": "standardize", "status": "healthy" },
    "entity": { "service": "entity", "status": "healthy" },
    "anomaly": { "service": "anomaly", "status": "healthy" },
    "temporal": { "service": "temporal", "status": "healthy" },
    "graph_ml": { "service": "graph_ml", "status": "healthy" },
    "explainer": { "service": "explainer", "status": "healthy" }
  }
}
```

---

## Usage Guide

### Accessing the Platform

| URL | Description |
|-----|-------------|
| `http://localhost:3000/` | Public landing page |
| `http://localhost:3000/login` | Investigator authentication |
| `http://localhost:3000/workspace` | Investigation workspace (Overview) |
| `http://localhost:7474` | Neo4j Browser |
| `http://localhost:8080/services/health` | Platform service health dashboard |

### ML Service API Endpoints

| Service | Method | Endpoint | Purpose |
|---------|--------|----------|---------|
| OCR | `POST` | `/extract` | Extract raw rows from uploaded documents |
| Standardize | `POST` | `/standardize` | Normalize extracted rows to transaction schema |
| Entity | `POST` | `/entities` | Resolve and link financial entities |
| Anomaly | `POST` | `/anomaly` | Score transactions for anomalous patterns |
| Temporal | `POST` | `/temporal` | Compute temporal risk scores |
| Graph-ML | `POST` | `/graph-ml` | Generate GNN embeddings and graph scores |
| Explainer | `POST` | `/explain` | Produce human-readable finding narratives |

Shared Pydantic contracts are defined in `ml-services/shared/models.py`.

### AI Copilot

The frontend Express server exposes `POST /api/chat` for investigator queries. When `GEMINI_API_KEY` is configured, requests are routed to Google Gemini with case-specific forensic context. Without a key, deterministic fallback responses are served to preserve workspace functionality.

### Sample Dataset

IBM Anti-Money Laundering reference data is included under `datasets/ibm-aml/`:

```
datasets/ibm-aml/
├── HI-Small_Trans.csv
├── HI-Small_accounts.csv
├── HI-Small_Patterns.txt
├── LI-Small_Trans.csv
├── LI-Small_accounts.csv
└── LI-Small_Patterns.txt
```

Scanned bank statement samples are available under `datasets/bank-statements/scanned/`.

---

## Project Structure

```
AI-Powered-Financial-Crime-Investigation-Platform/
│
├── backend/                          # Rust orchestration API (Axum)
│   ├── Cargo.toml
│   ├── migrations/                   # SQLx PostgreSQL migrations
│   │   ├── 20260611063225_initial_schema.sql
│   │   └── 20260611065820_add_transaction_metadata.sql
│   └── src/
│       ├── main.rs                   # Entry point, router, DB pool
│       ├── config/
│       │   ├── mod.rs
│       │   └── services.rs           # ML service registry (ports 8001–8007)
│       ├── routes/
│       │   ├── mod.rs
│       │   └── health_routes.rs      # /health, /services/health, /test-ocr
│       ├── handlers/
│       │   ├── mod.rs
│       │   └── health_handler.rs
│       ├── services/
│       │   ├── mod.rs
│       │   └── service_checker.rs    # Parallel ML health aggregation
│       ├── models/
│       │   ├── mod.rs
│       │   └── health.rs
│       ├── state/
│       │   ├── mod.rs
│       │   └── app_state.rs          # Shared PgPool + HTTP client
│       └── repositories/             # Data access layer (planned)
│
├── ml-services/                      # Python FastAPI microservices
│   ├── shared/
│   │   ├── models.py                 # Pydantic inter-service contracts
│   │   └── base_service.py           # Shared service template
│   ├── ocr/                          # Port 8001 — document extraction
│   ├── standardize/                  # Port 8002 — schema normalization
│   ├── entity/                       # Port 8003 — entity resolution
│   ├── anomaly/                      # Port 8004 — anomaly detection
│   ├── temporal/                     # Port 8005 — temporal analysis
│   ├── graph-ml/                     # Port 8006 — graph neural network scoring
│   └── explainer/                    # Port 8007 — explainability narratives
│
├── frontend/                         # React investigation workspace
│   ├── server.ts                     # Express server + Gemini Copilot API
│   ├── src/
│   │   ├── App.tsx                   # Route definitions
│   │   ├── components/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── WorkspaceLayout.tsx
│   │   │   ├── OverviewPage.tsx      # Evidence upload + pipeline UI
│   │   │   ├── RoundTripsPage.tsx
│   │   │   ├── MoneyFlowPage.tsx
│   │   │   ├── MoneyTrailPage.tsx
│   │   │   ├── ReportsPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── data/
│   │   │   └── mockData.ts           # Demo case and transaction fixtures
│   │   └── types.ts
│   └── components/ui/                # Landing page + design system
│       ├── hero-section-1.tsx
│       ├── animated-group.tsx
│       └── button.tsx
│
├── graph-db/
│   └── constraints.cypher              # Neo4j uniqueness constraints
│
├── scripts/
│   └── init_postgres.sql             # PostgreSQL bootstrap schema
│
├── datasets/
│   ├── ibm-aml/                      # IBM AML reference dataset
│   └── bank-statements/scanned/      # Sample scanned statements
│
├── docs/
│   └── assets/
│       └── finintel-banner.png       # Repository header image
│
├── docker-compose.yml                # PostgreSQL 16 + Neo4j 5
├── environment.yml                   # Conda environment lockfile
├── documentation.md                  # Internal development log
└── README.md
```

---

## Contributing

Contributions are welcome. FinIntel is under active development across infrastructure, ingestion, ML model integration, and frontend-backend wiring.

### Development Guidelines

1. **Fork and branch** — Create a feature branch from `main`.
2. **Match conventions** — Follow existing patterns in Rust modules, FastAPI service structure, and React component layout.
3. **Run health checks** — Ensure `http://localhost:8080/services/health` reports all services healthy before submitting.
4. **Database changes** — Add SQLx migrations under `backend/migrations/`; update `scripts/init_postgres.sql` for fresh installs.
5. **Shared contracts** — Update `ml-services/shared/models.py` when modifying inter-service payloads.
6. **No secrets in commits** — Never commit `.env` files, API keys, or credentials.

### Reporting Issues

When filing an issue, include:

- Steps to reproduce
- Expected vs. actual behavior
- Service health output from `/services/health`
- Relevant logs from backend, ML service, or frontend server

### Pull Request Process

1. Open a PR with a clear description of the change and motivation.
2. Reference related issues where applicable.
3. Confirm local verification steps in the PR description.
4. Request review from a maintainer.

---

## License

This repository does not currently include a `LICENSE` file. All rights are reserved by the project maintainers until a license is explicitly added. Contact the maintainers for licensing inquiries prior to redistribution or commercial use.

---

<p align="center">
  <sub>FinIntel — Turning Financial Evidence into Intelligence</sub>
</p>
