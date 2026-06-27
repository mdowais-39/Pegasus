# FinIntel AI — Backend 2.0 Technical Audit Report

---

## 1. ARCHITECTURE UNDERSTANDING

### System Overview

FinIntel AI is an AI-Powered Financial Crime Investigation Operating System. The architecture follows a microservices pattern with Rust (Axum) as the API gateway/orchestrator and Python FastAPI services handling ML/NLP/OCR workloads.

### Service Map

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Frontend)                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────────────┐
│                   RUST BACKEND (Axum :8080)                     │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────────────────┐   │
│  │ Upload API  │ │ Status API   │ │ Health/Service Check   │   │
│  └──────┬──────┘ └──────────────┘ └────────────────────────┘   │
│         │ mpsc channel                                          │
│  ┌──────▼──────────────────────────────────────────────────┐   │
│  │              Background Worker (worker.rs)               │   │
│  │  Pipeline: OCR→Standardize→Validate→Save→Entity→Graph   │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (localhost)
    ┌──────────────────────┼──────────────────────────┐
    │                      │                          │
┌───▼────┐  ┌──────────┐  ┌▼─────────┐  ┌───────────▼──────────┐
│ OCR    │  │Standards │  │ Entity   │  │     Graph            │
│ :8001  │  │  :8002   │  │  :8003   │  │     :8005            │
│PaddleOCR│  │DateNorm  │  │spaCy NER │  │Neo4j Cypher Queries  │
│pdfplumb│  │AmountNorm│  │SentTrans │  │Round Trip/Money Flow │
│pdf2img │  │NarrParse │  │Embeddings│  │Accumulation/Invest.  │
└────────┘  └──────────┘  └──────────┘  └───────────┬──────────┘
                                                     │
    ┌──────────────────────┐  ┌──────────────────────▼──────────┐
    │ Validation :8004     │  │         Neo4j :7687             │
    │ Duplicate/Fail/Bal   │  │  Account nodes, TRANSFERRED_TO  │
    └──────────────────────┘  │  Transaction nodes, INVOLVES    │
                              │  Entity nodes                   │
    ┌──────────────────────┐  └─────────────────────────────────┘
    │ Anomaly :8004 (PORT  │
    │ CONFLICT w/ Valid)    │  ┌─────────────────────────────────┐
    │ IsolationForest       │  │      PostgreSQL :5432           │
    │ Feature Builder       │  │  statements, transactions,      │
    └──────────────────────┘  │  entities, risk_profiles        │
                              └─────────────────────────────────┘
    ┌──────────────────────┐
    │ Temporal :8005 (PORT │
    │ CONFLICT w/ Graph)   │
    │ Burst/Velocity/Struct│
    └──────────────────────┘

    ┌──────────────────────┐
    │ Trail :unassigned    │
    │ FIFO Money Tracker   │
    └──────────────────────┘

    ┌──────────────────────┐
    │ Explainer :8007      │
    │ STUB only            │
    └──────────────────────┘
