import re
from datetime import datetime
from typing import Dict, Any, List, Optional
from schemas.account import AccountMetadata
from schemas.transaction import CanonicalTransaction
from schemas.document import DocumentIR, CanonicalDocument

class CanonicalMapper:
    def parse_date(self, val: Any) -> Optional[datetime]:
        if not val:
            return None
        if isinstance(val, datetime):
            return val
        
        val_str = str(val).strip()
        # Try split on time if present
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
                
        # Regex fallback
        match = re.search(r"(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})", val_str)
        if match:
            day, month, year = match.groups()
            if len(year) == 2:
                year = "20" + year
            try:
                return datetime(int(year), int(month), int(day))
            except ValueError:
                pass
                
        return None

    def parse_float(self, val: Any) -> Optional[float]:
        if val is None or val == "":
            return None
        if isinstance(val, (int, float)):
            return float(val)
            
        val_str = str(val).strip().replace(",", "")
        # Strip Cr/Dr markers if present
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
            norm_tx = {str(k).lower().replace(" ", "_").replace(".", "").replace("/", "_"): v for k, v in tx.items()}
            
            def find_field(keys: List[str]) -> Optional[Any]:
                for key in keys:
                    if key in norm_tx:
                        return norm_tx[key]
                return None

            tx_date_raw = find_field(["transaction_date", "date", "txn_date", "trans_date", "trans_dt", "date_dt", "txn_dt"])
            tx_date = self.parse_date(tx_date_raw)
            if not tx_date:
                continue

            val_date_raw = find_field(["value_date", "val_date", "value_dt", "val_dt"])
            val_date = self.parse_date(val_date_raw) or tx_date

            narration = find_field(["narration", "description", "particulars", "remarks", "desc", "transaction_particulars", "raw_text"]) or ""
            
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
