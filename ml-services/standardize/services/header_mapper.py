COLUMN_MAPPINGS = {

    "date": [
        "date",
        "txn date",
        "transaction date",
        "value date",
        "txn_date",
        "trans_date",
        "trans date",
        "tran-date",
        "tran_date",
        "gl. date",
        "dat_txn_processing",
        "dat_txn_value",
        "dat_txn_posting",
    ],

    "narration": [
        "narration",
        "description",
        "remarks",
        "particulars",
        "details",
        "txn_particular",
        "tran_particular",
        "txt_txn_desc",
        "txt_tran_particular",
        "particular",
    ],

    "transaction_id": [
        "transaction id",
        "txn id",
        "utr",
        "ref no",
        "reference",
        "chq_no",
        "chq-no",
        "chqno",
        "chq/no",
        "chq/ref no",
        "instrmnt number",
        "ref_txn_no",
        "tran_id",
        "chq number",
    ],

    "debit": [
        "debit",
        "withdrawal",
        "withdraw",
        "dr",
        "dr_amt",
        "dr. amt",
        "transaction debit amount",
        "withdrawals",
    ],

    "credit": [
        "credit",
        "deposit",
        "cr",
        "cr_amt",
        "cr. amt",
        "transaction credit amount",
        "deposits",
    ],

    "balance": [
        "balance",
        "closing balance",
        "available balance",
        "bal",
        "balance amount",
    ],

    # --------------------------------
    # Investigation Dataset Support
    # --------------------------------

    "sender_account": [
        "sender",
        "from_account",
        "source_account",
    ],

    "receiver_account": [
        "receiver",
        "to_account",
        "destination_account",
    ],

    "amount": [
        "amount",
        "transaction_amount",
        "amt_txn_lcy",
    ],

    "bank_name": [
        "bank",
        "bank_name",
    ],

    "txn_type": [
        "txn_type",
        "transaction_type",
        "cod_txn_mnemonic",
        "tran_type",
    ],
}


def map_columns(
    headers: list[str]
):

    mapping = {}

    for header in headers:

        normalized = (
            header
            .strip()
            .lower()
        )

        for target, aliases in (
            COLUMN_MAPPINGS.items()
        ):

            if any(
                alias in normalized
                for alias in aliases
            ):

                mapping[header] = target

    return mapping
