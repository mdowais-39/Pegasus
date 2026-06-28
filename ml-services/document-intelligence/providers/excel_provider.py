import pandas as pd
from pathlib import Path
from typing import Dict, Any, List
from providers.base import DocumentProvider
from schemas.document import DocumentIR

class ExcelProvider(DocumentProvider):
    def extract(self, file_path: str) -> DocumentIR:
        xl = pd.ExcelFile(file_path)
        sheet_names = xl.sheet_names
        
        best_sheet = sheet_names[0]
        max_matches = 0
        header_keys = {"date", "desc", "narration", "particulars", "debit", "credit", "withdrawal", "deposit", "balance"}
        selected_table_start = 0
        
        for sheet in sheet_names:
            df_temp = pd.read_excel(file_path, sheet_name=sheet, nrows=30, header=None)
            for idx, row in df_temp.iterrows():
                row_str_list = [str(val).strip().lower() for val in row.values if pd.notna(val)]
                matches = sum(1 for val in row_str_list if any(key in val for key in header_keys))
                if matches > max_matches:
                    max_matches = matches
                    best_sheet = sheet
                    selected_table_start = idx

        df_sheet = pd.read_excel(file_path, sheet_name=best_sheet, header=None)
        
        metadata = {}
        for idx in range(selected_table_start):
            row = df_sheet.iloc[idx]
            row_vals = [str(val).strip() for val in row.values if pd.notna(val)]
            if len(row_vals) >= 2:
                k = row_vals[0].lower().replace(":", "").replace(" ", "_")
                v = row_vals[1]
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

        df_data = pd.read_excel(file_path, sheet_name=best_sheet, skiprows=selected_table_start)
        df_data.columns = [str(col).strip() for col in df_data.columns]
        for col in df_data.columns:
            if df_data[col].dtype == "object":
                df_data[col] = df_data[col].astype(str).str.strip()

        transactions = df_data.to_dict(orient="records")

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
            source_type="excel",
            extraction_method="pandas_excel",
            confidence=1.0,
            metadata=metadata,
            transactions=transactions
        )