```

### Database Schema

**PostgreSQL (`finintel` database):**
- `statements` — upload records with 7 metadata columns (account, holder, IFSC, balances, dates)
- `transactions` — 21 columns including validation flags, raw_row JSONB
- `entities` — deduped entities with JSONB metadata
- `risk_profiles` — designed for multi-layer scoring (rule/stat/temporal/graph/gnn) — **UNUSED**

**Neo4j:**
- Account nodes with `id` property
- Transaction nodes with amount, date, type properties
- Entity nodes with type, identifier properties
- `TRANSFERRED_TO` relationships (aggregated: transaction_count, total_amount)
- `PERFORMED` relationships (Account→Transaction)
- `INVOLVES` relationships (Transaction→Entity)

### Data Flow (Designed vs Actual)

**Designed:**
```
Upload → OCR → Statement Profile → Standardize → Validate → Narration Intel
→ Entity Intel → Graph Intel → Statistical Engine → Temporal Engine
→ Risk Fusion → Investigation Report
```

**Actual (what worker.rs does):**
```
Upload → OCR → Standardize → Validate → Save Txns → Entity Extract
→ Save Entities → Build Account Graph → Build Transaction Graph
```

**Missing from actual pipeline:**
- Statement Profile (Phase 7A)
- Narration Intelligence
- Graph Intelligence analytics (round-trip, money flow, accumulation — exist as separate endpoints but NOT called by worker)
- Statistical anomaly detection (NOT called by worker)
- Temporal intelligence (NOT called by worker)
- Risk fusion (NOT implemented)
- Explainability (NOT implemented)
- Investigation report (NOT implemented)
- Money trail/FIFO (NOT called by worker)
- Status updates (worker never reports progress)

---

## 2. PHASE COMPLETION MATRIX

### Phase 0: Infrastructure & Monorepo Setup
| Requirement | Status | Notes |
|---|---|---|
| Monorepo created | ✅ | Clean structure |
| Rust backend boots | ✅ | Port 8080 |
| Python services boot | ✅ | 7 services on 8001-8007 |
| PostgreSQL container | ✅ | Docker, port 5432 |
| Neo4j container | ✅ | Docker, port 7687 |
| Docker Compose | ✅ | Postgres + Neo4j |
| Health checks | ✅ | `/services/health` aggregates all |
| Service-to-service | ✅ | Worker calls Python via HTTP |

**Technical Debt:** Hardcoded service URLs in worker (ignores `config/services.rs` registry). No CORS.

### Phase 1: Multi-Format Ingestion Pipeline
| Requirement | Status | Notes |
|---|---|---|
| Upload endpoint | ✅ | `POST /api/v1/statements/upload` |
| MIME validation | ✅ | 7 types allowed |
| Bank name support | ✅ | Optional `bank_name` field |
| File storage | ✅ | `storage/statements/{uuid}/` |
| PostgreSQL insert | ✅ | Statements table |
| Job queue | ✅ | mpsc channel |
| Status endpoint | ⚠️ | Always returns "queued" — never updates |
| Worker processing | ✅ | Full pipeline orchestration |

**Technical Debt:** `panic!()` on unsupported MIME crashes server. 10+ `expect()` calls crash server on errors. Job status never transitions. No file size limits.

### Phase 2: OCR & Intelligent Parsing Engine
| Requirement | Status | Notes |
|---|---|---|
| PDF parser | ✅ | pdfplumber |
| CSV parser | ✅ | pandas |
| Excel parser | ✅ | pandas |
| DOCX parser | ✅ | python-docx |
| Image OCR | ✅ | PaddleOCR |
| Scanned PDF | ✅ | pdf2image + PaddleOCR |
| Parser registry | ✅ | Extension-based dispatch |
| Row grouping | ✅ | Y-coordinate proximity |
| Table reconstruction | ✅ | Flatten grouped rows |
| Transaction merging | ✅ | Date-based merge |
| Statement understanding | ✅ | TableDetect → Reconstr → Build |

**Technical Debt:** `/full-pipeline` endpoint broken (undefined `standardizer`). CSV/Excel parsers return `list[dict]` but `StatementUnderstandingEngine` expects `list[str]` — type mismatch. Temp files not cleaned up. SSL monkey-patching duplicated.

### Phase 3: Transaction Standardization & Entity Intelligence
| Requirement | Status | Notes |
|---|---|---|
| Header mapping | ✅ | Alias dictionary |
| Row standardization | ✅ | Canonical transaction model |
| Date normalization | ✅ | dateutil.parser |
| Amount normalization | ✅ | Currency stripping |
| Transaction classification | ✅ | Keyword-based (UPI/IMPS/NEFT/etc.) |
| Entity extraction (regex) | ✅ | UPI, account, org, bank, merchant, person |
| spaCy NER | ✅ | PERSON, ORG entities |
| Entity resolution | ✅ | Embedding clustering (cosine 0.85) |
| Entity persistence | ✅ | PostgreSQL upsert |
| Validation service | ✅ | Duplicate/fail/balance check |

**Technical Debt:** `NarrationParser` never populates `platform`/`upi_id`. Bank/merchant dictionaries tiny (6/10 items). EntityResolver O(n²). Bare `except:` in date/amount normalizers.

### Phase 4: Neo4j Graph Construction
| Requirement | Status | Notes |
|---|---|---|
| Account graph | ✅ | Account→TRANSFERRED_TO→Account |
| Entity graph | ✅ | Account→PERFORMED→Transaction→INVOLVES→Entity |
| Transaction graph | ✅ | Variant of entity graph |
| Round trip detection | ✅ | Cycle detection (2-8 hops) |
| Money flow analysis | ✅ | Variable-length path traversal (1-5 hops) |
| Accumulation detection | ✅ | Top accounts by total received |
| Investigation API | ✅ | Inflow/outflow/top senders/receivers |
| Graph integration in worker | ✅ | Both build-graph and build-transaction-graph called |

**Technical Debt:** 6 separate Neo4j drivers instantiated. Hardcoded credentials. N+1 Cypher queries (no UNWIND batch). `EntityGraphBuilder` and `TransactionGraphBuilder` are near-duplicates.

### Phase 5: Graph Enrichment Layer
| Requirement | Status | Notes |
|---|---|---|
| Entity graph enrichment | ✅ | Transaction→Entity relationships |
| Statement metadata model | ⚠️ | DB columns exist, Rust model exists but dead code |
| Statement profile service | ❌ | Not implemented |
| Transaction→Graph pipeline | ✅ | Worker calls graph builder |

**Technical Debt:** `statement_metadata.rs` never declared in `models/mod.rs`. Metadata columns never populated.

### Phase 6: Statistical Anomaly & Temporal Intelligence
| Requirement | Status | Notes |
|---|---|---|
| Feature builder | ✅ | Per-account: mean/max/std/count/counterparties |
| Isolation Forest | ✅ | n_estimators=200, contamination=0.05 |
| Pattern detection | ✅ | High frequency, counterparty activity |
| Anomaly endpoints | ✅ | Latest/statement/account scoped |
| Burst detection | ✅ | Z-score on txn count |
| Velocity detection | ✅ | Z-score on daily amount |
| Structuring detection | ✅ | 45K-50K threshold pattern |
| Temporal endpoints | ✅ | Latest/statement/account scoped |
| Integration in worker | ❌ | Neither called by worker pipeline |

**Technical Debt:** `temporal_service.statement()` incomplete (returns None). Anomaly retrains model every request. PostgresLoader duplicated. Hardcoded credentials. Port conflicts (anomaly:8004=validation, temporal:8005=graph).

### Phase 7: Restructuring & Data Hardening
| Requirement | Status | Notes |
|---|---|---|
| Statement Profile | ❌ | Not implemented |
| Narration Intelligence | ❌ | Not implemented |
| Risk Fusion | ❌ | Not implemented |
| Investigation Report | ❌ | Not implemented |
| Data hardening | ❌ | Not started |

### Phase 8-9: Explainable AI & Dashboard
| Requirement | Status | Notes |
|---|---|---|
| Explainer service | ❌ | Stub only (`{"narrative": "placeholder"}`) |
| Dashboard APIs | ❌ | Not implemented |
| Copilot APIs | ❌ | Not implemented |
| Risk profiles table | ⚠️ | Created in DB but never used |

---

## 3. INTEGRATION GAP ANALYSIS

### What Works End-to-End

| Flow | Status | Evidence |
|---|---|---|
| Upload → File stored → Statement in DB | ✅ | `statement_handler.rs` |
| Upload → Worker → OCR → Raw rows | ✅ | `worker.rs` lines 48-84 |
| OCR rows → Standardizer → Canonical txns | ✅ | `worker.rs` lines 86-129 |
| Canonical txns → Validation → Validated txns | ✅ | `worker.rs` lines 135-177 |
| Validated txns → Save to PostgreSQL | ✅ | `worker.rs` lines 191-220 |
| Validated txns → Entity Extraction → Canonical entities | ✅ | `worker.rs` lines 226-293 |
| Entities → Save to PostgreSQL | ✅ | `worker.rs` lines 285-293 |
| Validated txns → Account Graph → Neo4j | ✅ | `worker.rs` lines 303-355 |
| Validated txns + entities → Transaction Graph → Neo4j | ✅ | `worker.rs` lines 357-415 |
| Neo4j → Round trip detection | ✅ | `GET /round-trips` (standalone) |
| Neo4j → Money flow analysis | ✅ | `GET /money-flow/{account}` (standalone) |
| Neo4j → Accumulation detection | ✅ | `GET /accumulation-accounts` (standalone) |
| Neo4j → Investigation summary | ✅ | `GET /investigation/account/{id}` (standalone) |
| PostgreSQL → Anomaly detection | ✅ | `GET /anomaly/latest` (standalone) |
| PostgreSQL → Temporal analysis | ✅ | `GET /temporal/latest` (standalone, partially broken) |
| Transactions → FIFO money trail | ✅ | `POST /trace` (standalone) |

### What Works Only Independently

| Component | Issue |
|---|---|
| Anomaly detection | Reads directly from Postgres, not called by worker |
| Temporal analysis | Reads directly from Postgres, not called by worker |
| Money trail | Requires pre-sorted transactions as input, not called by worker |
| Round trip detection | Reads from Neo4j, not triggered after graph build |
| Money flow analysis | Reads from Neo4j, not triggered after graph build |
| Accumulation detection | Reads from Neo4j, not triggered after graph build |
| Investigation summary | Reads from Neo4j, not triggered after graph build |

### What Needs Orchestration Work

1. **Worker pipeline incomplete** — stops after graph build. Missing: anomaly, temporal, trail, risk fusion, report.
2. **Job status never updates** — `update_statement_status()` exists but never called. Status stuck at "queued".
3. **No unified investigation endpoint** — each analysis engine is a separate HTTP call. Need a single `/investigate/{statement_id}` that runs all engines.
4. **No result aggregation** — graph, anomaly, temporal, trail results are all separate. Need risk fusion combining all signals.
5. **No frontend-facing APIs** — only internal pipeline. Dashboard needs: statement list, investigation view, risk scores, graph visualization data.

### What APIs Are Missing

| API | Purpose | Priority |
|---|---|---|
| `GET /api/v1/statements` | List all statements | HIGH |
| `GET /api/v1/statements/{id}` | Get statement details | HIGH |
| `POST /api/v1/investigate/{statement_id}` | Run full investigation | HIGH |
| `GET /api/v1/risk/{entity_id}` | Get risk profile | HIGH |
| `GET /api/v1/graph/{statement_id}` | Graph visualization data | MEDIUM |
| `GET /api/v1/dashboard/summary` | Dashboard overview | MEDIUM |
| `POST /api/v1/explain` | Explainability | LOW |
| `GET /api/v1/trail/{account}` | Money trail for account | MEDIUM |

### What Contracts Are Broken

1. **OCR → Standardize:** OCR returns `list[dict]` for CSV/Excel, standardize expects `list[dict]` with specific header names. No contract enforcement.
2. **Standardize → Validation:** Standardize outputs `StandardizedTransaction` dicts, validation expects dicts with `date`, `amount`, `reference_number` keys. Works but fragile.
3. **Validation → Entity:** Validation output includes `is_duplicate`, `is_failed` flags but entity service ignores them — processes all transactions including invalid ones.
4. **Entity → Rust deserialization:** Entity service returns `canonical_entities` as list of `{canonical, aliases, entity_type, confidence}`. Rust `CanonicalEntity` matches. Works.
5. **Worker → Status:** Worker never updates job status. Status API is dead.
6. **Anomaly/Temporal → Worker:** Not connected at all.

### What Should Be Refactored

1. **worker.rs** — 7 levels of nested `match`. Refactor to use `?` operator or helper functions.
2. **Hardcoded URLs** — Worker ignores `config/services.rs`. Use the registry.
3. **Shared PostgresLoader** — Duplicated between anomaly and temporal. Extract to `shared/`.
4. **Shared Neo4jClient** — 6 separate drivers. Use singleton.
5. **EntityGraphBuilder vs TransactionGraphBuilder** — Near-duplicate code. Merge.
6. **`panic!()` in handlers** — Replace with HTTP error responses.
7. **In-memory JobStatusStore** — Replace with PostgreSQL-backed status.
8. **Explainer stub** — Implement or remove.

---

## 4. REAL DATASET GENERALIZATION ANALYSIS

### Current OCR/Standardization Assumptions

The system was built with controlled examples. Key assumptions baked in:

1. **Header Detection:** Scans rows for keyword density (date/amount/balance words). Works for standard Indian bank statements but fails on:
   - Statements with merged cells
   - Statements with multi-line headers
   - Statements with footers/summaries mixed in

2. **Column Mapping:** `header_mapper.py` uses substring matching against ~20 known aliases. Risks:
   - False positives ("credit_score" matches "credit")
   - Missing columns not in alias dict
   - Different banks use different naming (e.g., "Txn Date" vs "Date" vs "Value Date" vs "Transaction Date")

3. **Date Parsing:** Uses `dateutil.parser.parse(fuzzy=True)` — very permissive but:
   - Can misparse "12345" as a date
   - Indian format "01/05/2025" is ambiguous (DD/MM vs MM/DD)

4. **Amount Parsing:** Strips currency symbols and commas. Issues:
   - Indian lakhs formatting (1,00,000) — commas stripped correctly but value changes interpretation
   - Negative amounts in parentheses "(500)" — not handled
   - Credit/Debit detection relies on column name or sign — fragile

5. **Entity Extraction:** Dictionary-based with tiny vocabularies:
   - 6 banks, 10 organizations, 10 merchants
   - Regex patterns for UPI IDs and account numbers work well
   - spaCy NER for PERSON/ORG — decent but not domain-tuned

### Schema Generalization Gaps

| Challenge | Current Handling | Gap |
|---|---|---|
| Different bank schemas | Alias-based header mapping | No adaptive schema detection |
| Different layouts | Table detector with windowed scan | Fragile on non-standard layouts |
| Different narration patterns | Keyword classification (9 types) | No ML-based classification |
| Different column structures | Fixed canonical model | No flexible schema |
| OCR inconsistencies | PaddleOCR + confidence filtering | No post-OCR correction |
| Missing fields | All fields Optional in Rust | Graceful but no inference |
| Unexpected formats | Falls through to raw dict | No error reporting |

### Proposed Generalized Architecture

```
Uploaded Statement
        │
        ▼
