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

        amount = (
            debit
            if debit is not None
            else credit
        )

        debit_credit = (
            "DEBIT"
            if debit is not None
            else "CREDIT"
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
                txn.narration,

            balance=
                self.amount_norm.normalize(
                    txn.balance
                ),

            debit_credit=
                debit_credit,

            platform=
                parsed["platform"],

            upi_id=
                parsed["upi_id"]
        )