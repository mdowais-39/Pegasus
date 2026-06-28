import re
from datetime import datetime
from typing import Dict, Any, List, Optional
from schemas.account import AccountMetadata
from schemas.transaction import CanonicalTransaction
from schemas.document import DocumentIR, CanonicalDocument

class CanonicalMapper:
    def parse_date(self, val: Any) -> Optional[datetime]:
        if not val or pd_isna(val):
            return None
        if isinstance(val, datetime):
            return val
        
        # Clean newlines and double spaces in dates
        val_str = str(val).strip().replace("\n", "").replace("\r", "")
        val_str = re.sub(r"\s+", " ", val_str)
        
        if "t" in val_str.lower():
            val_str = val_str.lower().split("t")[0]
        elif " " in val_str:
            parts = val_str.split(" ")
            if ":" in parts[-1]:
                val_str = " ".join(parts[:-1]).strip()

        formats = [
            "%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d",
            "%d-%m-%y", "%d/%m/%y", "%y-%m-%d",
            "%d-%b-%y", "%d-%b-%Y", "%d %b %Y", "%d %B %Y"
        ]

        for fmt in formats:
            try:
                return datetime.strptime(val_str, fmt)
            except ValueError:
                continue
                
        # Regex search for date (handles both digits and letters)
        match = re.search(r"(\d{1,2})[-/.]([a-zA-Z]{3}|\d{1,2})[-/.](?:\d{2}|\d{4})", val_str)
        if match:
            day, month_str, year = match.groups()
            if len(year) == 2:
                year = "20" + year
            
            # If month is letters, map to number
            month_map = {
                "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
                "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12
            }
            try:
                month = month_map.get(month_str.lower()) if month_str.isalpha() else int(month_str)
                if month:
                    return datetime(int(year), int(month), int(day))
            except ValueError:
                pass
                
        return None

    def parse_float(self, val: Any) -> Optional[float]:
        if val is None or val == "" or pd_isna(val):
            return None
        if isinstance(val, (int, float)):
            return float(val)
            
        val_str = str(val).strip().replace(",", "")
        val_str = val_str.lower().replace("cr", "").replace("dr", "").strip()
        
        val_str = re.sub(r"[^\d.-]", "", val_str)
        if not val_str or val_str == "-":
            return None
            
        try:
            return float(val_str)
        except ValueError:
            return None

    def map_metadata(self, raw_meta: Dict[str, Any]) -> AccountMetadata:
        norm_meta = {str(k).lower().replace(" ", "_").replace(":", ""): v for k, v in raw_meta.items()}
        
        def find_field(keys: List[str]) -> Optional[Any]:
            for key in keys:
                if key in norm_meta:
                    return norm_meta[key]
            for key in keys:
                for norm_key in norm_meta:
                    if key in norm_key:
                        return norm_meta[norm_key]
            return None

        account_holder = find_field(["account_holder", "account_name", "customer_name", "name", "holder_name"]) or "Unknown Holder"
        account_number = find_field(["account_number", "account_no", "ac_no", "acct_num"]) or "Unknown Account"
        customer_id = find_field(["customer_id", "cust_id", "client_id"])
        ifsc = find_field(["ifsc", "ifsc_code"])
        branch = find_field(["branch", "branch_name"])
        bank_name = find_field(["bank_name", "bank"]) or "Unknown Bank"
        account_type = find_field(["account_type", "type", "ac_type"])
        statement_start = find_field(["statement_start", "from_date", "start_date"])
        statement_end = find_field(["statement_end", "to_date", "end_date"])
        
        opening_balance = self.parse_float(find_field(["opening_balance", "open_bal", "opening_bal"]))
        closing_balance = self.parse_float(find_field(["closing_balance", "close_bal", "closing_bal"]))
        currency = find_field(["currency", "curr"]) or "INR"

        return AccountMetadata(
            account_holder=str(account_holder),
            account_number=str(account_number),
            customer_id=str(customer_id) if customer_id else None,
            ifsc=str(ifsc) if ifsc else None,
            branch=str(branch) if branch else None,
            bank_name=str(bank_name),
            account_type=str(account_type) if account_type else None,
            statement_start=str(statement_start) if statement_start else None,
            statement_end=str(statement_end) if statement_end else None,
            opening_balance=opening_balance,
            closing_balance=closing_balance,
            currency=str(currency)
        )

    def map_transactions(self, raw_txs: List[Dict[str, Any]], source_file: str, bank_name: str) -> List[CanonicalTransaction]:
        mapped = []
        for tx in raw_txs:
            norm_tx = {str(k).lower().replace(" ", "_").replace("\n", "_").replace(".", "").replace("/", "_"): v for k, v in tx.items()}
            
            # Check if it is a text fallback line
            if "raw_text" in norm_tx and len(norm_tx) == 1:
                line = norm_tx["raw_text"]
                # 1. Date
                date_match = re.search(r"(\d{1,2})[-/.]([a-zA-Z]{3}|\d{1,2})[-/.](?:\d{2}|\d{4})", line)
                if not date_match:
                    continue
                tx_date = self.parse_date(date_match.group(0))
                if not tx_date:
                    continue
                
                # 2. Amounts
                amounts = re.findall(r"[\d,]+\.\d{2}", line)
                debit = None
                credit = None
                balance = 0.0
                
                remaining = line[date_match.end():].strip()
                if len(amounts) >= 2:
                    balance = self.parse_float(amounts[-1]) or 0.0
                    amt = self.parse_float(amounts[-2])
                    
                    remaining_lower = remaining.lower()
                    if "cr" in remaining_lower or "deposit" in remaining_lower or "credit" in remaining_lower:
                        credit = amt
                    elif "dr" in remaining_lower or "withdrawal" in remaining_lower or "debit" in remaining_lower:
                        debit = amt
                    else:
                        credit = amt
                elif len(amounts) == 1:
                    balance = self.parse_float(amounts[0]) or 0.0
                    
                # 3. Narration
                narration = remaining
                for amt_str in amounts:
                    narration = narration.replace(amt_str, "")
                narration = re.sub(r"\s+", " ", narration).strip()
                
                mapped.append(
                    CanonicalTransaction(
                        transaction_date=tx_date,
                        value_date=tx_date,
                        narration=narration or "Transaction entry",
                        reference_number=None,
                        cheque_number=None,
                        debit=debit,
                        credit=credit,
                        balance=balance,
                        transaction_type="DEBIT" if debit else "CREDIT",
                        source_bank=bank_name,
                        source_file=source_file,
                        confidence=0.9
                    )
                )
                continue

            # Standard column-based mapping
            def find_field(keys: List[str]) -> Optional[Any]:
                for key in keys:
                    if key in norm_tx:
                        return norm_tx[key]
                for key in keys:
                    for norm_key in norm_tx:
                        if key in norm_key:
                            if key == "date" and "value_date" in norm_key:
                                continue
                            return norm_tx[norm_key]
                return None

            tx_date_raw = find_field(["transaction_date", "tran_date", "txn_date", "trans_date", "trans_dt", "date_dt", "txn_dt", "date"])
            tx_date = self.parse_date(tx_date_raw)
            if not tx_date:
                continue

            val_date_raw = find_field(["value_date", "val_date", "value_dt", "val_dt"])
            val_date = self.parse_date(val_date_raw) or tx_date

            narration = find_field(["narration", "description", "particulars", "remarks", "desc", "transaction_particulars", "raw_text", "particular"]) or ""
            
            debit = self.parse_float(find_field(["debit", "withdrawal", "withdrawals", "amount_debit", "dr"]))
            credit = self.parse_float(find_field(["credit", "deposit", "deposits", "amount_credit", "cr"]))
            balance = self.parse_float(find_field(["balance", "bal", "running_balance"])) or 0.0

            if debit is None and credit is None:
                amount = self.parse_float(find_field(["amount", "txn_amount"]))
                if amount is not None:
                    tx_type = str(find_field(["type", "transaction_type", "debit_credit"])).lower()
                    if "dr" in tx_type or "debit" in tx_type or amount < 0:
                        debit = abs(amount)
                    else:
                        credit = abs(amount)

            reference_number = find_field(["reference_number", "ref_no", "ref_num", "reference", "transn_id", "transaction_id"])
            cheque_number = find_field(["cheque_number", "chq_no", "cheque", "instrument", "ins_number"])
            
            tx_type = "DEBIT" if debit else ("CREDIT" if credit else "UNKNOWN")

            mapped.append(
                CanonicalTransaction(
                    transaction_date=tx_date,
                    value_date=val_date,
                    narration=str(narration).strip(),
                    reference_number=str(reference_number).strip() if reference_number else None,
                    cheque_number=str(cheque_number).strip() if cheque_number else None,
                    debit=debit,
                    credit=credit,
                    balance=balance,
                    transaction_type=tx_type,
                    source_bank=bank_name,
                    source_file=source_file,
                    confidence=1.0
                )
            )
        return mapped

    def map_document(self, ir: DocumentIR) -> CanonicalDocument:
        meta = self.map_metadata(ir.metadata)
        bank_name = meta.bank_name or ir.metadata.get("bank_name", "Unknown Bank")
        txs = self.map_transactions(ir.transactions, ir.source_file, bank_name)
        txs.sort(key=lambda x: x.transaction_date)
        
        from validation import ValidationEngine
        val_engine = ValidationEngine()
        return val_engine.validate(meta, txs, base_confidence=ir.confidence)

def pd_isna(val: Any) -> bool:
    try:
        import pandas as pd
        return pd.isna(val)
    except Exception:
        return val is None