┌───────────────────┐
│  Statement Profile │ ← NEW: Bank detection, layout analysis,
│  (Phase 7A)       │    metadata extraction, header localization
└────────┬──────────┘
         │ Profile = { bank, header_row, start_row, end_row, metadata }
         ▼
┌───────────────────┐
│  Schema-Aware     │ ← NEW: Uses profile to select parser strategy
│  Parser Router    │    Bank-specific templates + fallback generic
└────────┬──────────┘
         │ Raw rows with known structure
         ▼
┌───────────────────┐
│  Adaptive         │ ← NEW: Maps any column structure to canonical
│  Standardizer     │    Uses profile + ML header matching
└────────┬──────────┘
         │ Canonical transactions
         ▼
     [Existing pipeline continues]
```

**Key additions needed:**
1. **Bank Detector** — classify bank from logo/text/IFSC patterns
2. **Metadata Extractor** — pull account#, holder, IFSC, dates, balances
3. **Table Detector** — locate transaction table start/end precisely
4. **Profile Builder** — combine all above into a `StatementProfile`
5. **Schema-Aware Parser** — use profile to guide extraction
6. **Fallback Generic Parser** — when bank not recognized, use heuristic column detection

---

## 5. BACKEND 2.0 EXECUTION ROADMAP

### Priority 1: Critical Integration Work (Week 1)

**Goal:** Make existing components actually work together end-to-end.

| Task | Files | Effort |
|---|---|---|
| Fix `panic!()` crash bug in upload handler | `handlers/statement_handler.rs` | 1hr |
| Wire up `update_statement_status()` in worker | `services/worker.rs`, `repositories/statement.rs` | 2hr |
| Use `SERVICES` registry instead of hardcoded URLs | `services/worker.rs`, `config/services.rs` | 1hr |
| Add CORS middleware | `main.rs` | 30min |
| Add request timeouts to outbound HTTP calls | `services/worker.rs`, `handlers/health_handler.rs` | 1hr |
| Add `statement_metadata` to module tree | `models/mod.rs` | 5min |
| Populate statement metadata during upload | `handlers/statement_handler.rs`, `services/worker.rs` | 2hr |
| Connect anomaly detection to worker pipeline | `services/worker.rs` | 2hr |
| Connect temporal analysis to worker pipeline | `services/worker.rs` | 2hr |
| Connect money trail to worker pipeline | `services/worker.rs` | 1hr |
| Add batch transaction insert (replace N+1) | `repositories/transaction_repository.rs` | 2hr |
| Add `GET /api/v1/statements` list endpoint | `handlers/statement_handler.rs`, `routes/statement_routes.rs` | 1hr |
| Add `POST /api/v1/investigate/{statement_id}` unified endpoint | New handler + route | 4hr |

### Priority 2: Schema Generalization (Week 2)

**Goal:** Handle real Indian bank statements from multiple banks.

| Task | Files | Effort |
|---|---|---|
| Implement Statement Profile Service | `ml-services/statement-profile/` (new) | 8hr |
| Implement Bank Detector | `statement-profile/services/bank_detector.py` | 3hr |
| Implement Metadata Extractor | `statement-profile/services/metadata_extractor.py` | 2hr |
| Implement Table Detector (upgrade) | `statement-profile/services/table_detector.py` | 3hr |
| Implement Profile Builder | `statement-profile/services/profile_builder.py` | 2hr |
| Integrate profile into OCR pipeline | `ml-services/ocr/main.py`, `extraction_service.py` | 3hr |
| Expand bank dictionary | `ml-services/entity/services/bank_extractor.py` | 1hr |
| Add credit/debit detection heuristics | `ml-services/standardize/services/` | 2hr |
| Add Indian date format handling | `ml-services/standardize/services/date_normalizer.py` | 1hr |
| Add parenthesized negative amounts | `ml-services/standardize/services/amount_normalizer.py` | 1hr |
| Fix `/full-pipeline` broken endpoint | `ml-services/ocr/main.py` | 30min |
| Fix CSV/Excel type mismatch in OCR | `ml-services/ocr/services/extraction_service.py` | 1hr |

### Priority 3: Risk Fusion (Week 3)

**Goal:** Combine all intelligence signals into unified risk scores.

| Task | Files | Effort |
|---|---|---|
| Implement Risk Fusion Engine | `ml-services/risk-fusion/` (new) | 6hr |
| Rule-based scoring | `risk-fusion/services/rule_engine.py` | 3hr |
| Score aggregation (rule+stat+temporal+graph) | `risk-fusion/services/score_fusion.py` | 3hr |
| Risk level classification | `risk-fusion/services/risk_classifier.py` | 2hr |
| Persist risk_profiles | `risk-fusion/services/persistence.py` | 2hr |
| Add risk endpoints | `risk-fusion/main.py` | 1hr |
| Integrate into worker pipeline | `services/worker.rs` | 2hr |
| Connect `risk_profiles` table | PostgreSQL | 1hr |

### Priority 4: Explainable AI (Week 4)

**Goal:** Generate human-readable explanations for risk scores.

| Task | Files | Effort |
|---|---|---|
| Implement SHAP-based explainer | `ml-services/explainer/` | 6hr |
| Feature importance analysis | `explainer/services/feature_importance.py` | 3hr |
| Narrative generation | `explainer/services/narrative_builder.py` | 3hr |
| Pattern explanation | `explainer/services/pattern_explainer.py` | 2hr |
| Add explain endpoints | `explainer/main.py` | 1hr |
| Integrate into investigation endpoint | Backend | 2hr |

### Priority 5: Dashboard APIs (Week 5)

**Goal:** APIs for frontend dashboard consumption.

| Task | Files | Effort |
|---|---|---|
| `GET /api/v1/dashboard/summary` — statement count, risk distribution | New handler | 2hr |
| `GET /api/v1/dashboard/recent` — recent investigations | New handler | 1hr |
| `GET /api/v1/graph/{statement_id}/visualization` — graph data for viz | New handler | 3hr |
| `GET /api/v1/statements/{id}/investigation` — full investigation results | New handler | 2hr |
| Fix job status to use PostgreSQL | `state/job_status.rs` → new service | 3hr |
| Add statement processing progress tracking | Worker + status API | 2hr |

### Priority 6: Copilot APIs (Week 6)

**Goal:** Natural language query interface.

| Task | Files | Effort |
|---|---|---|
| RAG setup (LangChain + FAISS) | `ml-services/copilot/` | 4hr |
| Query understanding | `copilot/services/query_parser.py` | 3hr |
| Cypher query generation | `copilot/services/cypher_generator.py` | 3hr |
| Response generation | `copilot/services/response_builder.py` | 2hr |
| Add copilot endpoints | `copilot/main.py` | 1hr |

### Priority 7: Report Generation (Week 7)

| Task | Files | Effort |
|---|---|---|
| Investigation report template | New | 3hr |
| PDF/HTML report generation | New service | 4hr |
| Report endpoint | New | 2hr |

---

## 6. IMMEDIATE PRIORITY TASKS (TOP 10)

| # | Task | Why | Phase | Files | Est. |
|---|------|-----|-------|-------|------|
| 1 | **Fix `panic!()` crash in upload handler** | Server crashes on bad MIME type. Production-breaking. | Phase 1 fix | `handlers/statement_handler.rs:89` | 30min |
| 2 | **Wire `update_statement_status()` in worker** | Job status permanently stuck at "queued". Users can't track processing. | Phase 1 fix | `services/worker.rs`, `repositories/statement.rs` | 2hr |
| 3 | **Use `SERVICES` registry in worker** | Hardcoded URLs make deployment impossible. Registry exists but is ignored. | Phase 0 fix | `services/worker.rs`, `config/services.rs` | 1hr |
| 4 | **Add CORS middleware** | Frontend at different origin will fail completely. | Phase 0 fix | `main.rs` | 30min |
| 5 | **Connect anomaly + temporal to worker pipeline** | These engines exist but are never called automatically. Investigation is incomplete. | Phase 6 integration | `services/worker.rs` | 4hr |
| 6 | **Add unified `/investigate/{statement_id}` endpoint** | Currently requires 6+ manual API calls. Need single endpoint that runs all engines. | Phase 7 | New handler + route + service | 4hr |
| 7 | **Implement Statement Profile Service** | Required for schema generalization. Without it, can't handle different bank formats. | Phase 7A | `ml-services/statement-profile/` (new) | 8hr |
| 8 | **Fix `temporal_service.statement()`** | Method body incomplete, returns None. Endpoint broken. | Phase 6 fix | `ml-services/temporal/services/temporal_service.py` | 1hr |
| 9 | **Add `GET /api/v1/statements` list endpoint** | No way to list uploaded statements. Required for any UI. | Phase 5 | `handlers/statement_handler.rs`, `routes/statement_routes.rs` | 1hr |
| 10 | **Implement Risk Fusion Engine** | All intelligence signals exist separately but never combined. Core differentiator not implemented. | Phase 7 | `ml-services/risk-fusion/` (new) | 6hr |

---

## APPENDIX: COMPLETE FILE INVENTORY

### Backend (29 Rust files)
```
backend/src/
├── main.rs                          # Entry point, bootstrap
├── config/
│   ├── mod.rs                       # Module declaration
│   └── services.rs                  # Hardcoded service URLs (IGNORED by worker)
├── routes/
│   ├── mod.rs                       # Module declaration
│   ├── health_routes.rs             # /health, /test-ocr, /services/health
│   └── statement_routes.rs          # /upload, /status
├── handlers/
│   ├── mod.rs                       # Module declaration
│   ├── health_handler.rs            # Health check implementations
│   └── statement_handler.rs         # Upload + status handlers (HAS PANIC BUG)
├── services/
│   ├── mod.rs                       # Module declaration
│   ├── worker.rs                    # Background pipeline orchestrator (467 lines)
│   ├── storage.rs                   # File system operations
│   ├── queue.rs                     # Type aliases for mpsc
│   ├── service_checker.rs           # Generic HTTP health check
│   ├── entity_service.rs            # Entity persistence
│   └── transaction_service.rs       # Transaction persistence
├── models/
│   ├── mod.rs                       # Module declaration (MISSING statement_metadata)
│   ├── health.rs                    # UNUSED
│   ├── statement.rs                 # Upload/Status/Job models
│   ├── transaction.rs               # Transaction model (21 fields)
│   ├── entity.rs                    # CanonicalEntity model
│   └── statement_metadata.rs        # DEAD CODE (not in mod.rs)
├── repositories/
│   ├── mod.rs                       # Module declaration
│   ├── statement.rs                 # Statement CRUD (update_statement_status NEVER CALLED)
│   ├── transaction_repository.rs    # Transaction INSERT (N+1, no batch)
│   └── entity_repository.rs         # Entity UPSERT
└── state/
    ├── mod.rs                       # Module declaration
    ├── app_state.rs                 # AppState struct
    └── job_status.rs                # In-memory HashMap (NEVER UPDATED by worker)
