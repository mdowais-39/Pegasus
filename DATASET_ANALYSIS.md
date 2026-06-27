# FinIntel AI — Dataset Analysis

---

## 1. Dataset Inventory

### Primary Dataset

**Location:** `datasets/bank-statements/Bank-statements-dataset/primary/`
**Total files:** 18
**Format:** All PDF
**File naming:** Account number as filename (e.g., `00869354051.pdf`)

| File | Type | Est. Bank | Notes |
|------|------|-----------|-------|
| `00869354051.pdf` | PDF | Unknown | Numeric account name |
| `08874795659248.pdf` | PDF | Unknown | Long account number |
| `098030016134598.pdf` | PDF | Unknown | |
| `17771917925.pdf` | PDF | Unknown | |
| `18306700003.pdf` | PDF | Unknown | |
| `211566492688.pdf` | PDF | Unknown | |
| `24704559049070.pdf` | PDF | Unknown | |
| `258082779154.pdf` | PDF | Unknown | |
| `280442153117.pdf` | PDF | Unknown | |
| `43920027363506.pdf` | PDF | Unknown | |
| `50192424882238.pdf` | PDF | Unknown | |
| `61577175569879.pdf` | PDF | Unknown | |
| `72615533841078.pdf` | PDF | Unknown | |
| `772342103350.pdf` | PDF | Unknown | |
| `8642666611469255.pdf` | PDF | Unknown | |
| `92883409730.pdf` | PDF | Unknown | |
| `95773447976527.pdf` | PDF | Unknown | |
| `99572217148131.pdf` | PDF | Unknown | |

**Primary dataset challenges:**
- All PDFs — requires either pdfplumber text extraction or PaddleOCR
- No filenames indicating bank — bank detection must rely on content analysis
- Unknown format mix (digital vs scanned) — must detect and route accordingly

### Secondary Dataset

**Location:** `datasets/bank-statements/Bank-statements-dataset/Secondary/`
**Total files:** 144
**Format breakdown:**

| Format | Count | Extensions |
|--------|-------|------------|
| PDF | ~85 | `.pdf` |
| Excel | ~40 | `.xlsx`, `.xls` |
| CSV | ~15 | `.csv` |
| Text | ~4 | `.txt` |

**File naming patterns:**
- Account number + date range: `138488664629235-23-11-2024to11-12-2025.pdf`
- Account number + SOA: `001029700065_SOA.pdf`
- Account number + STATEMENT: `112108374579 SOA.xlsx`
- Bank-generated names: `BOM_Statement_FTP_01701_xxxxxxxx1206_...pdf`
- CASA statements: `331087 CASA Account Statement_Report - 2025-12-01T...xlsx`
- Named statements: `SACHIN SETHI account statement.pdf`
- Generic names: `statement.pdf`, `Statement.pdf`

---

## 2. Bank Inventory

Based on `generate_inventory.py` IFSC/filename detection logic and sample file analysis:

| Bank | IFSC Prefix | Detected In | Format Support |
|------|-------------|-------------|----------------|
| **SBI** | `SBIN` | Primary (likely), Secondary | PDF, Excel, CSV |
| **HDFC** | `HDFC` | Secondary | PDF, Excel |
| **ICICI** | `ICIC` | Secondary | PDF, CSV, Excel |
| **Axis** | `UTIB` | Secondary | CSV, PDF |
| **Kotak** | `KKBK` | Secondary | CSV, PDF |
| **PNB** | `PUNB` | Secondary | PDF, TXT |
| **Canara** | `CNRB` | Secondary | PDF, Excel |
| **Bank of Maharashtra** | `MAHB` | Secondary | PDF |
| **Federal Bank** | `FDRL` | Secondary | PDF, Excel |
| **IDBI** | `IDBI` | Secondary | PDF |
| **IndusInd** | `INDB` | Secondary | PDF |
| **Yes Bank** | `YESB` | Secondary | PDF |
| **IDFC First** | `IDFB` | Secondary | PDF |
| **Bank of India** | `BKID` | Secondary | PDF |
| **Union Bank** | `UBIN` | Secondary | PDF |
| **UCO Bank** | `UCBA` | Secondary | PDF |
| **Kerala Gramin Bank** | (custom) | Secondary | TXT |
| **Unknown** | — | Primary dataset | PDF |

