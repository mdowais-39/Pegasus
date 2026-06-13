from services.header_mapper import (
    map_columns
)

from services.row_standardizer import (
    standardize_row
)


class StandardizationService:

    def process(
        self,
        rows,
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

            standardized.append(
                standardize_row(
                    row,
                    mapping
                )
            )

        return standardized