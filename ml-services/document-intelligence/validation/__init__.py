from .balance_validator import BalanceValidator
from .amount_validator import AmountValidator
from .date_validator import DateValidator
from .totals_validator import TotalsValidator
from schemas.document import CanonicalDocument
from schemas.transaction import CanonicalTransaction
from schemas.account import AccountMetadata
from typing import List

class ValidationEngine:
    def __init__(self):
        self.balance_val = BalanceValidator()
        self.amount_val = AmountValidator()
        self.date_val = DateValidator()
        self.totals_val = TotalsValidator()

    def validate(self, metadata: AccountMetadata, transactions: List[CanonicalTransaction], base_confidence: float = 1.0) -> CanonicalDocument:
        warnings = []
        confidence = base_confidence
        
        # 1. Structural/Semantic Validation checks
        date_ok, date_warns = self.date_val.validate(transactions)
        warnings.extend(date_warns)
        
        amount_ok, amount_warns = self.amount_val.validate(transactions)
        warnings.extend(amount_warns)
        
        balance_ok, balance_warns = self.balance_val.validate(transactions)
        warnings.extend(balance_warns)
        
        totals_ok, totals_warns = self.totals_val.validate(metadata, transactions)
        warnings.extend(totals_warns)
        
        if not date_ok:
            confidence -= 0.1
        if not amount_ok:
            confidence -= 0.2
        if not balance_ok:
            confidence -= 0.3
        if not totals_ok:
            confidence -= 0.2
            
        # 2. Metadata completeness checks
        if not metadata.bank_name or metadata.bank_name.strip().lower() == "unknown bank":
            warnings.append("Missing bank name metadata.")
            confidence -= 0.1
            
        if not metadata.account_number or metadata.account_number.strip().lower() == "unknown account":
            warnings.append("Missing account number metadata.")
            confidence -= 0.1
            
        if not metadata.account_holder or metadata.account_holder.strip().lower() == "unknown holder":
            warnings.append("Missing account holder metadata.")
            confidence -= 0.05
            
        if metadata.opening_balance is None:
            warnings.append("Missing opening balance metadata.")
            confidence -= 0.05
            
        if metadata.closing_balance is None:
            warnings.append("Missing closing balance metadata.")
            confidence -= 0.05

        # 3. Empty narrations completeness checks
        if transactions:
            empty_narrations_count = sum(1 for tx in transactions if not tx.narration or tx.narration.strip() == "")
            if empty_narrations_count > 0:
                percentage = (empty_narrations_count / len(transactions)) * 100
                warnings.append(f"Found {empty_narrations_count} transactions with empty narrations ({percentage:.2f}%).")
                confidence -= 0.15
                
        # 4. Missing/default zero balance checks
        if transactions:
            # We flag if a transaction has balance = 0.0 but both debit and credit are null/empty,
            # or if the balance fields are all null.
            missing_balances_count = sum(1 for tx in transactions if tx.balance is None or (tx.balance == 0.0 and tx.debit is None and tx.credit is None))
            if missing_balances_count > 0:
                percentage = (missing_balances_count / len(transactions)) * 100
                warnings.append(f"Found {missing_balances_count} transactions with missing or default zero balance ({percentage:.2f}%).")
                confidence -= 0.2

        confidence = max(0.0, min(1.0, confidence))
        
        return CanonicalDocument(
            metadata=metadata,
            transactions=transactions,
            confidence=round(confidence, 4),
            warnings=warnings
        )
