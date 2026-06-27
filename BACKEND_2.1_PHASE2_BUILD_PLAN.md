# BACKEND_2.1_PHASE2_BUILD_PLAN.md

# FinIntel Backend 2.1 — Phase 2: AI-Native Document Intelligence Architecture

## Status

Architecture Decision: **FINALIZED**

This document supersedes the original OCR implementation plan while preserving all downstream system contracts.

The goal is to evolve Phase 2 into an AI-native Document Intelligence layer powered by **MinerU 2.5 OSS** while maintaining compatibility with the original FinIntel architecture.

---

# Architectural Philosophy

The original architecture remains fundamentally correct:

* Rust (Axum) remains the orchestration layer.
* Python microservices remain the intelligence layer.
* Neo4j, GNNs, Statistical Intelligence, Temporal Intelligence, Explainability, and Report Generation remain unchanged.
* Only the OCR & Parsing subsystem evolves into an AI-native document understanding layer.

---

# Original Phase 2

```text
OpenCV
↓

PaddleOCR
↓

pdfplumber
↓

Camelot
↓

Regex

↓

Raw Rows
```

This approach proved difficult to scale across:

* 18 scanned primary PDFs
* 144 secondary files
* Multiple banks
* Different statement layouts
* Fixed-width TXT files
* Legacy XLS files
* Complex financial tables

---

# Backend 2.1 Phase 2

```text
Document Intelligence Layer

↓

MinerU 2.5 OSS

↓

Structured Markdown + JSON

↓

Canonical Mapper

↓

CanonicalDocument

↓

Phase 3 Standardization
```

The downstream architecture remains unchanged.

---

# Technology Decisions

| Component               | Technology                |
| ----------------------- | ------------------------- |
| Primary PDF Engine      | MinerU 2.5 OSS            |
| CSV Parsing             | Pandas                    |
| XLS/XLSX Parsing        | OpenPyXL + Pandas         |
| TXT Parsing             | Custom Fixed-Width Parser |
| Legacy PDF Parsing      | pdfplumber                |
| Legacy OCR              | PaddleOCR                 |
| Legacy Table Extraction | Camelot                   |

---

# Document Intelligence Architecture

```text
ml-services/

document-intelligence/

├── api/
│   └── main.py

├── providers/
│   ├── base.py
│   ├── mineru_provider.py
│   ├── csv_provider.py
│   ├── excel_provider.py
│   ├── txt_provider.py
│   └── legacy_provider.py

├── schemas/
│   ├── document.py
│   ├── account.py
│   └── transaction.py

├── orchestrator.py

├── canonical_mapper.py

├── benchmark/
│   ├── run_dataset_benchmark.py
│   └── metrics.py

└── tests/
```

---

# Provider Responsibilities

## MinerU Provider (PRIMARY)

Responsible for:

* Scanned PDFs
* Digital PDFs
* Images
* Complex layouts
* Tables
* Multilingual content
* Financial statements

---

## CSV Provider

Technology:

```python
pandas.read_csv(...)
```

Responsible for:

* CSV datasets
* Delimiter detection
* Header normalization

---

## Excel Provider

Technology:

```python
pandas.read_excel(...)
```

Responsible for:

* XLS files
* XLSX files
* Multi-row headers
* Legacy bank exports

---

## TXT Provider

Responsible for:

* Fixed-width statements
* Tab-separated statements
* PNB/Kerala Gramin formats
* Legacy exports

---

# Legacy Provider Architecture

The old OCR pipeline is NOT removed.

Instead:

```text
ml-services/

ocr/
    LEGACY/

document-intelligence/
    NEW SYSTEM
```

The Legacy Provider encapsulates:

```text
pdfplumber

↓

PaddleOCR

↓

Camelot
```

Responsibilities:

* Fallback extraction
* Regression comparison
* Emergency recovery
* Benchmark validation

The legacy stack remains a safety net until MinerU achieves production confidence.

---

# Provider Routing

```python
class DocumentOrchestrator:

    def extract(file_path):

        suffix = Path(file_path).suffix.lower()

        if suffix == ".csv":
            return CSVProvider()

        elif suffix in [".xls", ".xlsx"]:
            return ExcelProvider()

        elif suffix == ".txt":
            return TXTProvider()

        elif suffix in [".pdf", ".png", ".jpg"]:
            return MinerUProvider()

        else:
            return LegacyProvider()
```

---

# Canonical Output Contract

Every provider must return:

```python
class CanonicalDocument:

    metadata: AccountMetadata

    transactions: list[Transaction]
```

---

## AccountMetadata

```python
class AccountMetadata:

    customer_name: str

    account_number: str

    bank_name: str

    ifsc: str | None

    branch: str | None

    opening_balance: float | None

    closing_balance: float | None
```

---

## Transaction

```python
class Transaction:

    transaction_id: str

    transaction_date: datetime

    value_date: datetime | None

    description: str

    debit: float | None

    credit: float | None

    balance: float

    reference_number: str | None

    transaction_channel: str | None
```

These contracts become the input for Phase 3 Standardization.

---

# Benchmark Infrastructure

The existing:

```text
scripts/pipeline_test_runner.py
```

evolves into:

```text
benchmark/

run_dataset_benchmark.py
```

Metrics:

```text
Success Rate

Extraction Quality

Missing Fields

Processing Time

Failure Modes
```

Target:

```text
162 files

↓

90%+ successful extraction
```

---

# Integration With Existing Architecture

Nothing downstream changes.

```text
Document Intelligence

↓

CanonicalDocument

↓

Standardization

↓

Entity Intelligence

↓

Neo4j + GNN

↓

Statistical Engine

↓

Temporal Engine

↓

Risk Fusion

↓

Explainability

↓

Reports

↓

Frontend
```

This preserves the original FinIntel architecture while modernizing its weakest layer.

---

# Immediate Execution Plan

## Step 1

Freeze architecture.

Create:

```text
BACKEND_2.1_PHASE2_BUILD_PLAN.md
DECISIONS.md
```

---

## Step 2

Install MinerU 2.5 OSS locally.

---

## Step 3

Benchmark:

```text
18 Primary PDFs

20 Secondary Samples
```

Measure:

* Success rate
* Missing metadata
* Missing transactions
* Processing time

---

## Step 4

Build:

```text
providers/

base.py

mineru_provider.py

csv_provider.py

excel_provider.py

txt_provider.py

legacy_provider.py
```

---

## Step 5

Implement:

```text
schemas/

document.py

account.py

transaction.py
```

---

## Step 6

Build:

```text
orchestrator.py
```

---

## Step 7

Run:

```text
162-file benchmark
```

Production readiness target:

```text
90%+ extraction success
```

---

# Final Decision

Backend 2.1 officially adopts:

```text
PRIMARY:

MinerU 2.5 OSS

FALLBACK:

CSV Provider
Excel Provider
TXT Provider

LEGACY:

pdfplumber
PaddleOCR
Camelot
```

The downstream FinIntel architecture remains unchanged.
