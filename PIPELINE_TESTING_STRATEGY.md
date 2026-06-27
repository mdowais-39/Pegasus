# FinIntel AI — Pipeline Testing Strategy

---

## 1. Testing Architecture

```
                    ┌─────────────────────────────┐
                    │     Test Runner Script        │
                    │  (processes all statements)   │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │     Statement Loader          │
                    │  (discovers all files in      │
                    │   primary/ and secondary/)     │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                     │
     ┌────────▼────────┐ ┌────────▼────────┐ ┌─────────▼────────┐
     │  Profile Router  │ │  Profile Router  │ │  Profile Router   │
     │  (bank detection)│ │  (bank detection)│ │  (bank detection) │
     └────────┬────────┘ └────────┬────────┘ └─────────┬────────┘
              │                    │                     │
     ┌────────▼────────┐ ┌────────▼────────┐ ┌─────────▼────────┐
     │  PDF Pipeline    │ │  CSV Pipeline    │ │  Excel Pipeline   │
     │  (pdfplumber/OCR)│ │  (auto-delimiter)│ │  (header detect)  │
     └────────┬────────┘ └────────┬────────┘ └─────────┬────────┘
              │                    │                     │
              └────────────────────┼────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │     Standardizer              │
                    │  (canonical transaction)      │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │     Validator                 │
                    │  (quality checks)             │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │     Result Collector           │
                    │  (per-file metrics)            │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │     Report Generator           │
                    │  (DATASET_TEST_REPORT.md)      │
                    └─────────────────────────────┘
```

---

## 2. Per-File Test Metrics

For every statement file, the test runner produces:

```json
{
  "file": "statement.pdf",
  "bank": "SBI",
  "format": "PDF",
  "file_size_bytes": 245000,

  "ocr_success": true,
  "ocr_method": "pdfplumber",
  "ocr_engine_version": "0.11.0",

  "metadata_extracted": {
    "account_number": "3277373660",
    "ifsc": "SBIN0001234",
    "holder_name": "RAHUL KUMAR",
    "statement_period": "2024-01-01 to 2024-12-31",
    "opening_balance": 15000.00,
    "closing_balance": 82340.50
  },

  "header_detection": {
    "headers_found": ["Date", "Description", "Debit", "Credit", "Balance"],
    "header_row_index": 17,
    "confidence": 0.95
  },

  "transaction_count_raw": 195,
  "transaction_count_extracted": 190,
  "transaction_count_standardized": 188,
  "transaction_count_validated": 185,

  "standardization_score": {
    "date_parsed": 188,
    "date_failed": 0,
    "amount_parsed": 185,
    "amount_failed": 3,
    "debit_credit_determined": 188,
    "narration_classified": 188,
    "balance_parsed": 188
  },

  "validation_score": {
    "total": 185,
    "is_valid": 180,
    "is_duplicate": 3,
    "is_failed": 2,
    "balance_continuity_pass": true,
    "balance_mismatches": 0
  },

  "parsing_anomalies": [
    "Row 45: amount 'Cr' suffix not handled",
    "Row 72: date format '22AUG2024' not parseable"
  ],

  "standardization_issues": [
    "Row 12: debit and credit both present, credit ignored",
    "Row 88: narration too long, truncated"
  ],

  "processing_time_ms": 1250,
  "status": "SUCCESS"
}
```

---

## 3. Test Phases

### Phase 1: Parser Stress Test

**Goal:** Determine which files each parser can extract text from.

```
For each file:
  1. Route to correct parser based on extension
  2. Attempt extraction
  3. Record: success/failure, row count, method used
  4. For PDFs: detect if scanned (no text layer)
```

**Expected outcomes:**
- CSV: ~100% success (pandas handles most)
- Excel: ~95% success (some password-protected may fail)
- Digital PDF: ~80% success (pdfplumber text extraction)
- Scanned PDF: ~70% success (OCR may fail on low quality)
- TXT: ~50% success (fixed-width not supported)

### Phase 2: Header Detection Test

**Goal:** Find transaction table header row in every file.

```
For each successfully parsed file:
  1. Run header row detection
  2. Record: detected row index, headers found, confidence
  3. Compare against expected (manual annotation for subset)
```

### Phase 3: Standardization Test

**Goal:** Convert raw extracted rows to canonical transactions.

```
For each file with detected headers:
  1. Map headers to canonical names
  2. Standardize each row
  3. Record: success rate, field-level parse rates
  4. Flag anomalies (unparseable dates, amounts, etc.)
```

### Phase 4: Validation Test

**Goal:** Assess quality of standardized transactions.

```
For each file with standardized transactions:
  1. Run validation (duplicate, failed, balance)
  2. Record: valid count, duplicate count, failed count
  3. Check balance continuity
  4. Flag anomalies
```

### Phase 5: End-to-End Test

**Goal:** Full pipeline from file to PostgreSQL-ready records.

```
For each file:
  1. Run full pipeline
  2. Verify output matches canonical schema
  3. Verify all required fields populated
  4. Generate final score
```

---

## 4. Test Categories

