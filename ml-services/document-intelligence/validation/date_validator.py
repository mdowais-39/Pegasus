from typing import List, Tuple
from datetime import datetime
from schemas.transaction import CanonicalTransaction

class DateValidator:
    def validate(self, transactions: List[CanonicalTransaction]) -> Tuple[bool, List[str]]:
        if not transactions:
            return True, []

        errors = []
        now = datetime.now()
        for idx, tx in enumerate(transactions):
            dt = tx.transaction_date
            
            # Basic sanity checks on year
            if dt.year > now.year + 1 or dt.year < 1980:
                errors.append(f"Transaction at index {idx} has anomalous transaction date: {dt}")
                
            if tx.value_date is not None:
                vdt = tx.value_date
                if vdt.year > now.year + 1 or vdt.year < 1980:
                    errors.append(f"Transaction at index {idx} has anomalous value date: {vdt}")

        if errors:
            return False, errors
        return True, []
