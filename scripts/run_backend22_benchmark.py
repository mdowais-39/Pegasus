import os
import sys
import json
import time
from pathlib import Path
from collections import defaultdict

# Add document-intelligence codebase to sys.path
codebase_path = Path("c:/Users/Willis/OneDrive/Documents/Hackathons/CIDECODE/AI-Powered-Financial-Crime-Investigation-Platform/ml-services/document-intelligence")
if str(codebase_path) not in sys.path:
    sys.path.insert(0, str(codebase_path))

ocr_path = codebase_path.parent / "ocr"
if str(ocr_path) not in sys.path:
    sys.path.insert(0, str(ocr_path))

from orchestrator import DocumentIntelligenceOrchestrator

PROJECT_ROOT = Path("c:/Users/Willis/OneDrive/Documents/Hackathons/CIDECODE/AI-Powered-Financial-Crime-Investigation-Platform")
DATASETS_DIR = PROJECT_ROOT / "datasets" / "bank-statements" / "Bank-statements-dataset"

def discover_files() -> list[Path]:
    files = []
    for directory in [DATASETS_DIR / "primary", DATASETS_DIR / "Secondary"]:
        if not directory.exists():
            continue
        for dirpath, _, filenames in os.walk(directory):
            for fname in filenames:
                if fname.startswith(".") or fname.endswith((".py", ".zip")):
                    continue
                files.append(Path(dirpath) / fname)
    return files

def main():
    print("=" * 60)
    print("Backend-2.2 Dataset-level Validation Benchmark")
    print("=" * 60)

    files = discover_files()
    print(f"Discovered {len(files)} files to validate.\n")

    orchestrator = DocumentIntelligenceOrchestrator()

    total_files = len(files)
    success_count = 0
    parse_failures = 0
    standardization_failures = 0
    total_confidence = 0.0
    provider_stats = defaultdict(int)
    
    file_details = []

    for idx, fpath in enumerate(files, 1):
        rel_path = fpath.relative_to(PROJECT_ROOT)
        print(f"[{idx}/{total_files}] Processing {fpath.name}...", end=" ", flush=True)
        
        t0 = time.time()
        try:
            doc = orchestrator.process_document(str(fpath))
            duration = time.time() - t0
            
            # Identify which provider was resolved
            # We check the file suffix to guess the primary provider routed to
            suffix = fpath.suffix.lower()
            prov_name = "unknown"
            if suffix == ".pdf":
                # Check if it was native or legacy fallback
                has_fallback_warning = any("legacy" in w.lower() or "fallback" in w.lower() for w in doc.warnings)
                prov_name = "LegacyProvider" if has_fallback_warning else "PDFProvider"
            elif suffix == ".csv":
                prov_name = "CSVProvider"
            elif suffix in (".xlsx", ".xls"):
                prov_name = "ExcelProvider"
            elif suffix == ".txt":
                prov_name = "TXTProvider"
            else:
                prov_name = "LegacyProvider"
                
            provider_stats[prov_name] += 1
            
            if len(doc.transactions) > 0:
                success_count += 1
                total_confidence += doc.confidence
                status = "SUCCESS"
                print(f"SUCCESS ({len(doc.transactions)} txns, conf: {doc.confidence})")
            else:
                standardization_failures += 1
                status = "STANDARDIZE_FAILED"
                print("STANDARDIZE_FAILED (0 mapped transactions)")
                
            file_details.append({
                "file": fpath.name,
                "relative_path": str(rel_path),
                "status": status,
                "provider": prov_name,
                "transactions_count": len(doc.transactions),
                "confidence": doc.confidence,
                "duration_s": round(duration, 3),
                "warnings": doc.warnings
            })
            
        except Exception as e:
            duration = time.time() - t0
            parse_failures += 1
            provider_stats["Failed"] += 1
            print(f"PARSE_FAILED: {e}")
            file_details.append({
                "file": fpath.name,
                "relative_path": str(rel_path),
                "status": "PARSE_FAILED",
                "provider": "Failed",
                "transactions_count": 0,
                "confidence": 0.0,
                "duration_s": round(duration, 3),
                "error": str(e)
            })

    avg_confidence = total_confidence / success_count if success_count > 0 else 0.0

    report = {
        "summary": {
            "total_files": total_files,
            "success_count": success_count,
            "success_rate": round((success_count / total_files) * 100, 2),
            "parse_failures": parse_failures,
            "standardization_failures": standardization_failures,
            "avg_confidence": round(avg_confidence, 4),
            "provider_usage_statistics": dict(provider_stats)
        },
        "details": file_details
    }

    report_path = PROJECT_ROOT / "benchmark_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 60)
    print("Benchmark Completed Successfully!")
    print(f"Report saved to: {report_path}")
    print("=" * 60)
    print(f"Total Files:              {total_files}")
    print(f"Success Count:            {success_count} ({report['summary']['success_rate']}%)")
    print(f"Parse Failures:           {parse_failures}")
    print(f"Standardization Failures: {standardization_failures}")
    print(f"Average Confidence:       {report['summary']['avg_confidence']}")
    print(f"Provider Stats:           {report['summary']['provider_usage_statistics']}")
    print("=" * 60)
    
    # Baseline comparison (Backend-2.0)
    print("\nComparison against Backend-2.0 Baseline:")
    print("┌──────────────────────────┬─────────────────────┬─────────────────────┐")
    print("│ Metric                   │ Backend-2.0 Baseline│ Backend-2.2 (New)   │")
    print("├──────────────────────────┼─────────────────────┼─────────────────────┤")
    print(f"│ Total Files              │ 162                 │ {total_files:<20}│")
    print(f"│ Success Count            │ 0 (0.0%)            │ {success_count} ({report['summary']['success_rate']}%)    │")
    print(f"│ Parse Failures           │ 162                 │ {parse_failures:<20}│")
    print(f"│ Standardization Failures  │ 0                   │ {standardization_failures:<20}│")
    print("└──────────────────────────┴─────────────────────┴─────────────────────┘")

if __name__ == "__main__":
    main()