**Minimum viable bank coverage:** SBI, HDFC, ICICI, Axis, Kotak, PNB, Canara, Federal Bank (8 banks cover ~80% of Indian banking).

---

## 3. Layout Inventory

### Layout A: Digital PDF with Tables (Easiest)
- **Description:** PDF generated from banking software, text layer present, tables extractable via pdfplumber
- **Example:** Bank-generated PDFs like `BOM_Statement_FTP_*`, SOA PDFs
- **Extraction method:** pdfplumber `extract_text()` + `extract_tables()`
- **Expected success rate:** 90%+

### Layout B: Digital PDF without Clean Tables
- **Description:** PDF with text but tables are visual (no extractable table structure)
- **Example:** Many bank statement PDFs where the table is rendered as lines/graphics
- **Extraction method:** Text extraction + regex-based parsing
- **Expected success rate:** 70%

### Layout C: Scanned PDF
- **Description:** Image-based PDF, no text layer
- **Example:** Scanned paper statements
- **Extraction method:** PaddleOCR (pdf2image → OCR per page)
- **Expected success rate:** 60-80% (depends on scan quality)

### Layout D: Excel with Metadata Header
- **Description:** Excel file with 10-20 rows of account metadata before the transaction table
- **Example:** Federal Bank (`42618891001229 STATEMENT IN EXCEL.xlsx`), SBI (`3277373660.xlsx`)
- **Extraction method:** Header row detection (keyword density scan), then standard Excel read
- **Expected success rate:** 85%

### Layout E: Excel/CSV with Clean Headers
- **Description:** First row or near-first row contains clean column headers
- **Example:** ICICI CSV (`ICORE_STMT_*`), most secondary CSVs
- **Extraction method:** pandas `read_csv`/`read_excel` with auto-detect
- **Expected success rate:** 95%

### Layout F: Fixed-Width Text
- **Description:** Plain text file with fixed-width columns
- **Example:** `NITIN stat.txt` (Kerala Gramin Bank), `shivlal statement.txt` (PNB)
- **Extraction method:** Custom fixed-width parser or regex column detection
- **Expected success rate:** 50% (current system has no fixed-width support)

### Layout G: Tab-Delimited Text/CSV
- **Description:** Files using tab delimiter instead of comma
- **Example:** `25078124219247-YASH DUBEY.csv`, `79895082327702-ARJUN SHAILESHBHA.csv`
- **Extraction method:** pandas with `sep='\t'`
- **Expected success rate:** 90% (if delimiter detected correctly)

### Layout H: Multi-Page PDF with Repeated Headers
- **Description:** PDF where each page repeats the table header
- **Example:** PNB statements, many printed bank statements
- **Extraction method:** Page-by-page extraction with header deduplication
- **Expected success rate:** 65%

---

## 4. Extraction Challenges

### Challenge 1: Header Row Detection
**Problem:** Transaction table header position varies wildly.
- Line 1: ICICI CSV
- Line 2: Kotak/IDFC CSVs
- Line 7-10: Axis CSV
- Line 16-18: Federal Bank Excel, Kerala Gramin TXT
- Line 72+: PNB TXT (multi-page)

**Current solution:** Keyword density scan (window=8, threshold=5 hits).
**Gap:** Fixed-width TXT files have no keyword-dense header row. Multi-page formats repeat headers.

### Challenge 2: Delimiter Detection
**Problem:** Files use comma, tab, fixed-width, or Excel formatting.
- CSV files may use comma OR tab
- TXT files use fixed-width (no delimiter)
- Excel files have merged cells

