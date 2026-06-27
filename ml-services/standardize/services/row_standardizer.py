from models.canonical_transaction import (
    CanonicalTransaction
)


def _parse_amount(val):
    """Parse amount string like '50,000.00' to float."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    if not s:
        return None
    # Remove commas, currency symbols, Cr/Dr suffixes
    s = s.replace(",", "").replace("₹", "").replace("$", "").replace("€", "")
    s = s.replace("Cr", "").replace("Dr", "").strip()
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


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

    # Parse numeric fields
    for field in ["debit", "credit", "balance", "amount"]:
        if field in data:
            data[field] = _parse_amount(data[field])

    return CanonicalTransaction(
        **data
    )
