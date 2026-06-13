from models.transaction import (
    Transaction
)


def standardize_row(
    row,
    mapping,
):

    data = {}

    for source_col, target_col in (
        mapping.items()
    ):

        data[target_col] = row.get(
            source_col
        )

    return Transaction(
        **data
    )