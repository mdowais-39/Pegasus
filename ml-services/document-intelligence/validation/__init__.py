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
        
        date_ok, date_warns = self.date_val.validate(transactions)
        warnings.extend(date_warns)
        
        amount_ok, amount_warns = self.amount_val.validate(transactions)
        warnings.extend(amount_warns)
        
        balance_ok, balance_warns = self.balance_val.validate(transactions)
        warnings.extend(balance_warns)
        
        totals_ok, totals_warns = self.totals_val.validate(metadata, transactions)
        warnings.extend(totals_warns)
        
        confidence = base_confidence
        if not date_ok:
            confidence -= 0.1
        if not amount_ok:
            confidence -= 0.2
        if not balance_ok:
            confidence -= 0.3
        if not totals_ok:
            confidence -= 0.2
            
        confidence = max(0.0, min(1.0, confidence))
        
        return CanonicalDocument(
            metadata=metadata,
            transactions=transactions,
            confidence=round(confidence, 4),
            warnings=warnings
        )
