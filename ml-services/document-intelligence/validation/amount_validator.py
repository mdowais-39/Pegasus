from typing import List, Tuple
from schemas.transaction import CanonicalTransaction

class AmountValidator:
    def validate(self, transactions: List[CanonicalTransaction]) -> Tuple[bool, List[str]]:
        if not transactions:
            return True, []

        errors = []
        for idx, tx in enumerate(transactions):
            debit = tx.debit
            credit = tx.credit
            
            if debit is not None and debit > 0 and credit is not None and credit > 0:
                errors.append(f"Transaction at index {idx} has both debit={debit} and credit={credit} simultaneously.")
            
            if debit is not None and debit < 0:
                errors.append(f"Transaction at index {idx} has negative debit={debit}.")
            if credit is not None and credit < 0:
                errors.append(f"Transaction at index {idx} has negative credit={credit}.")

        if errors:
            return False, errors
        return True, []