**Current solution:** `pd.read_csv` for CSV (assumes comma), `pd.read_excel` for Excel.
**Gap:** Tab-delimited CSVs parsed as comma-delimited → entire row in one column. Fixed-width TXT not handled.

### Challenge 3: Date Format Variance
**Problem:** At least 5 date formats observed:

| Format | Example | Seen In |
|--------|---------|---------|
| `DD-MM-YYYY` | `15-02-2025` | Axis CSV, Kotak CSV, PNB TXT |
| `DD-MM-YY` | `23-04-25` | Kerala Gramin TXT |
| `DD-Mon-YY` | `12-Oct-24` | SBI Excel, Federal Bank Excel |
| `DD/MM/YYYY` | `01/05/2025` | Common in PDFs |
| `DDMMMYYYY:HH:MM:SS` | `22AUG2024:11:00:22` | ICICI CSV (posting date) |
| `Mon DD, YYYY` | `Jan 15, 2024` | Some PDFs |

**Current solution:** `dateutil.parser.parse(fuzzy=True)` — permissive but ambiguous for DD/MM vs MM/DD.
**Gap:** 2-digit years, month abbreviations, and Indian date-first conventions not reliably handled.

### Challenge 4: Amount Format Variance
**Problem:**

| Format | Example | Seen In |
|--------|---------|---------|
| Plain decimal | `1500.00` | Most CSVs |
| Indian lakh commas | `1,50,212.00` | PNB TXT |
| With currency prefix | `₹1,500.00` | Some PDFs |
| With Cr/Dr suffix | `500.00Cr` | Balance columns |
| Parenthesized negative | `(500.00)` | Some statements |
| Separate DR/CR columns | DR: `500.00`, CR: blank | All datasets |

**Current solution:** Strip `₹`, `INR`, `Rs`, commas → `float()`.
**Gap:** No parenthesized negative support. No `Cr`/`Dr` suffix handling. No `Lakhs` abbreviation support.

### Challenge 5: Debit/Credit Determination
**Problem:** No single standard for indicating debit vs credit.

| Method | Example | Seen In |
|--------|---------|---------|
| Separate columns | DR: 500, CR: — | Axis, Kotak, ICICI |
| Single signed amount | -500 or 500 | Some PDFs |
| Dr/Cr column | `D` or `C` | SBI Excel |
| Balance direction | Balance decreases = debit | Calculated |
| Narration keyword | `WDR` = debit, `CHEQUE` = debit | PNB TXT |

**Current solution:** In standardizer, if `debit` column present → DEBIT, if `credit` column present → CREDIT.
**Gap:** Only first amount captured. Both debit AND credit columns present but mutually exclusive → works. Both columns present AND both filled → credit lost.

### Challenge 6: Narration/Description Parsing
**Problem:** Narration format varies dramatically.

| Bank | Format | Example |
|------|--------|---------|
| Axis | `TYPE/REF/BANKCODE/SEQUENCE/DATE/LOCATION` | `ATM-CASH-AXIS/AECN35520/342/290425/LUCKNOW` |
| Kotak | `TYPE:ACTION:REF/Name/Bank/Notes` | `UPI:REC:426036781143/NIDHI PILLAI/Kotak` |
| ICICI | Free text with embedded refs | `NEFT-N235243219445903-VAISH-PAY-501007...` |
| PNB | Space-delimited: `TYPE REF LOCATION` | `ATM WDR 2322 PNB \PNB SHASTRI NAGAR\JODHP` |
| Kerala Gramin | `TYPE/REF/Dr_or_Cr/NAME/BANKCODE/VPA` | `UPI/511363494693/Cr/SHREYA/SBIN/divakaranvembil` |
| SBI | `CASA:description` | `CASA:Payment received via UPI from VPA ...` |

**Current solution:** Substring keyword matching (UPI, IMPS, NEFT, RTGS, ATM, CHEQUE, CASH, SALARY, EMI).
**Gap:** Platform and UPI ID extraction stubs (always `None`). No structured narration parsing per bank.

