# Backend 2.2 - Environment Setup & Execution Guide

This document describes the setup steps, execution commands, and common troubleshooting solutions for the **Backend 2.2 Hybrid Financial Document Intelligence Engine**.

---

## 1. Environment Setup

To run the Backend 2.2 statement intelligence engine in a clean, reproducible virtual environment, execute the following commands.

### Option A: standard Python venv (Recommended)
1. **Create Virtual Environment**:
   ```bash
   python -m venv venv
   ```
2. **Activate Environment**:
   * **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   * **Windows (CMD)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   * **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```
3. **Install Dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements-backend-2.2.txt
   ```

### Option B: Conda Environment Setup
1. **Create Conda Environment**:
   ```bash
   conda create -n finintel python=3.10 -y
   ```
2. **Activate Environment**:
   ```bash
   conda activate finintel
   ```
3. **Install Dependencies**:
   ```bash
   pip install -r requirements-backend-2.2.txt
   ```

---

## 2. CLI Execution Commands

We provide a unified CLI tool for statement processing, extraction, validation, and terminal inspection:

### Process a Single File (PDF, Excel, or TXT)
Extracts and standardizes the document, persisting JSON and Parquet outputs:
```bash
python scripts/process_statement.py --input datasets/bank-statements/Bank-statements-dataset/primary/00869354051.pdf
```

### Process an Entire Directory
Scans the directory for all supported files and standardizes them:
```bash
python scripts/process_statement.py --input datasets/bank-statements/Bank-statements-dataset/primary/ --dir
```

### Inspect Output on Terminal
Prints a formatted summary of metadata, validation results, and first 10 transactions in terminal:
```bash
python scripts/process_statement.py --inspect 00869354051
```

### Run the Dataset Validation Benchmark
Runs the parser across the full validation dataset and outputs `benchmark_report.json`:
```bash
python scripts/run_backend22_benchmark.py
```

---

## 3. Standardized Output Structure

When you process a statement, its parsed representation is stored in:
`artifacts/standardized/<document_name>/`

* **`metadata.json`**: Standard account metadata (IFSC, Bank Name, Account Holder/No, Balances).
* **`transactions.json`**: Normalized transaction list.
* **`validation.json`**: Warnings and final confidence scores from the validation layer.
* **`transactions.parquet`**: Columnar binary format optimized for rapid tabular queries.

---

## 4. Troubleshooting Guide

### Issue 1: `ImportError: PyArrow or FastParquet is required for Parquet support`
* **Cause**: Parquet file writing requires pyarrow.
* **Solution**: Run `pip install pyarrow`.

### Issue 2: `RequestsDependencyWarning: urllib3 ... doesn't match a supported version!`
* **Cause**: Minor dependency warning between requests and urllib3.
* **Solution**: Safe to ignore. If you want to quiet it down, run `pip install --upgrade urllib3 requests`.

### Issue 3: OCR Engine CPU initialization delay on secondary files
* **Cause**: Scanned/unstructured secondary files trigger a fallback to `LegacyProvider` which initializes PaddleOCR deep learning networks (e.g. PP-OCRv6) on the CPU.
* **Solution**: The first execution of a scanned statement will take a few seconds to load models into memory. Subsequent pages or documents will run faster. No action required.
