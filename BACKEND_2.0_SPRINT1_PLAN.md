# FinIntel AI — Backend 2.0 Sprint 1 Plan

---

## Sprint Goal

**Successfully process ALL bank statements from primary and secondary datasets into canonical transaction records stored in PostgreSQL.**

Success means: file in → canonical transactions out → stored in DB. No intelligence layers yet.

---

## Sprint 1 Task Breakdown

### Wave 1: Foundation (Day 1-2)

#### Task 1.1: Fix Critical Bugs
**Why:** Server crashes on basic operations. Must fix before any testing.
**Phase:** 0 fix
**Files:** `backend/src/handlers/statement_handler.rs`

| Sub-task | Effort | Details |
|----------|--------|---------|
| Replace `panic!()` with HTTP 415 response | 30min | Line 89: return `StatusCode::UNSUPPORTED_MEDIA_TYPE` with error JSON |
| Replace `expect()` calls with proper error handling | 2hr | 10+ locations: return `StatusCode::INTERNAL_SERVER_ERROR` with error JSON |
| Add file size limit (50MB) | 30min | Reject uploads exceeding limit |

#### Task 1.2: Wire Job Status Updates
**Why:** Users can't track processing. Status stuck at "queued" forever.
**Phase:** 1 fix
**Files:** `backend/src/services/worker.rs`, `backend/src/repositories/statement.rs`

| Sub-task | Effort | Details |
|----------|--------|---------|
| Call `update_statement_status("processing")` when job starts | 30min | In worker loop, before OCR call |
| Call `update_statement_status("completed")` on success | 30min | After graph build |
| Call `update_statement_status("failed")` on error | 1hr | In each error branch |
| Update `JobStatusStore` alongside DB updates | 30min | Pass `job_status` to worker |

#### Task 1.3: Use Service Registry
**Why:** Hardcoded URLs make configuration impossible.
**Phase:** 0 fix
**Files:** `backend/src/services/worker.rs`, `backend/src/config/services.rs`

| Sub-task | Effort | Details |
|----------|--------|---------|
| Replace hardcoded URLs with `SERVICES` constants | 1hr | 6 URL replacements in worker |
| Make service URLs configurable via env vars | 1hr | Update `config/services.rs` to read from `std::env` |

#### Task 1.4: Add CORS Middleware
**Why:** Frontend at different origin fails completely.
**Phase:** 0 fix
**Files:** `backend/src/main.rs`

| Sub-task | Effort | Details |
|----------|--------|---------|
| Add CORS layer allowing all origins (dev) | 30min | `CorsLayer::any()` from `tower_http::cors` |

---

### Wave 2: Dataset Parser Fixes (Day 2-4)

#### Task 2.1: Fix CSV Delimiter Detection
**Why:** Tab-delimited CSVs (Kotak, IDFC) parsed as comma-delimited → entire row in one column.
**Phase:** 2 fix
**Files:** `ml-services/ocr/parsers/csv_parser.py`

| Sub-task | Effort | Details |
|----------|--------|---------|
| Use `pd.read_csv(sep=None, engine='python')` for auto-detection | 1hr | Handles comma, tab, semicolon |
| Handle encoding detection (UTF-8, latin-1, cp1252) | 1hr | Use `chardet` or fallback chain |
| Add `nrows` limit for very large files (10K+ rows) | 30min | Prevent OOM on huge CSVs |

#### Task 2.2: Fix Excel Header Detection
**Why:** Excel files with metadata rows before header (Federal Bank, SBI) not handled.
**Phase:** 2 fix
**Files:** `ml-services/ocr/parsers/excel_parser.py`

| Sub-task | Effort | Details |
|----------|--------|---------|
| Skip metadata rows before header | 2hr | Use keyword density scan (reuse existing logic) |
| Handle `.xls` format (xlrd) | 1hr | Add xlrd dependency |
| Return both metadata and transaction rows | 1hr | Separate header region from data region |

#### Task 2.3: Add Fixed-Width TXT Parser
**Why:** Kerala Gramin Bank and PNB TXT files not parseable.
**Phase:** 2 new
**Files:** `ml-services/ocr/parsers/fixed_width_parser.py` (new)

| Sub-task | Effort | Details |
|----------|--------|---------|
| Implement column detection via whitespace gaps | 3hr | Find column boundaries from first data row |
| Handle multi-page formats with repeated headers | 2hr | Deduplicate headers across pages |
| Handle `Cr`/`Dr` suffix on amounts | 1hr | Strip suffix, preserve value |

#### Task 2.4: Fix PDF Text Extraction
**Why:** Some digital PDFs fail to extract text or tables.
**Phase:** 2 fix
**Files:** `ml-services/ocr/parsers/pdf_parser.py`

