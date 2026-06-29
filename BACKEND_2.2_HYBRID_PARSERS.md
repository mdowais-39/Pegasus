# BACKEND 2.2 — Hybrid Financial Document Intelligence Engine

### PaddleOCR + PP-StructureV3 Architecture

---

# Overview

Version:

```text
BACKEND-2.2
```

Status:

```text
Design Phase
```

Previous Architecture:

```text
BACKEND-2.1

MinerU-Based AI Native Parsing
```

New Architecture:

```text
BACKEND-2.2

Hybrid Financial Document Intelligence Engine

PaddleOCR 3.x
+
PP-StructureV3
+
Native PDF Extraction
+
Excel/CSV/TXT Specialized Providers
```

---

# Motivation

The original Phase 2 implementation relied heavily on MinerU.

However, testing revealed several issues:

* Slow execution speed
* Complex installation requirements
* High resource consumption
* Overkill for native bank statements
* Poor maintainability
* Difficulty handling mixed financial datasets
* Limited control over extraction pipelines

Our datasets contain:

```text
PDF Statements
Scanned PDFs
Native PDFs
Excel files
CSV files
Fixed-width TXT statements
Delimited TXT statements
```

Examples include:

```text
IDFC
SBI
Axis
HDFC
ICICI
Kerala Gramin
Canara
Indian Bank
Punjab National Bank
Federal Bank
etc.
```

The new system focuses on:

```text
Bank Agnostic Intelligence

Document-Type Specialization

Canonical Financial Normalization

Validation-Driven Parsing
```

---

# Core Design Principles

---

## 1. Bank Agnostic

The system must never depend on:

```text
if bank == SBI:

if bank == ICICI:
```

Business logic.

All outputs must eventually map into a universal financial schema.

---

## 2. Document-Type Specialization

Different document types require different extraction strategies.

Examples:

```text
PDF

Excel

CSV

TXT
```

must have independent providers.

---

## 3. Validation First

Every parsed transaction must pass:

```text
Balance Validation

Amount Validation

Date Validation

Statement Total Validation
```

before entering downstream intelligence systems.

---

## 4. Traceability

Raw extraction outputs must always be preserved.

```python
source_text

source_document

source_page

extraction_method

confidence_score
```

must remain available.

---

## 5. Intelligence Ready

The final schema must support:

```text
Graph Analysis

AML Detection

Entity Resolution

Fund Flow Tracking

Temporal Analytics

Risk Scoring

Explainable AI
```

without future migrations.

---

# High Level Architecture

```text
                    ┌────────────────────┐
                    │   Input Documents  │
                    │                    │
                    │ PDF                │
                    │ Excel              │
                    │ CSV                │
                    │ TXT                │
                    └─────────┬──────────┘
                              │
                              ▼
                ┌──────────────────────────┐
                │ Document Router          │
                │                          │
                │ Detect Document Type     │
                │ Detect Native/Scanned    │
                └─────────┬────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼

   PDF Provider      Excel Provider    TXT Provider
        │                 │                 │
        ▼                 ▼                 ▼

   Intermediate Representation (IR)

                    │
                    ▼

          Canonical Financial Mapper

                    │
                    ▼

             Validation Engine

                    │
                    ▼

         Standardized Transaction Store

                    │
                    ▼

Neo4j + AML + Temporal + Risk Intelligence
```

---

# Directory Structure

```text
ml-services/

document-intelligence/

├── api/
│   └── main.py
│
├── providers/
│   ├── base.py
│   ├── pdf_provider.py
│   ├── csv_provider.py
│   ├── excel_provider.py
│   ├── txt_provider.py
│   └── legacy_provider.py
│
├── schemas/
│   ├── account.py
│   ├── transaction.py
│   └── document.py
│
├── validation/
│   ├── balance_validator.py
│   ├── amount_validator.py
│   ├── date_validator.py
│   └── totals_validator.py
│
├── canonical_mapper.py
│
└── orchestrator.py
```

---

# PDF Parsing Architecture

---

# Native PDFs

Strategy:

```text
PyMuPDF

↓

Extract Embedded Text

↓

PP-StructureV3

↓

Table Detection

↓

Structured JSON
```