```

### ML Services (78 Python files across 10 services)
```
ml-services/
├── shared/           # 2 files — DEAD CODE (never imported)
├── ocr/              # 24 files — PaddleOCR, pdfplumber, parsers, reconstruction
├── standardize/      # 9 files — Header mapping, date/amount normalization
├── entity/           # 11 files — Regex + spaCy + embedding clustering
├── validation/       # 5 files — Duplicate, failed, balance check
├── graph/            # 8 files — Neo4j: account graph, entity graph, analytics
├── anomaly/          # 5 files — IsolationForest, feature engineering
├── temporal/         # 6 files — Burst, velocity, structuring detection
├── trail/            # 3 files — FIFO money tracking
├── explainer/        # 1 file  — STUB ONLY
└── statement-profile/ # DOES NOT EXIST YET (Phase 7A)
```

### Migrations (4 SQL files)
```
backend/migrations/
├── 20260611063225_initial_schema.sql          # statements, transactions, entities, risk_profiles
├── 20260615081143_extend_transactions_v2.sql   # +reference_number, debit_credit, platform
├── 20260622054330_validation_columns.sql       # +is_duplicate, is_failed, is_valid, confidence_score, validation_notes
└── 20260623064210_statement_metadata.sql       # +account_number, account_holder, ifsc_code, balances, dates
```

---

*Audit completed. Awaiting explicit human approval before any code modifications.*
