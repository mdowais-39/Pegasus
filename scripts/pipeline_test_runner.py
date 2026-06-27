"""
FinIntel AI — Pipeline Test Runner
Processes all bank statements through the extraction -> standardization -> validation pipeline.
Generates per-file results and aggregate DATASET_TEST_REPORT.md.
"""

import os
import sys
import json
import time
import traceback
import importlib.util
import builtins
from pathlib import Path
from datetime import datetime
from collections import defaultdict

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ML_DIR = PROJECT_ROOT / "ml-services"
OCR_DIR = ML_DIR / "ocr"
STANDARDIZE_DIR = ML_DIR / "standardize"
VALIDATION_DIR = ML_DIR / "validation"
DATASETS_DIR = PROJECT_ROOT / "datasets" / "bank-statements" / "Bank-statements-dataset"
RESULTS_DIR = PROJECT_ROOT / "datasets" / "processed" / "test_results"


def load_module_from_path(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def setup_ocr_services():
    """Register OCR services under 'services' namespace, respecting dependency order."""
    pkg = type(sys)('services')
    pkg.__path__ = [str(OCR_DIR / "services")]
    sys.modules['services'] = pkg

    # Create a stub for ocr_service so parsers can import it without triggering paddleocr
    ocr_stub = type(sys)('services.ocr_service')
    ocr_stub.OCRService = None  # Will be replaced if OCR actually needed
    sys.modules['services.ocr_service'] = ocr_stub

    # Load parsers (depend on services.ocr_service stub)
    parsers_pkg = type(sys)('parsers')
    parsers_pkg.__path__ = [str(OCR_DIR / "parsers")]
    sys.modules['parsers'] = parsers_pkg

    ocr_pkg = type(sys)('ocr')
    ocr_pkg.__path__ = [str(OCR_DIR)]
    sys.modules['ocr'] = ocr_pkg

    for py_file in (OCR_DIR / "parsers").glob("*.py"):
        if py_file.name.startswith("_"):
            continue
        load_module_from_path(f"parsers.{py_file.stem}", py_file)

    # Only load OCR services that DON'T depend on paddleocr
    safe_services = {"extraction_service", "header_detector", "metadata_extractor",
                     "row_extractor", "row_grouper", "statement_understanding",
                     "table_detector", "table_reconstructor", "transaction_builder",
                     "transaction_merger", "transaction_normalizer", "transaction_reconstructor"}
    for py_file in (OCR_DIR / "services").glob("*.py"):
        if py_file.name.startswith("_") or py_file.stem == "ocr_service":
            continue
        if py_file.stem in safe_services:
            mod_name = f"services.{py_file.stem}"
            if mod_name not in sys.modules:
                load_module_from_path(mod_name, py_file)


def setup_standardize():
    """Register standardize modules. Patches 'services' and 'models' imports."""
    # Ensure 'models' package exists before loading anything that imports from it
    if 'models' not in sys.modules:
        models_pkg = type(sys)('models')
        models_pkg.__path__ = [str(STANDARDIZE_DIR / "models"), str(VALIDATION_DIR / "models")]
        sys.modules['models'] = models_pkg
    else:
        models_pkg = sys.modules['models']
        if not hasattr(models_pkg, '__path__'):
            models_pkg.__path__ = [str(STANDARDIZE_DIR / "models"), str(VALIDATION_DIR / "models")]
        for p in [str(STANDARDIZE_DIR / "models"), str(VALIDATION_DIR / "models")]:
            if p not in models_pkg.__path__:
                models_pkg.__path__.append(p)

    # Load model modules FIRST so services can import them
    for d in [STANDARDIZE_DIR / "models", VALIDATION_DIR / "models"]:
        for py_file in d.glob("*.py"):
            if py_file.name.startswith("_"):
                continue
            mod_name = f"models.{py_file.stem}"
            if mod_name not in sys.modules:
                load_module_from_path(mod_name, py_file)

    # Ensure 'services' package has standardize and validation paths
    if 'services' not in sys.modules:
        pkg = type(sys)('services')
        pkg.__path__ = [str(OCR_DIR / "services"), str(STANDARDIZE_DIR / "services"), str(VALIDATION_DIR / "services")]
        sys.modules['services'] = pkg
    else:
        svc_pkg = sys.modules['services']
        if not hasattr(svc_pkg, '__path__'):
            svc_pkg.__path__ = [str(OCR_DIR / "services")]
        for p in [str(STANDARDIZE_DIR / "services"), str(VALIDATION_DIR / "services")]:
            if p not in svc_pkg.__path__:
                svc_pkg.__path__.append(p)

    # Load standardize service modules
    for py_file in (STANDARDIZE_DIR / "services").glob("*.py"):
        if py_file.name.startswith("_"):
            continue
        mod_name = f"services.{py_file.stem}"
        if mod_name not in sys.modules:
            load_module_from_path(mod_name, py_file)

    # Load validation service modules
    for py_file in (VALIDATION_DIR / "services").glob("*.py"):
        if py_file.name.startswith("_"):
            continue
        mod_name = f"services.{py_file.stem}"
        if mod_name not in sys.modules:
            load_module_from_path(mod_name, py_file)

    # Also load under prefixed namespaces for direct access
    std_svc = type(sys)('std_services')
    std_svc.__path__ = [str(STANDARDIZE_DIR / "services")]
    sys.modules['std_services'] = std_svc
    val_svc = type(sys)('val_services')
    val_svc.__path__ = [str(VALIDATION_DIR / "services")]
    sys.modules['val_services'] = val_svc


# ---- Module Setup ----
setup_ocr_services()

# Now setup standardize and validation (extends 'services' and 'models')
setup_standardize()

# Import key classes
ParserRegistry = sys.modules['parsers.parser_registry'].ParserRegistry
StandardizationService = sys.modules['services.standardization_service'].StandardizationService
ValidationService = sys.modules['services.validation_service'].ValidationService
map_columns = sys.modules['services.header_mapper'].map_columns


# ---- Bank Detection ----

def detect_bank_from_filename(file_path: str) -> str:
    fn = os.path.basename(file_path).upper()
    ifsc_checks = {
        "SBIN": "SBI", "HDFC": "HDFC", "ICIC": "ICICI",
        "UTIB": "Axis", "KKBK": "Kotak", "PUNB": "PNB",
        "CNRB": "Canara", "MAHB": "Bank of Maharashtra",
        "IDBI": "IDBI", "INDB": "IndusInd", "YESB": "Yes Bank",
        "FDRL": "Federal Bank", "IDFB": "IDFC First",
        "BKID": "Bank of India", "UBIN": "Union Bank",
        "UCBA": "UCO Bank", "BPSM": "Bank of Baroda",
    }
    for prefix, bank in ifsc_checks.items():
        if prefix in fn:
            return bank
    name_checks = {
        "SBI": "SBI", "HDFC": "HDFC", "ICICI": "ICICI",
        "AXIS": "Axis", "KOTAK": "Kotak", "PNB": "PNB",
        "CANARA": "Canara", "BOM": "Bank of Maharashtra",
        "INDUSIND": "IndusInd", "FEDERAL": "Federal Bank",
        "IDFC": "IDFC First", "UNION": "Union Bank",
        "UCO": "UCO Bank",
    }
    for kw, bank in name_checks.items():
        if kw in fn:
            return bank
    return "Unknown"


def get_format(fpath: str) -> str:
    ext = Path(fpath).suffix.lower()
    return {".pdf": "PDF", ".csv": "CSV", ".xlsx": "Excel",
            ".xls": "Excel", ".txt": "Text", ".docx": "DOCX"}.get(ext, "Unknown")


def discover_files(base_dir: Path) -> list[dict]:
    files = []
    skip = {"generate_inventory.py", "generate_inventory_v2.py", "pipeline_test_runner.py"}
    for dirpath, _, filenames in os.walk(base_dir):
        for fname in filenames:
            if fname.startswith(".") or fname.endswith((".py", ".zip")):
                continue
            if fname in skip:
                continue
            fpath = os.path.join(dirpath, fname)
            rel = os.path.relpath(fpath, base_dir)
            part = "primary" if "primary" in dirpath.lower() else "secondary"
            files.append({
                "path": fpath, "filename": fname,
                "relative_path": rel, "dataset": part,
                "format": get_format(fpath),
            })
    return files


# ---- Pipeline Functions ----

def try_fallback_csv_excel(file_path: str) -> list[dict] | None:
    """For PDF text that looks delimited, try CSV/Excel parsing as fallback."""
    import pandas as pd
    ext = Path(file_path).suffix.lower()

    if ext in (".csv", ".txt"):
        for sep in [",", "\t", ";", "|"]:
            try:
                df = pd.read_csv(file_path, sep=sep, dtype=str, on_bad_lines="skip")
                if len(df.columns) >= 3:
                    df = df.fillna("")
                    return df.to_dict(orient="records")
            except Exception:
                continue
        try:
            df = pd.read_csv(file_path, sep=None, engine="python", dtype=str, on_bad_lines="skip")
            if len(df.columns) >= 3:
                df = df.fillna("")
                return df.to_dict(orient="records")
        except Exception:
            pass

    elif ext in (".xlsx", ".xls"):
        try:
            df = pd.read_excel(file_path, dtype=str, header=None)
            df = df.fillna("")
            keywords = {
                "DATE", "NARRATION", "DEBIT", "CREDIT", "BALANCE",
                "DESCRIPTION", "VALUE DATE", "CHEQUE", "REFERENCE",
                "WITHDRAWAL", "DEPOSIT", "PARTICULARS", "TXN DATE",
                "TRANSACTION", "TRAN-DATE", "TRAN_DATE", "DR", "CR",
                "PARTICULAR", "AC_NO", "TRN", "BAL",
                "COD_DRCR", "AMT_TXN_LCY", "TXT_TXN_DESC",
            }
            header_row = -1
            for i in range(min(30, len(df))):
                row_vals = [str(v).upper().strip() for v in df.iloc[i] if pd.notna(v)]
                matches = sum(1 for v in row_vals if any(k in v for k in keywords))
                if matches >= 3:
                    header_row = i
                    break
            if header_row >= 0:
                headers = [str(v).strip() for v in df.iloc[header_row] if pd.notna(v) and str(v).strip()]
                data_df = df.iloc[header_row + 1:].copy()
                if len(data_df.columns) > len(headers):
                    data_df.columns = headers + [f"_extra_{i}" for i in range(len(data_df.columns) - len(headers))]
                else:
                    data_df.columns = headers[:len(data_df.columns)]
                data_df = data_df.fillna("")
                return data_df.to_dict(orient="records")
        except Exception:
            pass

    return None


def parse_text_lines_to_rows(text_lines: list[dict]) -> list[dict]:
    """Try to parse text-only rows into structured dicts by detecting date+amount patterns."""
    import re
    date_patterns = [
        r'\d{2}/\d{2}/\d{2,4}',  # DD/MM/YY
        r'\d{2}-\d{2}-\d{2,4}',  # DD-MM-YY
        r'\d{4}-\d{2}-\d{2}',    # YYYY-MM-DD
    ]
    amount_patterns = [
        r'[\d,]+\.\d{2}\s*(?:Cr|Dr)?',
        r'[\d,]+\.\d{2}',
    ]
    combined = ' '.join(date_patterns)
    amount_re = '|'.join(amount_patterns)

    transactions = []
    pending_narration = ""

    for item in text_lines:
        line = item.get("text", "").strip()
        if not line:
            continue

        has_date = any(re.search(p, line) for p in date_patterns)
        has_amount = bool(re.search(amount_re, line))

        if has_date and has_amount:
            # This is a data line - try to extract fields
            dates = re.findall(r'\d{2}/\d{2}/\d{2,4}', line)
            amounts = re.findall(r'[\d,]+\.\d{2}', line)

            # Check for Cr/Dr suffix
            balance_str = None
            if amounts:
                # Last amount is usually balance
                if 'Cr' in line.split(amounts[-1])[-1][:5]:
                    balance_str = amounts[-1] + 'Cr'
                elif 'Dr' in line.split(amounts[-1])[-1][:5]:
                    balance_str = amounts[-1] + 'Dr'
                else:
                    balance_str = amounts[-1]

            # Try to find debit/credit amounts
            debit_val = None
            credit_val = None
            balance_val = None

            if len(amounts) >= 3:
                # Pattern: narration_details amount balance
                amount_val = amounts[-2] if len(amounts) >= 3 else amounts[0]
                balance_val = amounts[-1]
                # Determine debit/credit from Cr/Dr
                post_balance = line[line.index(balance_val):]
                if 'Cr' in post_balance[:10]:
                    credit_val = amount_val
                elif 'Dr' in post_balance[:10]:
                    debit_val = amount_val
                else:
                    credit_val = amount_val
            elif len(amounts) == 2:
                amount_val = amounts[0]
                balance_val = amounts[1]
                credit_val = amount_val
            elif len(amounts) == 1:
                amount_val = amounts[0]

            row = {
                "Date": dates[0] if dates else "",
                "Narration": pending_narration or "",
                "Debit": debit_val or "",
                "Credit": credit_val or "",
                "Balance": balance_val or "",
            }
            transactions.append(row)
            pending_narration = ""
        else:
            # This might be a narration/description line
            if not any(skip in line.upper() for skip in [
                "STATEMENT", "ACCOUNT", "BRANCH", "PAGE", "REGISTERED",
                "CUSTOMER ID", "PRODUCT", "EMAIL", "PHONE", "OD LIMIT",
                "UNCLEAR", "JOINT HOLDER", "S/O", "NAME", "TRANS DATE",
                "TIME", "TRANSACTION DETAILS", "CHEQUE", "---", "==="
            ]):
                pending_narration = line if not pending_narration else pending_narration + " " + line

    return transactions


def prepare_rows(rows: list, source_type: str) -> list[dict]:
    """Convert parser output to list[dict] for standardization."""
    if not rows:
        return []
    if source_type in ("csv", "excel"):
        return rows
    if isinstance(rows[0], dict):
        return rows
    if isinstance(rows[0], str):
        result = []
        for page_text in rows:
            for line in page_text.split("\n"):
                line = line.strip()
                if line:
                    result.append({"text": line})
        return result
    return []


def try_fallback_csv_excel(file_path: str) -> list[dict] | None:
    """For PDF text that looks delimited, try CSV/Excel parsing as fallback."""
    import pandas as pd
    ext = Path(file_path).suffix.lower()

    if ext in (".csv", ".txt"):
        for sep in [",", "\t", ";", "|"]:
            try:
                df = pd.read_csv(file_path, sep=sep, dtype=str, on_bad_lines="skip")
                if len(df.columns) >= 3:
                    df = df.fillna("")
                    return df.to_dict(orient="records")
            except Exception:
                continue
        try:
            df = pd.read_csv(file_path, sep=None, engine="python", dtype=str, on_bad_lines="skip")
            if len(df.columns) >= 3:
                df = df.fillna("")
                return df.to_dict(orient="records")
        except Exception:
            pass

    elif ext in (".xlsx", ".xls"):
        try:
            df = pd.read_excel(file_path, dtype=str, header=None)
            df = df.fillna("")
            keywords = {
                "DATE", "NARRATION", "DEBIT", "CREDIT", "BALANCE",
                "DESCRIPTION", "VALUE DATE", "CHEQUE", "REFERENCE",
                "WITHDRAWAL", "DEPOSIT", "PARTICULARS", "TXN DATE",
                "TRANSACTION", "TRAN-DATE", "TRAN_DATE", "DR", "CR",
                "PARTICULAR", "AC_NO", "TRN", "BAL",
                "COD_DRCR", "AMT_TXN_LCY", "TXT_TXN_DESC",
            }
            header_row = -1
            for i in range(min(30, len(df))):
                row_vals = [str(v).upper().strip() for v in df.iloc[i] if pd.notna(v)]
                matches = sum(1 for v in row_vals if any(k in v for k in keywords))
                if matches >= 3:
                    header_row = i
                    break
            if header_row >= 0:
                headers = [str(v).strip() for v in df.iloc[header_row] if pd.notna(v) and str(v).strip()]
                data_df = df.iloc[header_row + 1:].copy()
                if len(data_df.columns) > len(headers):
                    data_df.columns = headers + [f"_extra_{i}" for i in range(len(data_df.columns) - len(headers))]
                else:
                    data_df.columns = headers[:len(data_df.columns)]
                data_df = data_df.fillna("")
                return data_df.to_dict(orient="records")
        except Exception:
            pass

    return None


def test_parse(file_info: dict) -> dict:
    result = {
        "ocr_success": False, "ocr_method": None,
        "row_count": 0, "error": None,
    }
    try:
        registry = ParserRegistry()
        parsed = registry.get_parser(file_info["path"]).parse(file_info["path"])
        result["ocr_method"] = parsed.get("source_type", "unknown")

        if parsed.get("source_type") == "pdf" and parsed.get("ocr_required", False):
            result["error"] = "Scanned PDF - OCR required but skipped for performance"
            return result

        rows = parsed.get("rows", [])
        result["row_count"] = len(rows)
        result["ocr_success"] = len(rows) > 0
        result["raw_rows"] = rows
    except Exception as e:
        result["error"] = f"Parse failed: {e}"
    return result


def test_standardize(file_info: dict, parse_result: dict) -> dict:
    result = {
        "transaction_count_raw": parse_result.get("row_count", 0),
        "transaction_count_standardized": 0,
        "header_detection": None,
        "standardization_score": {},
        "error": None,
    }

    rows = parse_result.get("raw_rows", [])
    if not rows:
        result["error"] = "No rows to standardize"
        return result

    prepared = prepare_rows(rows, parse_result.get("ocr_method", ""))

    # For OCR text, try text-to-structured parsing
    if prepared and len(prepared) > 0 and isinstance(prepared[0], dict):
        keys = list(prepared[0].keys())
        if keys == ["text"]:
            # Try parsing text lines into structured rows
            parsed = parse_text_lines_to_rows(prepared)
            if parsed and len(parsed) > 0:
                prepared = parsed
            else:
                result["error"] = "OCR text rows only - not structured data"
                return result

    # Try fallback CSV/Excel for PDF text
    fallback = try_fallback_csv_excel(file_info["path"])
    if fallback and len(fallback) > len(prepared):
        prepared = fallback

    if not prepared:
        result["error"] = "No structured data extracted"
        return result

    try:
        headers = list(prepared[0].keys())
        mapping = map_columns(headers)
        result["header_detection"] = {
            "headers_found": headers[:10],
            "mapped_fields": list(mapping.values()),
            "mapping_count": len(mapping),
        }
        if not mapping:
            result["error"] = f"No columns mapped from: {headers[:5]}"
            return result
    except Exception as e:
        result["error"] = f"Header detection failed: {e}"
        return result

    try:
        service = StandardizationService()
        standardized = service.process(prepared)
        result["transaction_count_standardized"] = len(standardized)

        total = len(standardized)
        result["standardization_score"] = {
            "total": total,
            "date_parsed": sum(1 for t in standardized if t.date is not None),
            "amount_parsed": sum(1 for t in standardized if t.amount is not None),
            "debit_credit_determined": sum(1 for t in standardized if t.debit_credit is not None),
            "narration_classified": sum(1 for t in standardized if t.txn_type and t.txn_type != "UNCLASSIFIED"),
            "balance_parsed": sum(1 for t in standardized if t.balance is not None),
        }
    except Exception as e:
        result["error"] = f"Standardization failed: {e}"

    return result


def test_validate(standardized: list) -> dict:
    result = {"transaction_count_validated": 0, "validation_score": {}, "error": None}
    if not standardized:
        result["error"] = "No transactions to validate"
        return result
    try:
        txns = []
        for t in standardized:
            d = t.model_dump()
            clean = {k: v for k, v in d.items() if v is not None}
            txns.append(clean)
        service = ValidationService()
        validated = service.process(txns)
        result["transaction_count_validated"] = len(validated)
        total = len(validated)
        result["validation_score"] = {
            "total": total,
            "is_valid": sum(1 for t in validated if t.is_valid),
            "is_duplicate": sum(1 for t in validated if t.is_duplicate),
            "is_failed": sum(1 for t in validated if t.is_failed),
        }
    except Exception as e:
        result["error"] = f"Validation failed: {e}"
    return result


def run_test(file_info: dict) -> dict:
    t0 = time.time()
    r = {
        "file": file_info["filename"],
        "relative_path": file_info["relative_path"],
        "dataset": file_info["dataset"],
        "format": file_info["format"],
        "bank": detect_bank_from_filename(file_info["path"]),
        "status": "PENDING",
        "processing_time_ms": 0,
    }

    pr = test_parse(file_info)
    r.update({
        "ocr_success": pr.get("ocr_success", False),
        "ocr_method": pr.get("ocr_method"),
        "transaction_count_raw": pr.get("row_count", 0),
    })
    if pr.get("error"):
        r["parse_error"] = pr["error"]
    if not pr.get("ocr_success"):
        r["status"] = "PARSE_FAILED"
        r["processing_time_ms"] = int((time.time() - t0) * 1000)
        return r

    sr = test_standardize(file_info, pr)
    r.update({
        "transaction_count_standardized": sr.get("transaction_count_standardized", 0),
        "header_detection": sr.get("header_detection"),
        "standardization_score": sr.get("standardization_score", {}),
    })
    if sr.get("error"):
        r["standardize_error"] = sr["error"]
    if sr.get("transaction_count_standardized", 0) == 0:
        r["status"] = "STANDARDIZE_FAILED"
        r["processing_time_ms"] = int((time.time() - t0) * 1000)
        return r

    try:
        # Re-use the same prepared data from standardize
        rows = pr.get("raw_rows", [])
        prepared = prepare_rows(rows, pr.get("ocr_method", ""))

        # Handle text rows
        if prepared and len(prepared) > 0 and isinstance(prepared[0], dict):
            keys = list(prepared[0].keys())
            if keys == ["text"]:
                prepared = parse_text_lines_to_rows(prepared)

        # Fallback
        fallback = try_fallback_csv_excel(file_info["path"])
        if fallback and len(fallback) > len(prepared):
            prepared = fallback

        if prepared:
            service = StandardizationService()
            standardized = service.process(prepared)
        else:
            standardized = []

        vr = test_validate(standardized)
        r.update({
            "transaction_count_validated": vr.get("transaction_count_validated", 0),
            "validation_score": vr.get("validation_score", {}),
        })
        if vr.get("error"):
            r["validate_error"] = vr["error"]
    except Exception as e:
        r["validate_error"] = f"Validation pipeline error: {e}"

    r["status"] = "SUCCESS" if r.get("transaction_count_validated", 0) > 0 else (
        "PARTIAL_SUCCESS" if r.get("transaction_count_standardized", 0) > 0 else "FAILED"
    )
    r["processing_time_ms"] = int((time.time() - t0) * 1000)
    return r


def generate_report(all_results: list[dict]) -> str:
    total = len(all_results)
    success = sum(1 for r in all_results if r["status"] == "SUCCESS")
    partial = sum(1 for r in all_results if r["status"] == "PARTIAL_SUCCESS")
    parse_failed = sum(1 for r in all_results if r["status"] == "PARSE_FAILED")
    std_failed = sum(1 for r in all_results if r["status"] == "STANDARDIZE_FAILED")
    failed = sum(1 for r in all_results if r["status"] == "FAILED")

    by_bank = defaultdict(lambda: {"total": 0, "success": 0, "partial": 0, "failed": 0})
    for r in all_results:
        b = r.get("bank", "Unknown")
        by_bank[b]["total"] += 1
        if r["status"] == "SUCCESS":
            by_bank[b]["success"] += 1
        elif r["status"] == "PARTIAL_SUCCESS":
            by_bank[b]["partial"] += 1
        else:
            by_bank[b]["failed"] += 1

    by_format = defaultdict(lambda: {"total": 0, "success": 0, "partial": 0, "failed": 0})
    for r in all_results:
        f = r.get("format", "Unknown")
        by_format[f]["total"] += 1
        if r["status"] == "SUCCESS":
            by_format[f]["success"] += 1
        elif r["status"] == "PARTIAL_SUCCESS":
            by_format[f]["partial"] += 1
        else:
            by_format[f]["failed"] += 1

    by_dataset = defaultdict(lambda: {"total": 0, "success": 0, "partial": 0, "failed": 0})
    for r in all_results:
        d = r.get("dataset", "unknown")
        by_dataset[d]["total"] += 1
        if r["status"] == "SUCCESS":
            by_dataset[d]["success"] += 1
        elif r["status"] == "PARTIAL_SUCCESS":
            by_dataset[d]["partial"] += 1
        else:
            by_dataset[d]["failed"] += 1

    total_raw = sum(r.get("transaction_count_raw", 0) for r in all_results)
    total_std = sum(r.get("transaction_count_standardized", 0) for r in all_results)
    total_val = sum(r.get("transaction_count_validated", 0) for r in all_results)
    total_ms = sum(r.get("processing_time_ms", 0) for r in all_results)

    errors = defaultdict(int)
    for r in all_results:
        for key in ("parse_error", "standardize_error", "validate_error"):
            if r.get(key):
                msg = r[key].split(":")[0] if ":" in r[key] else r[key][:80]
                errors[msg] += 1

    L = []
    L.append("# FinIntel AI -- Dataset Test Report\n")
    L.append(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    L.append(f"**Total files processed:** {total}")
    L.append(f"**Total processing time:** {total_ms / 1000:.1f}s\n")
    L.append("---\n")
    L.append("## 1. Summary Dashboard\n")
    L.append("| Metric | Value |")
    L.append("|--------|-------|")
    L.append(f"| Total files | {total} |")
    L.append(f"| SUCCESS | {success} ({success / total * 100:.1f}%) |")
    L.append(f"| PARTIAL_SUCCESS | {partial} ({partial / total * 100:.1f}%) |")
    L.append(f"| PARSE_FAILED | {parse_failed} ({parse_failed / total * 100:.1f}%) |")
    L.append(f"| STANDARDIZE_FAILED | {std_failed} ({std_failed / total * 100:.1f}%) |")
    L.append(f"| FAILED | {failed} ({failed / total * 100:.1f}%) |")
    L.append(f"| Total raw rows extracted | {total_raw} |")
    L.append(f"| Total standardized transactions | {total_std} |")
    L.append(f"| Total validated transactions | {total_val} |")
    L.append(f"\n---\n")
    L.append("## 2. Bank-by-Bank Breakdown\n")
    L.append("| Bank | Total | Success | Partial | Failed | Success Rate |")
    L.append("|------|-------|---------|---------|--------|-------------|")
    for bank in sorted(by_bank, key=lambda b: by_bank[b]["total"], reverse=True):
        d = by_bank[bank]
        rate = d["success"] / d["total"] * 100 if d["total"] else 0
        L.append(f"| {bank} | {d['total']} | {d['success']} | {d['partial']} | {d['failed']} | {rate:.0f}% |")
    L.append(f"\n---\n")
    L.append("## 3. Format-by-Format Breakdown\n")
    L.append("| Format | Total | Success | Partial | Failed | Success Rate |")
    L.append("|--------|-------|---------|---------|--------|-------------|")
    for fmt in sorted(by_format, key=lambda f: by_format[f]["total"], reverse=True):
        d = by_format[fmt]
        rate = d["success"] / d["total"] * 100 if d["total"] else 0
        L.append(f"| {fmt} | {d['total']} | {d['success']} | {d['partial']} | {d['failed']} | {rate:.0f}% |")
    L.append(f"\n---\n")
    L.append("## 4. Dataset Breakdown\n")
    L.append("| Dataset | Total | Success | Partial | Failed | Success Rate |")
    L.append("|---------|-------|---------|---------|--------|-------------|")
    for ds in sorted(by_dataset):
        d = by_dataset[ds]
        rate = d["success"] / d["total"] * 100 if d["total"] else 0
        L.append(f"| {ds} | {d['total']} | {d['success']} | {d['partial']} | {d['failed']} | {rate:.0f}% |")
    L.append(f"\n---\n")
    L.append("## 5. Top Failure Modes\n")
    if errors:
        L.append("| Error | Count |")
        L.append("|-------|-------|")
        for err, cnt in sorted(errors.items(), key=lambda x: x[1], reverse=True)[:15]:
            L.append(f"| {err} | {cnt} |")
    else:
        L.append("No errors recorded.")
    L.append(f"\n---\n")
    L.append("## 6. File-Level Results\n")
    L.append("| File | Dataset | Format | Bank | Status | Raw Rows | Std Txns | Val Txns | Time (ms) |")
    L.append("|------|---------|--------|------|--------|----------|----------|----------|-----------|")
    for r in sorted(all_results, key=lambda x: ({"SUCCESS": 0, "PARTIAL_SUCCESS": 1, "STANDARDIZE_FAILED": 2, "PARSE_FAILED": 3, "FAILED": 4}.get(x["status"], 5), x["file"])):
        L.append(
            f"| {r['file'][:50]} | {r['dataset']} | {r['format']} | "
            f"{r.get('bank', '?')} | {r['status']} | "
            f"{r.get('transaction_count_raw', 0)} | "
            f"{r.get('transaction_count_standardized', 0)} | "
            f"{r.get('transaction_count_validated', 0)} | "
            f"{r.get('processing_time_ms', 0)} |"
        )
    L.append(f"\n---\n")
    L.append("## 7. Recommendations\n")
    if parse_failed > total * 0.2:
        L.append("- **High parse failure rate** -- Review parser coverage for failing formats")
    if std_failed > total * 0.2:
        L.append("- **High standardize failure rate** -- Header detection or column mapping needs improvement")
    for b, d in by_bank.items():
        if d["total"] >= 2 and d["success"] / d["total"] < 0.5:
            L.append(f"- **{b} has <50% success** -- Consider bank-specific profile specialization")
    L.append("- Run test runner again after fixes to measure improvement\n")
    L.append("---\n*Report generated by pipeline_test_runner.py*")
    return "\n".join(L)


def main():
    print("=" * 60)
    print("FinIntel AI -- Pipeline Test Runner")
    print("=" * 60)

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    all_files = []
    for d in [DATASETS_DIR / "primary", DATASETS_DIR / "Secondary"]:
        if d.exists():
            all_files.extend(discover_files(d))

    print(f"\nDiscovered {len(all_files)} files")
    print(f"  Primary: {sum(1 for f in all_files if f['dataset'] == 'primary')}")
    print(f"  Secondary: {sum(1 for f in all_files if f['dataset'] == 'secondary')}\n")

    all_results = []
    for i, fi in enumerate(all_files, 1):
        print(f"[{i}/{len(all_files)}] {fi['filename']}...", end=" ", flush=True)
        r = run_test(fi)
        all_results.append(r)
        print(f"{r['status']} ({r.get('transaction_count_validated', 0)} txns)")

        with open(RESULTS_DIR / f"{fi['filename']}.json", "w") as f:
            json.dump(r, f, indent=2, default=str)

    report = generate_report(all_results)
    report_path = PROJECT_ROOT / "DATASET_TEST_REPORT.md"
    with open(report_path, "w") as f:
        f.write(report)

    print(f"\n{'=' * 60}")
    print(f"Results: {RESULTS_DIR}")
    print(f"Report:  {report_path}")
    print(f"{'=' * 60}")

    s = sum(1 for r in all_results if r["status"] == "SUCCESS")
    p = sum(1 for r in all_results if r["status"] == "PARTIAL_SUCCESS")
    print(f"\nFinal: {s} SUCCESS, {p} PARTIAL, {len(all_results) - s - p} FAILED out of {len(all_results)}")


if __name__ == "__main__":
    main()
