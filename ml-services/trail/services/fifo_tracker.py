"""
FIFOTracker — Core Requirement 5 (Money Trail Analysis), implemented precisely.

Spec: "When a credit amount is received, track how that money is spent (debited)
until it reaches the previous balance (before credit). If multiple credits
occur, follow FIFO (First In First Out)."

Model: each CREDIT opens a 'lot' of money. Each subsequent DEBIT consumes from
the OLDEST open lot(s) first (FIFO). For every credit we therefore produce the
ordered list of debit transactions that spent it — and, crucially, WHERE each
debit sent the money (counterparty), which is what makes the trail useful to an
investigator.

Input: one account's transactions in chronological order. Each txn dict may use
`debit_credit` ("DEBIT"/"CREDIT") or legacy `type`; fields: txn_id, date,
amount, narration, balance.
"""

from services.counterparty import resolve as resolve_counterparty
from services.location_parser import parse_location, is_cash_narration


def _direction(txn):
    return (txn.get("debit_credit") or txn.get("type") or "").upper()


class FIFOTracker:

    def trace(self, transactions):
        """Return a trail per credit (FIFO-matched to the debits that spent it)."""
        open_lots = []          # FIFO queue of {credit index + remaining}
        trails = {}             # credit_index -> trail dict
        idx = 0

        for txn in transactions:
            direction = _direction(txn)
            amount = self._amt(txn.get("amount"))
            if amount is None or amount <= 0:
                continue

            if direction == "CREDIT":
                trail = {
                    "credit_txn_id": txn.get("txn_id") or txn.get("id"),
                    "credit_date": txn.get("date"),
                    "credit_time": txn.get("time"),
                    "credit_amount": round(amount, 2),
                    "credit_narration": txn.get("narration"),
                    "credit_reference": txn.get("reference_number"),
                    "credit_balance": txn.get("balance"),
                    "source": resolve_counterparty(txn.get("narration")),
                    "consumed_by": [],
                    "spent": 0.0,
                    "remaining": round(amount, 2),
                    "fully_traced": False,
                }
                trails[idx] = trail
                open_lots.append({"i": idx, "remaining": amount})
                idx += 1

            elif direction == "DEBIT":
                remaining_debit = amount
                dest = resolve_counterparty(txn.get("narration"))
                while remaining_debit > 1e-9 and open_lots:
                    lot = open_lots[0]
                    take = min(remaining_debit, lot["remaining"])
                    trail = trails[lot["i"]]
                    consumed = {
                        "debit_txn_id": txn.get("txn_id") or txn.get("id"),
                        "date": txn.get("date"),
                        "time": txn.get("time"),
                        "amount": round(take, 2),          # portion traced to THIS credit
                        "debit_total": round(amount, 2),   # full debit-transaction amount
                        "leftover": round(amount - take, 2),  # rest of the debit (other sources)
                        "destination": dest,
                        "narration": txn.get("narration"),
                        "reference_number": txn.get("reference_number"),
                        "balance": txn.get("balance"),
                    }
                    # ATM / cash-out physical location, when this debit is a withdrawal
                    if is_cash_narration(txn.get("narration")):
                        loc = parse_location(txn.get("narration"))
                        if loc["location"]["city"] != "Unknown":
                            consumed["location"] = loc["location"]
                    trail["consumed_by"].append(consumed)
                    trail["spent"] = round(trail["spent"] + take, 2)
                    trail["remaining"] = round(trail["remaining"] - take, 2)
                    lot["remaining"] -= take
                    remaining_debit -= take
                    if lot["remaining"] <= 1e-9:
                        trail["fully_traced"] = True
                        open_lots.pop(0)

        return [trails[i] for i in sorted(trails)]

    def trace_for_credit(self, transactions, transaction_id):
        """Return the single trail whose credit matches transaction_id, or, if
        the id is a debit, the credits that funded that debit (reverse view)."""
        all_trails = self.trace(transactions)
        for t in all_trails:
            if str(t["credit_txn_id"]) == str(transaction_id):
                return {"kind": "credit_trail", "trail": t}

        funded_by = []
        for t in all_trails:
            for c in t["consumed_by"]:
                if str(c["debit_txn_id"]) == str(transaction_id):
                    funded_by.append({
                        "credit_txn_id": t["credit_txn_id"],
                        "credit_date": t["credit_date"],
                        "credit_amount": t["credit_amount"],
                        "source": t["source"],
                        "amount_from_this_credit": c["amount"],
                    })
        if funded_by:
            return {"kind": "debit_funding", "transaction_id": transaction_id,
                    "funded_by": funded_by}
        return {"kind": "not_found", "transaction_id": transaction_id}

    @staticmethod
    def _amt(v):
        try:
            return float(str(v).replace(",", "").strip())
        except Exception:
            return None
