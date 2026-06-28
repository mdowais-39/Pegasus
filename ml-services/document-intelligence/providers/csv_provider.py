import csv
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List
from providers.base import DocumentProvider
from schemas.document import DocumentIR

class CSVProvider(DocumentProvider):
    def extract(self, file_path: str) -> DocumentIR:
        # Detect delimiter
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            sample = ""
            for _ in range(20):
                line = f.readline()
                if not line:
                    break
                sample += line
            
            try:
                dialect = csv.Sniffer().sniff(sample)
                delimiter = dialect.delimiter
            except Exception:
                delimiter = ","
                if "\t" in sample:
                    delimiter = "\t"
                elif ";" in sample:
                    delimiter = ";"

        # Read lines for metadata
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = [line.strip() for line in f.readlines()]

        metadata = {}
        table_start_idx = 0
        header_keys = {"date", "desc", "narration", "particulars", "debit", "credit", "withdrawal", "deposit", "balance"}
        
        for idx, line in enumerate(lines[:15]):
            if not line:
                continue
            
            parts = [p.strip().lower() for p in line.split(delimiter)]
            matches = sum(1 for p in parts if any(key in p for key in header_keys))
            if matches >= 2:
                table_start_idx = idx
                break
                
            if delimiter in line:
                key_val = line.split(delimiter, 1)
                k = key_val[0].strip().lower().replace(" ", "_")
                v = key_val[1].strip()
                if k and v:
                    if "account" in k and "num" in k:
                        metadata["account_number"] = v
                    elif "name" in k or "holder" in k:
                        metadata["account_holder"] = v
                    elif "ifsc" in k:
                        metadata["ifsc"] = v
                    elif "bank" in k:
                        metadata["bank_name"] = v
                    elif "branch" in k:
                        metadata["branch"] = v
                    elif "opening" in k and "bal" in k:
                        try:
                            metadata["opening_balance"] = float(v.replace(",", ""))
                        except ValueError:
                            pass
                    elif "closing" in k and "bal" in k:
                        try:
                            metadata["closing_balance"] = float(v.replace(",", ""))
                        except ValueError:
                            pass

        df = pd.read_csv(
            file_path,
            skiprows=table_start_idx,
            sep=delimiter,
            encoding="utf-8",
            on_bad_lines="skip"
        )
        
        for col in df.columns:
            if df[col].dtype == "object":
                df[col] = df[col].astype(str).str.strip()

        transactions = df.to_dict(orient="records")

        # Fill defaults
        if "bank_name" not in metadata:
            filename_lower = Path(file_path).name.lower()
            if "sbi" in filename_lower:
                metadata["bank_name"] = "State Bank of India"
            elif "hdfc" in filename_lower:
                metadata["bank_name"] = "HDFC Bank"
            elif "icici" in filename_lower:
                metadata["bank_name"] = "ICICI Bank"
            else:
                metadata["bank_name"] = "Unknown Bank"

        return DocumentIR(
            source_file=str(file_path),
            source_type="csv",
            extraction_method="pandas_csv",
            confidence=1.0,
            metadata=metadata,
            transactions=transactions
        )
