from typing import List, Tuple
from schemas.transaction import CanonicalTransaction

class BalanceValidator:
    def validate(self, transactions: List[CanonicalTransaction]) -> Tuple[bool, List[str]]:
        """
        Validates that for each transaction:
        previous_balance + credit - debit == current_balance
        or in reverse order if the statement is sorted in reverse.
        """
        if not transactions or len(transactions) < 2:
            return True, []

        errors_chrono = []
        for i in range(1, len(transactions)):
            prev = transactions[i-1]
            curr = transactions[i]
            
            prev_bal = prev.balance
            debit = curr.debit or 0.0
            credit = curr.credit or 0.0
            curr_bal = curr.balance
            
            expected = prev_bal + credit - debit
            if abs(expected - curr_bal) > 0.01:
                errors_chrono.append(f"Chrono mismatch at index {i}: expected {expected:.2f}, got {curr_bal:.2f}")

        errors_reverse = []
        for i in range(len(transactions) - 2, -1, -1):
            prev = transactions[i+1]
            curr = transactions[i]
            
            prev_bal = prev.balance
            debit = curr.debit or 0.0
            credit = curr.credit or 0.0
            curr_bal = curr.balance
            
            expected = prev_bal + credit - debit
            if abs(expected - curr_bal) > 0.01:
                errors_reverse.append(f"Reverse mismatch at index {i}: expected {expected:.2f}, got {curr_bal:.2f}")

        if not errors_chrono:
            return True, []
        if not errors_reverse:
            return True, []

        return False, [f"Balance validation failed. Chronological matches: {len(transactions) - len(errors_chrono)}/{len(transactions)}"]
