import re


class AmountNormalizer:

    def normalize(self, value):

        if value is None:
            return None

        value_str = str(value).strip()

        if not value_str:
            return None

        # Handle parenthesized negatives: (500.00) -> -500.00
        is_negative = False
        if value_str.startswith("(") and value_str.endswith(")"):
            is_negative = True
            value_str = value_str[1:-1].strip()

        # Handle explicit negative sign
        if value_str.startswith("-"):
            is_negative = True
            value_str = value_str[1:].strip()

        # Handle Dr/Cr suffix (balance columns)
        if value_str.upper().endswith("CR"):
            value_str = value_str[:-2].strip()
        elif value_str.upper().endswith("DR"):
            value_str = value_str[:-2].strip()
            is_negative = True

        # Remove currency symbols and whitespace
        value_str = re.sub(r"[₹$\s]", "", value_str)

        # Remove INR/Rs/Rs. prefixes
        value_str = re.sub(r"^INR\.?", "", value_str)
        value_str = re.sub(r"^Rs\.?", "", value_str)
        value_str = re.sub(r"^Rs", "", value_str)
        value_str = re.sub(r"^INR", "", value_str)

        # Remove Indian lakh commas: 1,50,212.00 -> 150212.00
        # If comma pattern matches Indian format (xx,xx,xxx), remove all commas
        if re.match(r"^\d{1,3}(,\d{2})*,\d{3}(\.\d+)?$", value_str):
            value_str = value_str.replace(",", "")
        else:
            # Standard comma removal: 1,500.00 -> 1500.00
            value_str = value_str.replace(",", "")

        # Handle empty string after cleaning
        if not value_str or value_str == ".":
            return None

        try:
            result = float(value_str)
            if is_negative:
                result = -result
            return result
        except ValueError:
            return None
