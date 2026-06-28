# Bank of Maharashtra Statement Investigation

This document presents the findings of our investigation into the layout extraction of Bank of Maharashtra (BOM) statements (`BOM_Statement_FTP_*.pdf`).

---

## 1. Files Checked
* `BOM_Statement_FTP_01701_xxxxxxxx1206_20250327_20251127_20251127122714.pdf` (2 pages)
* `BOM_Statement_FTP_02107_xxxxxxxx7596_20240812_20250801_20250801012337.pdf` (14 pages)
* `BOM_Statement_FTP_02107_xxxxxxxx7596_20250812_20250811_20251112013551.pdf` (1 page)
* `BOM_Statement_FTP_02772_xxxxxxxx8123_20250514_20251127_20251127115931.pdf` (11 pages)

---

## 2. Root Cause of "No transactions extracted by primary provider" Warning
The primary error warning `No transactions extracted by primary provider` only occurred on one specific statement:
* `BOM_Statement_FTP_02107_xxxxxxxx7596_20250812_20250811_20251112013551.pdf`

Our direct PyMuPDF layout analysis revealed the root cause:
1. **Empty Statement period**: This PDF document is a 1-page statement that contains **no financial transactions**.
2. **Text Indicator**: The transactions table contains a single text row: `['No Transactions in this Period', None, None, None, None, None, None, None]`.
3. **Behavior**: PyMuPDF's native `find_tables()` correctly identified the table layout. However, because there were no transaction entries, the `CanonicalMapper` parsed zero transactions. The orchestrator detected zero transactions and correctly fell back to the legacy scanned pipeline to double-check. 

All other three BOM statements processed natively and successfully, yielding:
* **BOM Statement 1**: 36 transactions natively extracted.
* **BOM Statement 2**: 575 transactions natively extracted.
* **BOM Statement 4**: 470 transactions natively extracted.

---

## 3. PyMuPDF Native Table Extraction Capabilities
* **Yes, PyMuPDF can handle this layout perfectly.** 
* PyMuPDF's `find_tables()` isolates the transaction grids (containing columns: `Sr No`, `Date`, `Particulars`, `Cheque/Reference No`, `Debit`, `Credit`, `Balance`, `Channel`) cleanly and accurately on all pages. 
* Spans are fully retained, narrations are correctly split, and numbers are correctly mapped.

---

## 4. Alternate Solutions & AI layout understanding
* **Is `pymupdf_layout` required?**
  No. Since the native PyMuPDF table finder already correctly isolates the tabular grid, `pymupdf_layout` is not necessary.
* **Is `PP-StructureV3` required?**
  No. Loading massive multi-modal deep learning models like `PP-StructureV3` is not necessary for these documents since they are digitally generated PDFs with clean metadata and vector paths. Native PyMuPDF handles them in fraction of a second (under 3 seconds per file).