| Sub-task | Effort | Details |
|----------|--------|---------|
| Use `extract_tables()` when available | 2hr | Currently tables extracted but discarded |
| Handle multi-page PDFs (concatenate pages) | 1hr | Return combined text with page markers |
| Add fallback: if no tables, use text extraction | 1hr | Already partially implemented |

#### Task 2.5: Fix Scanned PDF Temp File Handling
**Why:** Temp files leak, concurrent requests collide.
**Phase:** 2 fix
**Files:** `ml-services/ocr/parsers/scanned_pdf_parser.py`

| Sub-task | Effort | Details |
|----------|--------|---------|
| Use `tempfile.NamedTemporaryFile(delete=True)` | 1hr | Auto-cleanup |
| Use unique temp directory per request | 1hr | `tempfile.mkdtemp()` |
| Clean up in finally block | 30min | Ensure cleanup on error |

---

### Wave 3: Standardization Fixes (Day 4-5)

#### Task 3.1: Fix Date Normalizer
**Why:** Indian date formats (DD/MM/YYYY, DD-MM-YY, DD-Mon-YY) misparsed.
**Phase:** 3 fix
**Files:** `ml-services/standardize/services/date_normalizer.py`

| Sub-task | Effort | Details |
|----------|--------|---------|
| Add Indian date-first parsing (day before month) | 2hr | Try `dayfirst=True` in dateutil |
| Handle 2-digit years (assume 2000+) | 1hr | Custom parsing logic |
| Handle month abbreviations (Jan, Feb, etc.) | 1hr | Map to month numbers |
| Return `None` explicitly on failure (not raw value) | 30min | Current behavior returns unparseable string |

#### Task 3.2: Fix Amount Normalizer
**Why:** Indian lakh commas, parenthesized negatives, Cr/Dr suffixes not handled.
**Phase:** 3 fix
**Files:** `ml-services/standardize/services/amount_normalizer.py`

| Sub-task | Effort | Details |
|----------|--------|---------|
| Handle Indian lakh commas (`1,50,212.00`) | 1hr | Remove all commas |
| Handle parenthesized negatives (`(500.00)`) | 1hr | Detect `()`, negate value |
| Handle `Cr`/`Dr` suffix on balance | 30min | Strip suffix |
| Handle `₹`, `Rs.`, `INR` prefix | Already works | Keep existing |

#### Task 3.3: Fix Transaction Enricher
**Why:** Credit amount lost when both debit and credit columns present. Bank name not passed.
**Phase:** 3 fix
**Files:** `ml-services/standardize/services/transaction_enricher.py`

| Sub-task | Effort | Details |
|----------|--------|---------|
| Preserve both debit AND credit amounts | 2hr | Set `debit_amount` AND `credit_amount` fields |
| Pass `bank_name` in bank statement path | 30min | Currently not passed |
| Fix `narration_normalized` (actually normalize) | 1hr | Lowercase, strip whitespace, remove special chars |
| Populate `platform` and `upi_id` from narration | 2hr | Implement extraction from narration string |

#### Task 3.4: Add Narration Intelligence
**Why:** Platform and UPI ID extraction stubs (always `None`).
**Phase:** 3 new
**Files:** `ml-services/standardize/services/narration_parser.py`

| Sub-task | Effort | Details |
|----------|--------|---------|
| Extract UPI ID from narration | 1hr | Regex: `([a-zA-Z0-9._-]+@[a-zA-Z]+)` |
| Extract UPI type (P2A, P2M, etc.) | 30min | Regex: `UPI/(P2A\|P2P\|REC\|PAY)/` |
| Extract reference number from narration | 1hr | Regex: `(?:UTR\|RRN\|Ref)\s*[:=]?\s*(\d+)` |
| Extract counterparty name | 1hr | Parse structured narration formats |

---

### Wave 4: Metadata Extraction (Day 5-6)

#### Task 4.1: Implement Metadata Extraction Pipeline
**Why:** Account number, IFSC, holder name never extracted despite `MetadataExtractor` existing.
**Phase:** 5 new
**Files:** `ml-services/ocr/services/metadata_extractor.py`

| Sub-task | Effort | Details |
|----------|--------|---------|
| Enable `MetadataExtractor` in extraction pipeline | 1hr | Currently dead code |
| Add holder name extraction | 2hr | Regex: `Name[:\s]+([A-Z\s]+)` |
| Add statement period extraction | 1hr | Regex: date range patterns |
| Add opening/closing balance extraction | 1hr | Regex: `opening.*balance.*(\d[\d,.]+)` |
| Store metadata in statement profile | 1hr | Return as part of extraction result |

#### Task 4.2: Populate Statement Metadata in DB
**Why:** `statements` table has metadata columns but they're never populated.
**Phase:** 5 integration
**Files:** `backend/src/handlers/statement_handler.rs`, `backend/src/services/worker.rs`