### Challenge 7: Metadata Extraction
**Problem:** Account number, IFSC, holder name, statement period, balances appear in different positions.

| Source | Metadata location |
|--------|-------------------|
| PDF | Header region (first 20% of page 1) |
| Excel | Rows 1-17 before header row |
| CSV | Sometimes in filename, sometimes in first rows |
| TXT | First 15-20 lines |

**Current solution:** `MetadataExtractor` regex for account number and IFSC — but **never called** in the pipeline.
**Gap:** Metadata extraction is dead code. No holder name extraction. No statement period extraction. No balance extraction.

### Challenge 8: Scanned PDF Handling
**Problem:** Some PDFs are image-based with no text layer.
- Requires OCR (PaddleOCR)
- Current `ScannedPDFParser` writes temp files without cleanup
- Temp file names collide on concurrent requests
- OCR output format (`list[dict]` with bbox) incompatible with understanding engine (`list[str]`)

**Current solution:** `pdfplumber` → if no text → `ScannedPDFParser` → PaddleOCR.
**Gap:** Temp file leak, concurrency issues, output format mismatch.

---

## 5. Generalization Requirements

### R1: Universal Delimiter Detection
- Auto-detect comma vs tab vs fixed-width
- For CSV: try `pd.read_csv(sep=None)` with `engine='python'` to auto-detect
- For TXT: implement fixed-width column detection

### R2: Robust Header Row Detection
- Extend keyword list to include bank-specific terms
- Support multi-page headers (deduplication)
- Handle Excel files with metadata rows before header

### R3: Comprehensive Date Normalizer
- Support all observed formats: `DD-MM-YYYY`, `DD-MM-YY`, `DD-Mon-YY`, `DD/MM/YYYY`, `YYYY-MM-DD`
- Indian date-first convention (day before month)
- Handle 2-digit years (assume 2000s)
- Reject unparseable dates explicitly

### R4: Amount Normalizer v2
- Handle Indian lakh commas: `1,50,212.00` → `150212.00`
- Handle `Cr`/`Dr` suffix on balance
- Handle parenthesized negatives: `(500.00)` → `-500.00`
- Handle currency symbols: `₹`, `Rs.`, `INR`
- Preserve debit/credit distinction from separate columns

### R5: Debit/Credit Intelligence
- Use column semantics (DR/CR column names) when available
- Fall back to balance direction when columns absent
- Support both separate-columns and single-amount formats
- Preserve BOTH debit and credit amounts when both present

### R6: Statement Profile System
- Per-bank extraction configuration
- Extensible registry
- Generic fallback for unknown banks
- See `STATEMENT_PROFILE_DESIGN.md`

### R7: Metadata Extraction Pipeline
- Account number, IFSC, holder name, statement period, opening/closing balance
- Bank-specific patterns + generic regex fallback
- Feed into PostgreSQL `statements` metadata columns

### R8: Temp File Safety
- Use `tempfile.NamedTemporaryFile` with `delete=True`
- Or write to unique temp directory per request
- Clean up after OCR completes

---

## 6. Processing Priority Order

Based on volume and complexity:

| Priority | Format | Count | Difficulty | Strategy |
|----------|--------|-------|------------|----------|
| 1 | CSV (comma/tab) | ~15 | Easy | Auto-detect delimiter, standard header mapping |
| 2 | Excel (.xlsx/.xls) | ~40 | Medium | Header row detection, metadata extraction |
| 3 | Digital PDF (text layer) | ~60 | Medium | pdfplumber + table detection |
| 4 | PDF with tables | ~25 | Medium | pdfplumber extract_tables |
| 5 | Scanned PDF | ~20 | Hard | OCR + table reconstruction |
| 6 | Fixed-width TXT | ~4 | Hard | Custom column detection |
| 7 | Multi-page PDF | ~15 | Hard | Page-by-page + header dedup |

**Target:** Process priorities 1-4 first (covers ~80% of dataset). Then tackle 5-7.
