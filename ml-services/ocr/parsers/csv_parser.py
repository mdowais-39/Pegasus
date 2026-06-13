import pandas as pd


class CSVParser:

    def parse(self, file_path: str):

        df = pd.read_csv(file_path)

        return {
            "source_type": "csv",
            "rows": df.to_dict(
                orient="records"
            )
        }