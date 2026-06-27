import pandas as pd


class CSVParser:

    def parse(
        self,
        file_path: str,
    ):

        for sep in [",", "\t", ";", "|"]:
            try:
                df = pd.read_csv(
                    file_path,
                    dtype=str,
                    sep=sep,
                    on_bad_lines="skip",
                )

                if len(df.columns) >= 3:
                    df = df.fillna("")
                    return {
                        "source_type": "csv",
                        "rows": df.to_dict(
                            orient="records"
                        )
                    }
            except Exception:
                continue

        try:
            df = pd.read_csv(
                file_path,
                sep=None,
                engine="python",
                dtype=str,
                on_bad_lines="skip",
            )

            if len(df.columns) >= 3:
                df = df.fillna("")
                return {
                    "source_type": "csv",
                    "rows": df.to_dict(
                        orient="records"
                    )
                }
        except Exception:
            pass

        df = pd.read_csv(
            file_path,
            dtype=str,
            on_bad_lines="skip",
        )

        df = df.fillna("")

        return {
            "source_type": "csv",
            "rows": df.to_dict(
                orient="records"
            )
        }
