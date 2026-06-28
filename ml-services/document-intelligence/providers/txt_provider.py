import re
from pathlib import Path
from typing import Dict, Any, List
from providers.base import DocumentProvider
from schemas.document import DocumentIR

class TXTProvider(DocumentProvider):
    def extract(self, file_path: str) -> DocumentIR:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()

        # Extract metadata
        metadata = {}
        for line in lines[:20]:
            line_str = line.strip()
            if ":" in line_str:
                parts = line_str.split(":", 1)
                k = parts[0].strip().lower().replace(" ", "_")
                v = parts[1].strip()
                if "account" in k and "num" in k:
                    if " " in v:
                        v_parts = v.split(" ", 1)
                        metadata["account_number"] = v_parts[0].strip()
                        metadata["account_holder"] = v_parts[1].strip()
                    else:
                        metadata["account_number"] = v
                elif "name" in k or "holder" in k:
                    metadata["account_holder"] = v
                elif "ifsc" in k:
                    metadata["ifsc"] = v
                elif "bank" in k:
                    metadata["bank_name"] = v
                elif "branch" in k:
                    metadata["branch"] = v

        if "bank_name" not in metadata:
            filename_lower = Path(file_path).name.lower()
            if "klgb" in filename_lower or "kerala" in filename_lower or "nitin" in filename_lower:
                metadata["bank_name"] = "Kerala Gramin Bank"
            elif "sbi" in filename_lower:
                metadata["bank_name"] = "State Bank of India"
            elif "pnb" in filename_lower or "shivlal" in filename_lower:
                metadata["bank_name"] = "Punjab National Bank"
            else:
                metadata["bank_name"] = "Unknown Bank"

        # Determine if it is tab-separated or fixed-width
        is_tsv = False
        tab_counts = [line.count("\t") for line in lines[:50]]
        if len(tab_counts) > 0 and sum(tab_counts) / len(tab_counts) > 3:
            is_tsv = True

        transactions = []
        header_keys = {"date", "desc", "narration", "particulars", "debit", "credit", "balance"}

        if is_tsv:
            # Parse TSV
            header_idx = -1
            for idx, line in enumerate(lines[:100]):
                parts = [p.strip().lower() for p in line.split("\t")]
                matches = sum(1 for p in parts if any(key in p for key in header_keys))
                if header_idx == -1 and matches >= 2:
                    header_idx = idx
                    break
            
            if header_idx != -1:
                headers = [h.strip() for h in lines[header_idx].split("\t")]
                for line in lines[header_idx+1:]:
                    line_str = line.strip()
                    if not line_str:
                        continue
                    parts = [p.strip() for p in line.split("\t")]
                    if len(parts) >= len(headers):
                        row_dict = {headers[i]: parts[i] for i in range(len(headers))}
                        transactions.append(row_dict)
        else:
            # Parse Fixed-width
            header_idx = -1
            for idx in range(len(lines) - 1):
                line_lower = lines[idx].lower()
                next_lower = lines[idx+1].lower()
                combined_matches = sum(1 for key in header_keys if key in line_lower or key in next_lower)
                if combined_matches >= 3:
                    header_idx = idx
                    break
            
            if header_idx != -1:
                for idx, line in enumerate(lines[header_idx+1:], header_idx+1):
                    line_str = line.strip()
                    if not line_str or line_str.startswith("---") or line_str.startswith("==="):
                        continue
                    
                    # Ensure the line starts with a date pattern (e.g. DD-MM-YY or DD/MM/YY)
                    first_part = line[:15].strip()
                    if not re.search(r"\d{1,4}[-/.]\d{1,4}[-/.]\d{1,4}", first_part):
                        continue
                        
                    # Find all decimal numbers in the line
                    matches = list(re.finditer(r"[\d,]+\.\d{2}", line))
                    if not matches:
                        continue
                        
                    # Reject if contains page or report headers
                    blacklist = ["page ", "punjab national bank", "ledger report", "order by", "customer id", "statement of"]
                    if any(kw in line.lower() for kw in blacklist):
                        continue
                        
                    # Split prefix
                    prefix = line[:80].strip()
                    parts = re.split(r"\s+", prefix)
                    
                    date1 = parts[0]
                    date2 = parts[1] if len(parts) > 1 else ""
                    txn_id = ""
                    particulars = ""
                    
                    if len(parts) > 2:
                        if re.match(r"^[S|M|G|N]\d+/\d+$", parts[2]) or "/" in parts[2] and len(parts[2]) < 15:
                            txn_id = parts[2]
                            txn_idx = line.find(txn_id)
                            particulars_start = txn_idx + len(txn_id)
                        else:
                            date2_idx = line.find(date2, len(date1))
                            particulars_start = date2_idx + len(date2)
                            
                        particulars_end = matches[0].start() if matches else len(line)
                        particulars = line[particulars_start:particulars_end].strip()
                        
                    debit = ""
                    credit = ""
                    balance = ""
                    
                    if len(matches) == 2:
                        num1_match, num2_match = matches
                        num1_val = num1_match.group()
                        num2_val = num2_match.group()
                        
                        # Universal distance check
                        dist = num2_match.end() - num1_match.end()
                        if dist > 25:
                            debit = num1_val
                        else:
                            credit = num1_val
                        balance = num2_val
                    elif len(matches) == 1:
                        balance = matches[0].group()
                        
                    row_dict = {
                        "date": date1,
                        "value_date": date2,
                        "transaction_id": txn_id,
                        "particulars": particulars,
                        "cheque_number": "",
                        "debit": debit,
                        "credit": credit,
                        "balance": balance
                    }
                    transactions.append(row_dict)

        return DocumentIR(
            source_file=str(file_path),
            source_type="txt",
            extraction_method="fixed_width_txt",
            confidence=1.0,
            metadata=metadata,
            transactions=transactions
        )
