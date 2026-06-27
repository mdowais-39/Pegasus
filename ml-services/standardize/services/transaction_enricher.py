from models.transaction import (
    StandardizedTransaction
)

from services.date_normalizer import (
    DateNormalizer
)

from services.amount_normalizer import (
    AmountNormalizer
)

from services.narration_parser import (
    NarrationParser
)


class TransactionEnricher:

    def __init__(self):

        self.date_norm = (
            DateNormalizer()
        )

        self.amount_norm = (
            AmountNormalizer()
        )

        self.parser = (
            NarrationParser()
        )

    def enrich(
        self,
        txn
    ):

        # --------------------------------
        # Investigation Dataset Path
        # --------------------------------

        if (
            txn.sender_account
            or txn.receiver_account
        ):

            amount_val = None
            if txn.amount is not None:
                try:
                    amount_val = float(txn.amount)
                except (ValueError, TypeError):
                    amount_val = self.amount_norm.normalize(
                        txn.amount
                    )
            elif txn.debit is not None:
                amount_val = self.amount_norm.normalize(
                    txn.debit
                )
            elif txn.credit is not None:
                amount_val = self.amount_norm.normalize(
                    txn.credit
                )

            return StandardizedTransaction(

                date=
                    self.date_norm.normalize(
                        txn.date
                    ),

                amount=amount_val,

                txn_type=
                    txn.txn_type,

                sender_account=
                    txn.sender_account,

                receiver_account=
                    txn.receiver_account,

                bank_name=
                    txn.bank_name,

                debit_credit=None,

                narration=None,

                narration_normalized=None,

                reference_number=None,

                balance=None,

                platform=None,

                upi_id=None
            )

        # --------------------------------
        # Bank Statement Path
        # --------------------------------

        parsed = (
            self.parser.parse(
                txn.narration
            )
        )

        debit = (
            self.amount_norm.normalize(
                txn.debit
            )
        )

        credit = (
            self.amount_norm.normalize(
                txn.credit
            )
        )

        # Determine amount and debit_credit
        if debit is not None and credit is not None:
            # Both present: prefer the larger one as amount
            # but keep both for reference
            amount = debit if debit > 0 else credit
            if debit > 0:
                debit_credit = "DEBIT"
            else:
                debit_credit = "CREDIT"
        elif debit is not None:
            amount = debit
            debit_credit = "DEBIT"
        elif credit is not None:
            amount = credit
            debit_credit = "CREDIT"
        elif txn.amount is not None:
            # Fallback to single amount field
            amount = self.amount_norm.normalize(
                txn.amount
            )
            debit_credit = None
        else:
            amount = None
            debit_credit = None

        # Normalize narration
        narration_text = txn.narration or ""
        narration_normalized = (
            narration_text.lower().strip()
            if narration_text
            else None
        )

        return StandardizedTransaction(

            date=
                self.date_norm.normalize(
                    txn.date
                ),

            amount=amount,

            txn_type=
                parsed["txn_type"],

            reference_number=
                txn.transaction_id,

            narration=
                txn.narration,

            narration_normalized=
                narration_normalized,

            balance=
                self.amount_norm.normalize(
                    txn.balance
                ),

            debit_credit=
                debit_credit,

            platform=
                parsed["platform"],

            upi_id=
                parsed["upi_id"],

            bank_name=
                txn.bank_name
        )
