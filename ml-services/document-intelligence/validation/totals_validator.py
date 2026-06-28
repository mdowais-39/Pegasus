from typing import List, Tuple
from schemas.transaction import CanonicalTransaction
from schemas.account import AccountMetadata

class TotalsValidator:
    def validate(self, metadata: AccountMetadata, transactions: List[CanonicalTransaction]) -> Tuple[bool, List[str]]:
        if not transactions:
            return True, []

        warnings = []
        total_debits = sum(tx.debit for tx in transactions if tx.debit is not None)
        total_credits = sum(tx.credit for tx in transactions if tx.credit is not None)
        
        opening_balance = metadata.opening_balance
        closing_balance = metadata.closing_balance
        
        if opening_balance is not None and closing_balance is not None:
            expected_closing = opening_balance + total_credits - total_debits
            if abs(expected_closing - closing_balance) > 0.05:
                warnings.append(
                    f"Totals mismatch: Opening ({opening_balance:.2f}) + Total Credits ({total_credits:.2f}) - "
                    f"Total Debits ({total_debits:.2f}) = {expected_closing:.2f}, but Closing Balance is {closing_balance:.2f}."
                )

        first_tx_bal = transactions[0].balance
        last_tx_bal = transactions[-1].balance
        
        if opening_balance is not None:
            # Checking if either end of the transaction list matches the opening balance
            if abs(first_tx_bal - opening_balance) > 0.1 and abs(last_tx_bal - opening_balance) > 0.1:
                warnings.append(f"Neither first transaction balance ({first_tx_bal:.2f}) nor last transaction balance ({last_tx_bal:.2f}) matches opening balance ({opening_balance:.2f}).")

        if closing_balance is not None:
            if abs(first_tx_bal - closing_balance) > 0.1 and abs(last_tx_bal - closing_balance) > 0.1:
                warnings.append(f"Neither first transaction balance ({first_tx_bal:.2f}) nor last transaction balance ({last_tx_bal:.2f}) matches closing balance ({closing_balance:.2f}).")

        if warnings:
            return False, warnings
        return True, []
