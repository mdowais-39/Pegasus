import re
from datetime import datetime

MONTH_MAP = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4,
    "MAY": 5, "JUN": 6, "JUL": 7, "AUG": 8,
    "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
}


class DateNormalizer:

    def normalize(self, value):

        if not value:
            return None

        value_str = str(value).strip()

        if not value_str:
            return None

        # Try ISO format first
        try:
            dt = datetime.strptime(value_str, "%Y-%m-%d")
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass

        # DD-Mon-YY or DD-Mon-YYYY (e.g., 12-Oct-24, 12-Oct-2024)
        match = re.match(
            r"(\d{1,2})[-/](\w{3})[-/](\d{2,4})",
            value_str
        )
        if match:
            day, mon_str, year_str = match.groups()
            mon_num = MONTH_MAP.get(mon_str.upper())
            if mon_num:
                year = int(year_str)
                if year < 100:
                    year += 2000
                try:
                    dt = datetime(year, mon_num, int(day))
                    return dt.strftime("%Y-%m-%d")
                except ValueError:
                    pass

        # DD/MM/YYYY or DD-MM-YYYY
        match = re.match(
            r"(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})",
            value_str
        )
        if match:
            d1, d2, year = match.groups()
            day, month = int(d1), int(d2)
            if 1 <= day <= 31 and 1 <= month <= 12:
                try:
                    dt = datetime(int(year), month, day)
                    return dt.strftime("%Y-%m-%d")
                except ValueError:
                    pass

        # DD/MM/YY or DD-MM-YY
        match = re.match(
            r"(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$",
            value_str
        )
        if match:
            d1, d2, year_str = match.groups()
            day, month = int(d1), int(d2)
            year = int(year_str) + 2000
            if 1 <= day <= 31 and 1 <= month <= 12:
                try:
                    dt = datetime(year, month, day)
                    return dt.strftime("%Y-%m-%d")
                except ValueError:
                    pass

        # YYYY/MM/DD or YYYY-MM-DD (already handled by ISO, but explicit)
        match = re.match(
            r"(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})",
            value_str
        )
        if match:
            year, month, day = match.groups()
            try:
                dt = datetime(int(year), int(month), int(day))
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                pass

        # Mon DD, YYYY (e.g., Jan 15, 2024)
        match = re.match(
            r"(\w{3})\s+(\d{1,2}),?\s+(\d{4})",
            value_str
        )
        if match:
            mon_str, day, year = match.groups()
            mon_num = MONTH_MAP.get(mon_str.upper()[:3])
            if mon_num:
                try:
                    dt = datetime(int(year), mon_num, int(day))
                    return dt.strftime("%Y-%m-%d")
                except ValueError:
                    pass

        # DDMMYYYY (e.g., 22082024) - only if exactly 8 digits
        match = re.match(r"^(\d{2})(\d{2})(\d{4})$", value_str)
        if match:
            day, month, year = match.groups()
            day_i, month_i = int(day), int(month)
            if 1 <= day_i <= 31 and 1 <= month_i <= 12:
                try:
                    dt = datetime(int(year), month_i, day_i)
                    return dt.strftime("%Y-%m-%d")
                except ValueError:
                    pass

        # Fallback: dateutil with dayfirst=True for Indian dates
        try:
            from dateutil import parser as du_parser
            dt = du_parser.parse(
                value_str,
                fuzzy=True,
                dayfirst=True,
            )
            return dt.strftime("%Y-%m-%d")
        except Exception:
            pass

        return None
