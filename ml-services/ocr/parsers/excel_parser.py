import pandas as pd


class ExcelParser:

    def parse(self, file_path: str):

        try:
            df = pd.read_excel(
                file_path,
                dtype=str,
            )

            df = df.fillna("")

            return {
                "source_type": "excel",
                "rows": df.to_dict(
                    orient="records"
                )
            }

        except Exception:
            pass

        try:
            df = pd.read_excel(
                file_path,
                dtype=str,
                header=None,
            )

            df = df.fillna("")

            keywords = {
                "DATE", "NARRATION", "DEBIT", "CREDIT", "BALANCE",
                "DESCRIPTION", "VALUE DATE", "CHEQUE", "REFERENCE",
                "WITHDRAWAL", "DEPOSIT", "PARTICULARS", "TXN DATE",
                "TRANSACTION", "TRAN-DATE", "TRAN_DATE", "DR", "CR",
                "PARTICULAR", "AC_NO", "TRN", "BAL",
                "COD_DRCR", "AMT_TXN_LCY", "TXT_TXN_DESC",
            }

            header_row = -1
            for i in range(min(30, len(df))):
                row_vals = [
                    str(v).upper().strip()
                    for v in df.iloc[i]
                    if pd.notna(v)
                ]
                matches = sum(
                    1
                    for v in row_vals
                    if any(k in v for k in keywords)
                )
                if matches >= 3:
                    header_row = i
                    break

            if header_row >= 0:
                headers = [
                    str(v).strip()
                    for v in df.iloc[header_row]
                    if pd.notna(v) and str(v).strip()
                ]

                data_df = df.iloc[header_row + 1:].copy()

                if len(data_df.columns) > len(headers):
                    extra = [
                        f"_extra_{i}"
                        for i in range(
                            len(data_df.columns) - len(headers)
                        )
                    ]
                    data_df.columns = headers + extra
                    data_df = data_df[headers]
                else:
                    data_df.columns = headers[:len(data_df.columns)]

                data_df = data_df.fillna("")

                return {
                    "source_type": "excel",
                    "rows": data_df.to_dict(
                        orient="records"
                    )
                }

            df.columns = [
                f"col_{i}" for i in range(len(df.columns))
            ]

            return {
                "source_type": "excel",
                "rows": df.to_dict(
                    orient="records"
                )
            }

        except Exception as e:
            raise ValueError(
                f"Failed to parse Excel: {e}"
            )
