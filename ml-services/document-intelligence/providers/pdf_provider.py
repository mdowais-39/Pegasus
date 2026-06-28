import fitz  # PyMuPDF
import re
from pathlib import Path
from typing import Dict, Any, List
from providers.base import DocumentProvider
from providers.legacy_provider import LegacyProvider
from schemas.document import DocumentIR

class PDFProvider(DocumentProvider):
    def extract(self, file_path: str) -> DocumentIR:
        doc = fitz.open(file_path)
        is_native = False
        
        for page in doc:
            text = page.get_text()
            if text and len(text.strip()) > 50:
                is_native = True
                break
                
        if not is_native:
            print(f"[INFO] PDF {file_path} is scanned. Delegating to LegacyProvider...")
            return LegacyProvider().extract(file_path)

        metadata = {}
        transactions = []
        
        for page_idx in range(min(2, len(doc))):
            page = doc[page_idx]
            text = page.get_text()
            for line in text.split("\n"):
                line_str = line.strip()
                if ":" in line_str:
                    parts = line_str.split(":", 1)
                    k = parts[0].strip().lower().replace(" ", "_")
                    v = parts[1].strip()
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

        for page_idx, page in enumerate(doc):
            tables = page.find_tables()
            if tables and tables.tables:
                for table in tables.tables:
                    raw_table_data = table.extract()
                    if raw_table_data and len(raw_table_data) > 1:
                        # Keep None fields as placeholder col_i to match row lengths
                        headers = [str(cell).strip().lower() if cell is not None else f"col_{i}" for i, cell in enumerate(raw_table_data[0])]
                        header_keys = {"date", "desc", "narration", "particulars", "debit", "credit", "balance"}
                        matches = sum(1 for h in headers if any(key in h for key in header_keys))
                        if matches >= 2:
                            for row in raw_table_data[1:]:
                                if len(row) == len(headers):
                                    row_dict = {}
                                    for i in range(len(headers)):
                                        row_dict[headers[i]] = str(row[i]).strip() if row[i] is not None else ""
                                    transactions.append(row_dict)
            else:
                text = page.get_text()
                lines = [line.strip() for line in text.split("\n") if line.strip()]
                for line in lines:
                    if re.search(r"\d{1,4}[-/.]\d{1,4}[-/.]\d{1,4}", line):
                        transactions.append({"raw_text": line})

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
            source_type="pdf",
            extraction_method="pymupdf_native",
            confidence=1.0,
            metadata=metadata,
            transactions=transactions
        )