No OCR should be performed if text layers exist.

Benefits:

```text
Faster

Higher Accuracy

Lower Memory

Less Noise
```

---

# Scanned PDFs

Strategy:

```text
PaddleOCR 3.x

↓

PP-StructureV3

↓

Table Detection

↓

Layout Understanding

↓

Structured JSON
```

Benefits:

```text
Free

Open Source

GPU Accelerated

Multilingual

Excellent Table Parsing
```

---

# PDF Provider Responsibilities

```python
class PDFProvider:

    detect_native_pdf()

    detect_scanned_pdf()

    extract_metadata()

    extract_transactions()

    generate_ir()
```

---

# Excel Provider

---

Supported:

```text
.xlsx

.xls
```

Libraries:

```text
openpyxl

pandas
```

Responsibilities:

```python
class ExcelProvider:

    detect_transaction_sheet()

    detect_metadata_sheet()

    normalize_columns()

    build_ir()
```

---

# CSV Provider

---

Responsibilities:

```python
class CSVProvider:

    detect_delimiter()

    infer_headers()

    normalize_columns()

    build_ir()
```

---

# TXT Provider

---

Supported:

```text
Fixed Width Statements

Delimited Statements

Legacy Banking Exports
```

Examples:

```text
Kerala Gramin

Canara

Old CBS Exports
```

---

# Fixed Width Detection

Example:

```text
Trans Dt

Value Dt

Transaction ID

Particulars

Debit

Credit

Balance
```

The parser must automatically infer:

```python
column_spans = [
    (0,10),
    (10,20),
    (20,40),
    (40,90),
    (90,105),
    (105,120),
    (120,None)
]
```

instead of relying on regex.

---

# Intermediate Representation (IR)

All providers produce:

```python
DocumentIR:

    source_file

    source_type

    extraction_method

    confidence

    metadata

    transactions
```

---

# Canonical Account Schema

```python
AccountMetadata:

    account_holder

    account_number

    customer_id

    ifsc

    branch

    bank_name

    account_type

    statement_start

    statement_end

    opening_balance

    closing_balance

    currency
```

---

# Canonical Transaction Schema

```python
CanonicalTransaction:

    transaction_date

    value_date

    narration

    reference_number

    cheque_number

    debit

    credit

    balance

    transaction_type

    source_bank

    source_file

    confidence
```

---

# Validation Layer

---

# Balance Validation

```python
previous_balance

+

credit

-

debit

=

next_balance
```

---

# Amount Validation

Rules:

```text
Debit > 0

Credit > 0

Never both simultaneously
```

---

# Date Validation

Supported:

```text
DD/MM/YYYY

DD-MM-YYYY

YYYY-MM-DD
```

---

# Statement Totals Validation

Validate:

```text
Opening Balance

Total Debit

Total Credit

Closing Balance
```

against extracted transactions.

---

# Confidence Scoring

Every document produces:

```json
{
    "confidence":0.97,

    "warnings":[...]

}
```

Confidence sources:

```text
OCR Quality

Table Detection

Metadata Extraction

Balance Validation

Totals Validation

Date Validation
```

---

# Migration Plan

---

# Remove

```text
MinerU Provider

MinerU Dependencies

MinerU Installation Scripts
```

---

# Add

```text
PaddleOCR

PP-StructureV3

PyMuPDF

OpenPyXL

Universal TXT Parser
```

---

# Phase 2 Deliverables

---

## Schemas

```text
account.py

transaction.py

document.py
```

---

## Providers

```text
base.py

pdf_provider.py

csv_provider.py

excel_provider.py

txt_provider.py

legacy_provider.py
```

---

## Validation

```text
balance_validator.py

date_validator.py

amount_validator.py

totals_validator.py
```

---

## Core Components

```text
canonical_mapper.py

orchestrator.py

api/main.py
```

---

# Final Architecture

```text
BACKEND-2.2

Hybrid Financial Document Intelligence Engine

PyMuPDF
+
PaddleOCR 3.x
+
PP-StructureV3
+
OpenPyXL
+
Pandas
+
Universal TXT Parsing
+
Validation Driven Intelligence
+
Canonical Financial Schemas
```
# BACKEND 2.2 — Hybrid Financial Document Intelligence Engine