| Sub-task | Effort | Details |
|----------|--------|---------|
| Pass metadata from OCR to worker | 1hr | Update OCR response to include metadata |
| Update `insert_statement` to include metadata | 1hr | Add account_number, ifsc, holder_name, balances |
| Declare `statement_metadata` module in `models/mod.rs` | 5min | Fix dead code |

---

### Wave 5: Testing Infrastructure (Day 6-7)

#### Task 5.1: Build Pipeline Test Runner
**Why:** Need automated testing across all 162 files.
**Phase:** New
**Files:** `scripts/pipeline_test_runner.py` (new)

| Sub-task | Effort | Details |
|----------|--------|---------|
| File discovery (walk primary/secondary directories) | 1hr | |
| Per-file pipeline test | 3hr | OCR → Standardize → Validate → Score |
| Result collection (JSON per file) | 1hr | |
| Report generation (DATASET_TEST_REPORT.md) | 2hr | Aggregate stats, bank-by-bank, format-by-format |

#### Task 5.2: Run Full Dataset Test
**Why:** Validate all fixes work across real data.
**Phase:** New
**Files:** `scripts/pipeline_test_runner.py`

| Sub-task | Effort | Details |
|----------|--------|---------|
| Run against all 18 primary files | 1hr | Record results |
| Run against all 144 secondary files | 2hr | Record results |
| Generate baseline report | 1hr | First pass metrics |
| Fix top 10 failure modes | 4hr | Iterative improvement |

---

### Wave 6: Worker Pipeline Enhancement (Day 7-8)

#### Task 6.1: Connect Anomaly + Temporal to Worker
**Why:** These engines exist but aren't called automatically.
**Phase:** 6 integration
**Files:** `backend/src/services/worker.rs`

| Sub-task | Effort | Details |
|----------|--------|---------|
| Add anomaly detection step after save | 2hr | `POST localhost:8004/anomaly` with statement_id |
| Add temporal analysis step | 2hr | `POST localhost:8005/temporal` with statement_id |
| Add money trail step | 1hr | `POST localhost:8006/trace` with transactions |
| Store results in new `investigation_results` table | 2hr | New migration + repository |

#### Task 6.2: Add Unified Investigation Endpoint
**Why:** Currently requires 6+ manual API calls.
**Phase:** 7 new
**Files:** New handler + route

| Sub-task | Effort | Details |
|----------|--------|---------|
| `POST /api/v1/investigate/{statement_id}` | 4hr | Runs all engines, returns combined results |
| Aggregate all intelligence signals | 2hr | Graph + anomaly + temporal + trail |
| Return unified investigation report | 2hr | JSON with all findings |

---

## Sprint 1 Priority Stack

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| P0 | Fix panic/expect crash bugs | 3hr | Server stability |
| P0 | Wire job status updates | 2hr | User visibility |
| P0 | Add CORS | 30min | Frontend access |
| P1 | Fix CSV delimiter detection | 2hr | Kotak/IDFC files |
| P1 | Fix Excel header detection | 4hr | Federal/SBI files |
| P1 | Fix date normalizer | 4hr | All formats |
| P1 | Fix amount normalizer | 3hr | All formats |
| P2 | Add fixed-width TXT parser | 6hr | PNB/Kerala files |
| P2 | Fix transaction enricher | 5hr | Data quality |
| P2 | Implement metadata extraction | 7hr | Statement metadata |
| P3 | Build test runner | 7hr | Automated validation |
| P3 | Connect anomaly/temporal to worker | 7hr | Pipeline completeness |
| P3 | Add investigation endpoint | 8hr | API completeness |

**Total estimated effort:** ~60 hours (7-8 working days)

---

## Definition of Done

Sprint 1 is complete when:

1. ✅ Server processes uploads without crashes
2. ✅ Job status updates correctly (queued → processing → completed/failed)
3. ✅ All 162 files attempt processing (no unhandled exceptions)
4. ✅ 70%+ of files produce at least 1 canonical transaction
5. ✅ 50%+ of files produce 80%+ field completeness
6. ✅ All canonical transactions stored in PostgreSQL
7. ✅ Metadata (account#, IFSC, holder) extracted for 60%+ of files
8. ✅ DATASET_TEST_REPORT.md generated with full metrics
9. ✅ No regressions on previously passing files

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| PaddleOCR not installed / won't start | 20% files unprocessable | Check OCR health at startup, graceful fallback |
| poppler not installed for scanned PDFs | Scanned PDFs fail | Install poppler-utils, document requirement |
| xlrd not installed for .xls files | Old Excel files fail | Add to requirements.txt |
| Very large files (10K+ rows) OOM | Process hang | Add row limit, chunked processing |
| Password-protected files | Unhandled exception | Catch, skip, log |
| Non-English statements | Low OCR accuracy | Document limitation, future: multilingual OCR |
