import sys
import os
import json
import argparse
import re
from pathlib import Path
import pandas as pd

# Add the codebase path to sys.path
root_dir = Path(__file__).parent.parent
codebase_path = root_dir / "ml-services" / "document-intelligence"
if str(codebase_path) not in sys.path:
    sys.path.insert(0, str(codebase_path))

# Add the legacy ocr folder path to sys.path
ocr_path = root_dir / "ml-services" / "ocr"
if str(ocr_path) not in sys.path:
    sys.path.insert(0, str(ocr_path))

from orchestrator import DocumentIntelligenceOrchestrator

def sanitize_document_name(name: str) -> str:
    # 1. Strip leading/trailing whitespace
    name = name.strip()
    # 2. Replace < > : " / \ | ? * with underscores
    unsafe_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
    for char in unsafe_chars:
        name = name.replace(char, '_')
    # 3. Collapse multiple spaces
    name = re.sub(r'\s+', ' ', name)
    return name

def persist_document(doc, filename: str, output_root: Path):
    doc_name = Path(filename).stem
    # Sanitize document name for safe filesystem path
    doc_name = sanitize_document_name(doc_name)
    dest_dir = output_root / doc_name
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. metadata.json
    meta_json_path = dest_dir / "metadata.json"
    with meta_json_path.open("w", encoding="utf-8") as f:
        json.dump(doc.metadata.model_dump(mode="json"), f, indent=2)
        
    # 2. transactions.json
    txs_json = [tx.model_dump(mode="json") for tx in doc.transactions]
    txs_json_path = dest_dir / "transactions.json"
    with txs_json_path.open("w", encoding="utf-8") as f:
        json.dump(txs_json, f, indent=2)
        
    # 3. transactions.parquet
    txs_parquet_path = dest_dir / "transactions.parquet"
    if txs_json:
        df = pd.DataFrame(txs_json)
        df.to_parquet(txs_parquet_path, index=False, engine="pyarrow")
    else:
        # Create an empty parquet file with the correct schema
        columns = [
            "transaction_date", "value_date", "narration", "reference_number",
            "cheque_number", "debit", "credit", "balance", "transaction_type",
            "source_bank", "source_file", "confidence"
        ]
        df = pd.DataFrame(columns=columns)
        df.to_parquet(txs_parquet_path, index=False, engine="pyarrow")
        
    # 4. validation.json
    val_json_path = dest_dir / "validation.json"
    validation_data = {
        "confidence_score": doc.confidence,
        "warnings": doc.warnings
    }
    with val_json_path.open("w", encoding="utf-8") as f:
        json.dump(validation_data, f, indent=2)
        
    print(f"[SUCCESS] Persisted standardized outputs for {filename} under: {dest_dir.relative_to(root_dir)}")

def inspect_document(doc_name: str, output_root: Path):
    doc_name = sanitize_document_name(doc_name)
    dest_dir = output_root / doc_name
    if not dest_dir.exists():
        print(f"[ERROR] Document '{doc_name}' has not been standardized or does not exist under {output_root.relative_to(root_dir)}.")
        return
        
    meta_path = dest_dir / "metadata.json"
    txs_json_path = dest_dir / "transactions.json"
    txs_parquet_path = dest_dir / "transactions.parquet"
    val_path = dest_dir / "validation.json"
    
    print("\n" + "="*80)
    print(f" INSPECTION: {doc_name}")
    print("="*80)
    
    if meta_path.exists():
        print("\n--- ACCOUNT METADATA ---")
        with meta_path.open("r", encoding="utf-8") as f:
            meta = json.load(f)
            for k, v in meta.items():
                print(f"  {k:20}: {v}")
                
    if val_path.exists():
        print("\n--- VALIDATION & CONFIDENCE ---")
        with val_path.open("r", encoding="utf-8") as f:
            val = json.load(f)
            print(f"  Confidence Score    : {val.get('confidence_score')}")
            print(f"  Warnings ({len(val.get('warnings', []))}):")
            for warning in val.get("warnings", []):
                print(f"    - {warning}")
                
    if txs_parquet_path.exists():
        print("\n--- TRANSACTIONS (First 10 from Parquet) ---")
        df = pd.read_parquet(txs_parquet_path)
        if not df.empty:
            pd.set_option('display.max_columns', None)
            pd.set_option('display.width', 1000)
            print(df.head(10).to_string(index=True))
            print(f"\n  Total transactions in Parquet: {len(df)}")
        else:
            print("  No transactions stored.")

def main():
    parser = argparse.ArgumentParser(description="Backend-2.2 Persistence & Inspection CLI Utility")
    parser.add_argument("--input", type=str, help="Path to input statement file or directory")
    parser.add_argument("--dir", action="store_true", help="Process directory flag")
    parser.add_argument("--inspect", type=str, help="Document name (without extension) to inspect")
    parser.add_argument("--output-dir", type=str, default="artifacts/standardized", help="Destination folder for standardized outputs")
    
    args = parser.parse_args()
    output_root = root_dir / args.output_dir
    output_root.mkdir(parents=True, exist_ok=True)
    
    if args.inspect:
        inspect_document(args.inspect, output_root)
        return
        
    if not args.input:
        parser.print_help()
        return
        
    orchestrator = DocumentIntelligenceOrchestrator()
    
    if args.dir:
        input_path = Path(args.input)
        if not input_path.is_dir():
            print(f"[ERROR] Specified input path is not a directory: {args.input}")
            sys.exit(1)
            
        print(f"\nScanning directory: {args.input}")
        files = []
        for ext in [".pdf", ".csv", ".xlsx", ".xls", ".txt"]:
            files.extend(list(input_path.glob(f"*{ext}")))
            
        print(f"Discovered {len(files)} files to process.")
        for i, file in enumerate(files):
            print(f"\n[{i+1}/{len(files)}] Processing {file.name}...")
            try:
                doc = orchestrator.process_document(str(file))
                persist_document(doc, file.name, output_root)
            except Exception as e:
                print(f"[FAILED] Error processing {file.name}: {e}")
    else:
        file_path = Path(args.input)
        if not file_path.exists():
            print(f"[ERROR] File does not exist: {args.input}")
            sys.exit(1)
            
        print(f"\nProcessing single file: {file_path.name}...")
        try:
            doc = orchestrator.process_document(str(file_path))
            persist_document(doc, file_path.name, output_root)
        except Exception as e:
            print(f"[FAILED] Error processing {file_path.name}: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()