### PaddleOCR + PP-StructureV3 Architecture

---

# Overview

Version:

```text
BACKEND-2.2
```

Status:

```text
Design Phase
```

Previous Architecture:

```text
BACKEND-2.1

MinerU-Based AI Native Parsing
```

New Architecture:

```text
BACKEND-2.2

Hybrid Financial Document Intelligence Engine

PaddleOCR 3.x
+
PP-StructureV3
+
Native PDF Extraction
+
Excel/CSV/TXT Specialized Providers
```

---

# Motivation

The original Phase 2 implementation relied heavily on MinerU.

However, testing revealed several issues:

* Slow execution speed
* Complex installation requirements
* High resource consumption
* Overkill for native bank statements
* Poor maintainability
* Difficulty handling mixed financial datasets
* Limited control over extraction pipelines

Our datasets contain:

```text
PDF Statements
Scanned PDFs
Native PDFs
Excel files
CSV files
Fixed-width TXT statements
Delimited TXT statements
```

Examples include:

```text
IDFC
SBI
Axis
HDFC
ICICI
Kerala Gramin
Canara
Indian Bank
Punjab National Bank
Federal Bank
etc.
```

The new system focuses on:

```text
Bank Agnostic Intelligence

Document-Type Specialization

Canonical Financial Normalization

Validation-Driven Parsing
```

---

# Core Design Principles

---

## 1. Bank Agnostic

The system must never depend on:

```text
if bank == SBI:

if bank == ICICI:
```

Business logic.

All outputs must eventually map into a universal financial schema.

---

## 2. Document-Type Specialization

Different document types require different extraction strategies.

Examples:

```text
PDF

Excel

CSV

TXT
```

must have independent providers.

---

## 3. Validation First

Every parsed transaction must pass:

```text
Balance Validation

Amount Validation

Date Validation

Statement Total Validation
```

before entering downstream intelligence systems.

---

## 4. Traceability

Raw extraction outputs must always be preserved.

```python
source_text

source_document

source_page

extraction_method

confidence_score
```

must remain available.

---

## 5. Intelligence Ready

The final schema must support:

```text
Graph Analysis

AML Detection

Entity Resolution

Fund Flow Tracking

Temporal Analytics

Risk Scoring

Explainable AI
```

without future migrations.

---

# High Level Architecture

```text
                    ┌────────────────────┐
                    │   Input Documents  │
                    │                    │
                    │ PDF                │
                    │ Excel              │
                    │ CSV                │
                    │ TXT                │
                    └─────────┬──────────┘
                              │
                              ▼
                ┌──────────────────────────┐
                │ Document Router          │
                │                          │
                │ Detect Document Type     │
                │ Detect Native/Scanned    │
                └─────────┬────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼

   PDF Provider      Excel Provider    TXT Provider
        │                 │                 │
        ▼                 ▼                 ▼

   Intermediate Representation (IR)

                    │
                    ▼

          Canonical Financial Mapper

                    │
                    ▼

             Validation Engine

                    │
                    ▼

         Standardized Transaction Store

                    │
                    ▼

Neo4j + AML + Temporal + Risk Intelligence
```

---

# Directory Structure

```text
ml-services/

document-intelligence/

├── api/
│   └── main.py
│
├── providers/
│   ├── base.py
│   ├── pdf_provider.py
│   ├── csv_provider.py
│   ├── excel_provider.py
│   ├── txt_provider.py
│   └── legacy_provider.py
│
├── schemas/
│   ├── account.py
│   ├── transaction.py
│   └── document.py
│
├── validation/
│   ├── balance_validator.py
│   ├── amount_validator.py
│   ├── date_validator.py
│   └── totals_validator.py
│
├── canonical_mapper.py
│
└── orchestrator.py
```

---

# PDF Parsing Architecture

---

# Native PDFs

Strategy:

```text
PyMuPDF

↓

Extract Embedded Text

↓

PP-StructureV3

↓

Table Detection

↓

Structured JSON
```

No OCR should be performed if text layers exist.