### Category A: Easy (Expected 90%+ success)
- CSV with clean headers (ICICI CSV, Axis CSV)
- Excel with first-row headers
- Digital PDF with extractable tables

### Category B: Medium (Expected 60-90% success)
- Excel with metadata rows before header
- PDF with text but no clean tables
- Tab-delimited files

### Category C: Hard (Expected 30-60% success)
- Scanned PDFs
- Multi-page PDFs with repeated headers
- Fixed-width text files

### Category D: Edge Cases (Expected <30% success)
- Password-protected files
- Non-English statements
- Corrupted files
- Extremely long statements (10K+ transactions)

---

## 5. Success Criteria

### Minimum Viable (Sprint 1)
- 70% of files produce at least 1 canonical transaction
- 50% of files produce 80%+ field completeness
- 0 server crashes during processing
- All bank types attempted (even if some fail)

### Target (Sprint 2)
- 85% of files produce at least 1 canonical transaction
- 70% of files produce 80%+ field completeness
- Per-field parse rate >90% across all files
- All primary dataset files processed

### Production (Sprint 3+)
- 95% of files produce canonical transactions
- 90% field completeness across all files
- All bank-specific formats handled
- Metadata extraction working for all formats

---

## 6. Test Runner Implementation Plan

### Script: `scripts/pipeline_test_runner.py`

```python
# Pseudocode structure

class PipelineTestRunner:
    def __init__(self):
        self.results = []
    
    def discover_files(self, base_dir):
        """Find all statement files recursively"""
        # Walk primary/ and secondary/
        # Return list of (path, format, bank_hint) tuples
    
    def detect_bank(self, file_path, content):
        """Reuse generate_inventory.py detection logic"""
    
    def test_file(self, file_path):
        """Run full pipeline test on one file"""
        result = {
            "file": file_path.name,
            "bank": "Unknown",
            "format": self.get_format(file_path),
            "status": "PENDING"
        }
        
        try:
            # Phase 1: Parse
            parsed = self.run_parser(file_path)
            result["ocr_success"] = parsed.success
            result["ocr_method"] = parsed.method
            result["transaction_count_raw"] = parsed.row_count
            
            # Phase 2: Detect headers
            headers = self.detect_headers(parsed.rows)
            result["header_detection"] = headers
            
            # Phase 3: Standardize
            standardized = self.standardize(parsed.rows, headers)
            result["transaction_count_standardized"] = len(standardized)
            result["standardization_score"] = self.score_standardization(standardized)
            
            # Phase 4: Validate
            validated = self.validate(standardized)
            result["transaction_count_validated"] = len(validated)
            result["validation_score"] = self.score_validation(validated)
            
            result["status"] = "SUCCESS"
            
        except Exception as e:
            result["status"] = "FAILED"
            result["error"] = str(e)
        
        return result
    
    def generate_report(self):
        """Generate DATASET_TEST_REPORT.md"""
    
    def run(self, base_dir="datasets/bank-statements/Bank-statements-dataset"):
        files = self.discover_files(base_dir)
        for f in files:
            result = self.test_file(f)
            self.results.append(result)
        self.generate_report()
```

---

## 7. Output Reports

### Per-File Report (JSON)
Stored in `datasets/processed/test_results/{filename}.json`

### Aggregate Report (Markdown)
Stored in `DATASET_TEST_REPORT.md` containing:

1. **Summary Dashboard** — total files, success rates, bank coverage
2. **Bank-by-Bank Breakdown** — which banks work, which fail
3. **Format-by-Format Breakdown** — which formats work, which fail
4. **Common Failure Modes** — top 10 reasons for failure
5. **Field Completeness Matrix** — per-field parse rates
6. **Recommendations** — what to fix first

---

## 8. Manual Validation Subset

Select 10 representative files for manual validation:

| File | Bank | Format | Why Selected |
|------|------|--------|--------------|
| `ICORE_STMT_294500196490.csv` | ICICI | CSV | Clean CSV baseline |
| `138488664629235-*.csv` | Axis | CSV | Tab-delimited challenge |
| `3277373660.xlsx` | SBI | Excel | Complex Excel with 32 cols |
| `42618891001229*.xlsx` | Federal | Excel | Metadata rows before header |
| `NITIN stat.txt` | Kerala Gramin | TXT | Fixed-width text |
| `shivlal statement.txt` | PNB | TXT | Multi-page fixed-width |
| `BOM_Statement_FTP_*.pdf` | Bank of Maharashtra | PDF | Digital PDF |
| `00869354051.pdf` | Unknown | PDF | Primary dataset sample |
| `25078124219247-*.csv` | Kotak | CSV | 10K+ transactions |
| `SACHIN SETHI account statement.pdf` | Unknown | PDF | Named statement |

For each: manually verify extracted transactions match the source file.

---

## 9. Automation

### Continuous Testing
After each pipeline fix, re-run the test runner on the full dataset to verify:
- No regressions (previously passing files still pass)
- New fixes improve previously failing files
- Overall metrics improve

### Regression Baseline
Store `baseline_results.json` after first run. Compare subsequent runs against it.
