from services.header_mapper import (
    map_columns
)

from services.row_standardizer import (
    standardize_row
)

from services.transaction_enricher import (
    TransactionEnricher
)


class StandardizationService:

    def __init__(self):

        self.enricher = (
            TransactionEnricher()
        )

    def process(
        self,
        rows
    ):

        if not rows:
            return []

        headers = list(
            rows[0].keys()
        )

        mapping = (
            map_columns(
                headers
            )
        )

        standardized = []

        for row in rows:

            canonical = (
                standardize_row(
                    row,
                    mapping
                )
            )

            enriched = (
                self.enricher.enrich(
                    canonical
                )
            )

            standardized.append(
                enriched
            )

        return standardized