Benefits:

```text
Faster

Higher Accuracy

Lower Memory

Less Noise
```

---

# Scanned PDFs

Strategy:

```text
PaddleOCR 3.x

↓

PP-StructureV3

↓

Table Detection

↓

Layout Understanding

↓

Structured JSON
```

Benefits:

```text
Free

Open Source

GPU Accelerated

Multilingual

Excellent Table Parsing
```

---

# PDF Provider Responsibilities

```python
class PDFProvider:

    detect_native_pdf()

    detect_scanned_pdf()

    extract_metadata()

    extract_transactions()

    generate_ir()
```

---

# Excel Provider

---

Supported:

```text
.xlsx

.xls
```

Libraries:

```text
openpyxl

pandas
```

Responsibilities:

```python
class ExcelProvider:

    detect_transaction_sheet()

    detect_metadata_sheet()

    normalize_columns()

    build_ir()
```

---

# CSV Provider

---

Responsibilities:

```python
class CSVProvider:

    detect_delimiter()

    infer_headers()

    normalize_columns()

    build_ir()
```

---

# TXT Provider

---

Supported:

```text
Fixed Width Statements

Delimited Statements

Legacy Banking Exports
```

Examples:

```text
Kerala Gramin

Canara

Old CBS Exports
```

---

# Fixed Width Detection

Example:

```text
Trans Dt

Value Dt

Transaction ID

Particulars

Debit

Credit

Balance
```

The parser must automatically infer:

```python
column_spans = [
    (0,10),
    (10,20),
    (20,40),
    (40,90),
    (90,105),
    (105,120),
    (120,None)
]
```

instead of relying on regex.

---

# Intermediate Representation (IR)

All providers produce:

```python
DocumentIR:

    source_file

    source_type

    extraction_method

    confidence

    metadata

    transactions
```

---

# Canonical Account Schema

```python
AccountMetadata:

    account_holder

    account_number

    customer_id

    ifsc

    branch

    bank_name

    account_type

    statement_start

    statement_end

    opening_balance

    closing_balance

    currency
```

---

# Canonical Transaction Schema

```python
CanonicalTransaction:

    transaction_date

    value_date

    narration

    reference_number

    cheque_number

    debit

    credit

    balance

    transaction_type

    source_bank

    source_file

    confidence
```

---

# Validation Layer

---

# Balance Validation

```python
previous_balance

+

credit

-

debit

=

next_balance
```

---

# Amount Validation

Rules:

```text
Debit > 0

Credit > 0

Never both simultaneously
```

---

# Date Validation

Supported:

```text
DD/MM/YYYY

DD-MM-YYYY

YYYY-MM-DD
```

---

# Statement Totals Validation

Validate:

```text
Opening Balance

Total Debit

Total Credit

Closing Balance
```

against extracted transactions.

---

# Confidence Scoring

Every document produces:

```json
{
    "confidence":0.97,

    "warnings":[...]

}
```

Confidence sources:

```text
OCR Quality

Table Detection

Metadata Extraction

Balance Validation

Totals Validation

Date Validation
```

---

# Migration Plan

---

# Remove

```text
MinerU Provider

MinerU Dependencies

MinerU Installation Scripts
```

---

# Add

```text
PaddleOCR

PP-StructureV3

PyMuPDF

OpenPyXL

Universal TXT Parser
```

---

# Phase 2 Deliverables

---

## Schemas

```text
account.py

transaction.py

document.py
```

---

## Providers

```text
base.py

pdf_provider.py

csv_provider.py

excel_provider.py

txt_provider.py

legacy_provider.py
```

---

## Validation

```text
balance_validator.py

date_validator.py

amount_validator.py

totals_validator.py
```

---

## Core Components

```text
canonical_mapper.py

orchestrator.py

api/main.py
```

---

# Final Architecture

```text
BACKEND-2.2

Hybrid Financial Document Intelligence Engine

PyMuPDF
+
PaddleOCR 3.x
+
PP-StructureV3
+
OpenPyXL
+
Pandas
+
Universal TXT Parsing
+
Validation Driven Intelligence
+
Canonical Financial Schemas
```
