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

        metadata = {
            "account_holder": "Unknown Holder",
            "account_number": "Unknown Account",
            "bank_name": "Unknown Bank",
            "currency": "INR"
        }
        transactions = []
        
        # Robust first-page text block metadata search
        full_text = ""
        for page in doc[:2]:
            full_text += page.get_text() + "\n"
            
        # Parse IFSC
        ifsc_match = re.search(r"\b([A-Z]{4})0([A-Z0-9]{6})\b", full_text)
        if ifsc_match:
            metadata["ifsc"] = ifsc_match.group(0)
            bank_code = ifsc_match.group(1)
            bank_map = {
                "IDFB": "IDFC FIRST Bank",
                "HDFC": "HDFC Bank",
                "ICIC": "ICICI Bank",
                "BARB": "Bank of Baroda",
                "SBIN": "State Bank of India",
                "UTIB": "Axis Bank",
                "YESB": "YES Bank",
                "KLGB": "Kerala Gramin Bank",
                "IBKL": "IDBI Bank"
            }
            metadata["bank_name"] = bank_map.get(bank_code, f"{bank_code} Bank")
            
        # Standard line-by-line label mapping
        for line in full_text.split("\n"):
            line_str = line.strip()
            if ":" in line_str:
                parts = line_str.split(":", 1)
                k = parts[0].strip().lower().replace(" ", "_")
                v = parts[1].strip()
                if "account" in k and "num" in k:
                    metadata["account_number"] = v
                elif "name" in k or "holder" in k:
                    metadata["account_holder"] = v
                elif "ifsc" in k and "ifsc" not in metadata:
                    metadata["ifsc"] = v
                elif "bank" in k and ("bank_name" not in metadata or metadata["bank_name"] == "Unknown Bank"):
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

        # If account number or customer id are not found, search lines following labels
        text_lines = [line.strip() for line in full_text.split("\n") if line.strip()]
        for idx, line in enumerate(text_lines):
            line_lower = line.lower()
            if "account no" in line_lower or "account number" in line_lower or "a/c no" in line_lower or "ac no" in line_lower:
                if "account_number" not in metadata or metadata["account_number"] == "Unknown Account":
                    for offset in range(1, 6):
                        if idx + offset < len(text_lines):
                            candidate = re.sub(r"\s+", "", text_lines[idx+offset])
                            if re.match(r"^\d{9,18}$", candidate):
                                metadata["account_number"] = candidate
                                break
            elif "customer id" in line_lower or "cust id" in line_lower or "client id" in line_lower:
                if "customer_id" not in metadata or not metadata["customer_id"]:
                    for offset in range(1, 6):
                        if idx + offset < len(text_lines):
                            candidate = re.sub(r"\s+", "", text_lines[idx+offset])
                            if re.match(r"^\d{9,18}$", candidate):
                                metadata["customer_id"] = candidate
                                break

        # Scan tables on page 0 for numeric metadata matching length 9-18
        for page in doc[:1]:
            tables = page.find_tables()
            if tables and tables.tables:
                for table in tables.tables:
                    data = table.extract()
                    for row in data:
                        for cell in row:
                            if cell:
                                cell_str = re.sub(r"\s+", "", str(cell).strip())
                                if re.match(r"^\d{9,18}$", cell_str):
                                    if "account_number" not in metadata or metadata["account_number"] == "Unknown Account":
                                        metadata["account_number"] = cell_str
                                    elif "customer_id" not in metadata and cell_str != metadata.get("account_number"):
                                        metadata["customer_id"] = cell_str

        # Fallback bank names from filename
        if "bank_name" not in metadata or metadata["bank_name"] == "Unknown Bank":
            filename_lower = Path(file_path).name.lower()
            if "sbi" in filename_lower:
                metadata["bank_name"] = "State Bank of India"
            elif "hdfc" in filename_lower:
                metadata["bank_name"] = "HDFC Bank"
            elif "icici" in filename_lower:
                metadata["bank_name"] = "ICICI Bank"
            elif "idfc" in filename_lower:
                metadata["bank_name"] = "IDFC FIRST Bank"
            else:
                metadata["bank_name"] = "Unknown Bank"

        for page_idx, page in enumerate(doc):
            page_txs = []
            tables = page.find_tables()
            if tables and tables.tables:
                for table in tables.tables:
                    raw_table_data = table.extract()
                    if raw_table_data and len(raw_table_data) > 1:
                        headers = [str(cell).strip().lower() if cell is not None else f"col_{i}" for i, cell in enumerate(raw_table_data[0])]
                        header_keys = {"date", "desc", "narration", "particulars", "debit", "credit", "balance", "details"}
                        matches = sum(1 for h in headers if any(key in h for key in header_keys))
                        if matches >= 2:
                            for row in raw_table_data[1:]:
                                if len(row) == len(headers):
                                    row_dict = {}
                                    for i in range(len(headers)):
                                        row_dict[headers[i]] = str(row[i]).strip() if row[i] is not None else ""
                                    # Ensure row is not entirely empty
                                    if any(row_dict.values()):
                                        page_txs.append(row_dict)
            
            # If no rows extracted from tables, use line regex fallback
            if not page_txs:
                text = page.get_text()
                lines = [line.strip() for line in text.split("\n") if line.strip()]
                for line in lines:
                    if re.search(r"\d{1,4}[-/.]\d{1,4}[-/.]\d{1,4}", line) or re.search(r"\d{1,2}[-/.][a-zA-Z]{3}[-/.](?:\d{2}|\d{4})", line):
                        page_txs.append({"raw_text": line})
                        
            transactions.extend(page_txs)

        return DocumentIR(
            source_file=str(file_path),
            source_type="pdf",
            extraction_method="pymupdf_native",
            confidence=1.0,
            metadata=metadata,
            transactions=transactions
        )
