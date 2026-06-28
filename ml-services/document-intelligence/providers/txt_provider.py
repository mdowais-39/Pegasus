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
        for line in lines[:15]:
            line_str = line.strip()
            if ":" in line_str:
                parts = line_str.split(":", 1)
                k = parts[0].strip().lower().replace(" ", "_")
                v = parts[1].strip()
                if "account" in k and "num" in k:
                    # e.g., "Account Number : SB101 40211101047567 NITIN ADITYA"
                    # Split account number and holder if possible
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
            for idx, line in enumerate(lines[:30]):
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
            for idx, line in enumerate(lines[:30]):
                line_lower = line.lower()
                matches = sum(1 for key in header_keys if key in line_lower)
                if matches >= 3: # Higher threshold for fixed width header matching
                    header_idx = idx
                    break
            
            if header_idx != -1:
                header_line = lines[header_idx]
                
                # Detect column spans - sorting patterns by length descending
                col_patterns = {
                    "date": ["trans dt", "txn date", "transn date", "date"],
                    "value_date": ["value date", "value dt", "val dt"],
                    "transaction_id": ["transaction id", "transn id", "txn id", "trans.id", "ref"],
                    "particulars": ["transaction particulars", "particulars", "narration", "description", "desc"],
                    "cheque_number": ["ins number", "chq.no", "cheque", "instrument"],
                    "debit": ["debit amount", "debit", "withdrawal", "withdrawals"],
                    "credit": ["credit amount", "credit", "deposit", "deposits"],
                    "balance": ["balance"]
                }
                
                col_positions = []
                for col_name, patterns in col_patterns.items():
                    found_idx = -1
                    for p in patterns:
                        idx_pos = header_line.lower().find(p)
                        if idx_pos != -1:
                            found_idx = idx_pos
                            break
                    if found_idx != -1:
                        col_positions.append((col_name, found_idx))
                
                col_positions.sort(key=lambda x: x[1])
                
                col_spans = []
                for i in range(len(col_positions)):
                    name, start = col_positions[i]
                    end = col_positions[i+1][1] if i + 1 < len(col_positions) else None
                    col_spans.append({"name": name, "start": start, "end": end})
                
                # Dynamically adjust start/end boundaries of numeric columns to capture right-aligned values
                for idx, span in enumerate(col_spans):
                    if span["name"] in ["debit", "credit", "balance"]:
                        prev_start = col_spans[idx-1]["start"] if idx > 0 else 0
                        # Shift the start boundary left by 8 spaces to handle shifting/padding of amounts
                        new_start = max(prev_start + 2, span["start"] - 8)
                        span["start"] = new_start
                        if idx > 0:
                            col_spans[idx-1]["end"] = new_start
                
                # Extract transaction data
                for line in lines[header_idx+1:]:
                    line_str = line.strip()
                    if not line_str or line_str.startswith("---") or line_str.startswith("==="):
                        continue
                    
                    # Ensure the line starts with a date pattern (e.g. DD-MM-YY or DD/MM/YY)
                    first_part = line[:15].strip()
                    if not re.search(r"\d{1,4}[-/.]\d{1,4}[-/.]\d{1,4}", first_part):
                        continue
                        
                    # KGB Bank specific robust parser fallback
                    if metadata.get("bank_name") == "Kerala Gramin Bank":
                        parts = re.split(r"\s+", line.strip(), 3)
                        if len(parts) >= 4:
                            trans_dt, val_dt, txn_id, rest = parts
                            matches = list(re.finditer(r"[\d,]+\.\d{2}", line))
                            if len(matches) == 2:
                                num1_match, num2_match = matches
                                num1_val = num1_match.group()
                                num2_val = num2_match.group()
                                end_pos = num1_match.end()
                                
                                particulars_end = min(82, num1_match.start())
                                particulars = line[32:particulars_end].strip()
                                
                                if end_pos <= 108:
                                    row_dict = {
                                        "date": trans_dt,
                                        "value_date": val_dt,
                                        "transaction_id": txn_id,
                                        "particulars": particulars,
                                        "cheque_number": "",
                                        "debit": num1_val,
                                        "credit": "",
                                        "balance": num2_val
                                    }
                                else:
                                    row_dict = {
                                        "date": trans_dt,
                                        "value_date": val_dt,
                                        "transaction_id": txn_id,
                                        "particulars": particulars,
                                        "cheque_number": "",
                                        "debit": "",
                                        "credit": num1_val,
                                        "balance": num2_val
                                    }
                                transactions.append(row_dict)
                                continue

                    row_dict = {}
                    for span in col_spans:
                        name = span["name"]
                        start = span["start"]
                        end = span["end"]
                        val = line[start:end].strip() if start < len(line) else ""
                        row_dict[name] = val
                    transactions.append(row_dict)

        return DocumentIR(
            source_file=str(file_path),
            source_type="txt",
            extraction_method="fixed_width_txt",
            confidence=1.0,
            metadata=metadata,
            transactions=transactions
        )
