"""
Deterministic CASH / ATM location + time extractor.

Turns an ATM/cash narration into the physical place the withdrawal or deposit
happened (city, state) so an investigating officer knows where to go. No LLM —
pure regex + an Indian city / state-code dictionary, so it's instant, offline
and reproducible. Returns "Unknown" gracefully when it can't confidently parse
(UPI / IMPS / NEFT narrations have no location and return Unknown).

Handles both spaced narrations ("... PIRANGUT MH IN ...") and compressed ones
("RAJWADAINDOREMPIN" -> Indore, Madhya Pradesh).
"""

import re

# 2-letter state / UT codes -> full name (includes common variants)
STATE_CODES = {
    "AN": "Andaman and Nicobar", "AP": "Andhra Pradesh", "AR": "Arunachal Pradesh",
    "AS": "Assam", "BR": "Bihar", "CH": "Chandigarh", "CG": "Chhattisgarh",
    "CT": "Chhattisgarh", "DL": "Delhi", "DN": "Dadra and Nagar Haveli",
    "GA": "Goa", "GJ": "Gujarat", "HR": "Haryana", "HP": "Himachal Pradesh",
    "JK": "Jammu and Kashmir", "JH": "Jharkhand", "KA": "Karnataka",
    "KL": "Kerala", "LA": "Ladakh", "LD": "Lakshadweep", "MP": "Madhya Pradesh",
    "MH": "Maharashtra", "MN": "Manipur", "ML": "Meghalaya", "MZ": "Mizoram",
    "NL": "Nagaland", "OD": "Odisha", "OR": "Odisha", "PY": "Puducherry",
    "PB": "Punjab", "RJ": "Rajasthan", "SK": "Sikkim", "TN": "Tamil Nadu",
    "TS": "Telangana", "TG": "Telangana", "TR": "Tripura", "UP": "Uttar Pradesh",
    "UK": "Uttarakhand", "UT": "Uttarakhand", "WB": "West Bengal",
}

# Major Indian cities -> state. Used for compressed-narration splitting and to
# infer a state when only the city is printed. Uppercase keys.
CITY_STATE = {
    "MUMBAI": "Maharashtra", "PUNE": "Maharashtra", "NAGPUR": "Maharashtra",
    "NASHIK": "Maharashtra", "THANE": "Maharashtra", "AURANGABAD": "Maharashtra",
    "SOLAPUR": "Maharashtra", "KOLHAPUR": "Maharashtra", "AMRAVATI": "Maharashtra",
    "NAVIMUMBAI": "Maharashtra", "PIMPRI": "Maharashtra",
    "DELHI": "Delhi", "NEWDELHI": "Delhi",
    "BENGALURU": "Karnataka", "BANGALORE": "Karnataka", "MYSORE": "Karnataka",
    "MYSURU": "Karnataka", "MANGALORE": "Karnataka", "HUBLI": "Karnataka",
    "BELGAUM": "Karnataka", "GULBARGA": "Karnataka",
    "CHENNAI": "Tamil Nadu", "COIMBATORE": "Tamil Nadu", "MADURAI": "Tamil Nadu",
    "TRICHY": "Tamil Nadu", "SALEM": "Tamil Nadu", "TIRUPUR": "Tamil Nadu",
    "ERODE": "Tamil Nadu", "VELLORE": "Tamil Nadu", "TIRUNELVELI": "Tamil Nadu",
    "HYDERABAD": "Telangana", "WARANGAL": "Telangana", "NIZAMABAD": "Telangana",
    "KOLKATA": "West Bengal", "HOWRAH": "West Bengal", "SILIGURI": "West Bengal",
    "DURGAPUR": "West Bengal", "ASANSOL": "West Bengal",
    "AHMEDABAD": "Gujarat", "SURAT": "Gujarat", "VADODARA": "Gujarat",
    "RAJKOT": "Gujarat", "BHAVNAGAR": "Gujarat", "JAMNAGAR": "Gujarat",
    "GANDHINAGAR": "Gujarat",
    "JAIPUR": "Rajasthan", "JODHPUR": "Rajasthan", "UDAIPUR": "Rajasthan",
    "KOTA": "Rajasthan", "AJMER": "Rajasthan", "BIKANER": "Rajasthan",
    "LUCKNOW": "Uttar Pradesh", "KANPUR": "Uttar Pradesh", "AGRA": "Uttar Pradesh",
    "VARANASI": "Uttar Pradesh", "MEERUT": "Uttar Pradesh", "ALLAHABAD": "Uttar Pradesh",
    "PRAYAGRAJ": "Uttar Pradesh", "GHAZIABAD": "Uttar Pradesh", "NOIDA": "Uttar Pradesh",
    "BAREILLY": "Uttar Pradesh", "ALIGARH": "Uttar Pradesh", "GORAKHPUR": "Uttar Pradesh",
    "INDORE": "Madhya Pradesh", "BHOPAL": "Madhya Pradesh", "JABALPUR": "Madhya Pradesh",
    "GWALIOR": "Madhya Pradesh", "UJJAIN": "Madhya Pradesh", "SAGAR": "Madhya Pradesh",
    "PATNA": "Bihar", "GAYA": "Bihar", "BHAGALPUR": "Bihar", "MUZAFFARPUR": "Bihar",
    "CHANDIGARH": "Chandigarh", "LUDHIANA": "Punjab", "AMRITSAR": "Punjab",
    "JALANDHAR": "Punjab", "PATIALA": "Punjab",
    "GURGAON": "Haryana", "GURUGRAM": "Haryana", "FARIDABAD": "Haryana",
    "PANIPAT": "Haryana", "AMBALA": "Haryana", "KARNAL": "Haryana",
    "KOCHI": "Kerala", "COCHIN": "Kerala", "THIRUVANANTHAPURAM": "Kerala",
    "KOZHIKODE": "Kerala", "THRISSUR": "Kerala", "KOLLAM": "Kerala",
    "BHUBANESWAR": "Odisha", "CUTTACK": "Odisha", "ROURKELA": "Odisha",
    "GUWAHATI": "Assam", "DIBRUGARH": "Assam", "SILCHAR": "Assam",
    "RANCHI": "Jharkhand", "JAMSHEDPUR": "Jharkhand", "DHANBAD": "Jharkhand",
    "BOKARO": "Jharkhand",
    "RAIPUR": "Chhattisgarh", "BHILAI": "Chhattisgarh", "BILASPUR": "Chhattisgarh",
    "DEHRADUN": "Uttarakhand", "HARIDWAR": "Uttarakhand", "ROORKEE": "Uttarakhand",
    "SHIMLA": "Himachal Pradesh", "PANAJI": "Goa", "VASCO": "Goa",
    "VIJAYAWADA": "Andhra Pradesh", "VISAKHAPATNAM": "Andhra Pradesh",
    "VIZAG": "Andhra Pradesh", "GUNTUR": "Andhra Pradesh", "NELLORE": "Andhra Pradesh",
    "TIRUPATI": "Andhra Pradesh", "SRINAGAR": "Jammu and Kashmir", "JAMMU": "Jammu and Kashmir",
}

_TIME = re.compile(r"\b(\d{1,2}:\d{2}(?::\d{2})?)\b")
_UNKNOWN = {"location": {"city": "Unknown", "state": "Unknown", "country": "India"}, "time": "Unknown"}

# markers that identify a physical cash/ATM transaction
_CASH_MARKERS = ("ATM", "CASH", "NFS", "CWDL", "CW/", "WDL", "WITHDRAWAL",
                 "CASHDEP", "CDM", "MICRO ATM", "AEPS")
# tokens that are never a place name
_NON_PLACE = {
    "ATM", "CASH", "NFS", "WDL", "CWDL", "SELF", "IN", "INDIA", "WITHDRAWAL",
    "CDM", "CW", "DR", "CR", "AEPS", "POS", "TXN", "REF", "IAD", "NA",
}


def _title(word):
    return word.capitalize() if word else word


def _extract_time(narration):
    m = _TIME.search(narration or "")
    return m.group(1) if m else "Unknown"


def parse_location(narration):
    """Return {"location": {city, state, country}, "time"} or the Unknown result."""
    narr = (narration or "").strip()
    up = narr.upper()
    if not narr or not any(mk in up for mk in _CASH_MARKERS):
        return dict(_UNKNOWN)

    time = _extract_time(narr)
    city = None
    state = None

    # Strategy A — spaced: "<CITY> <STATE_CODE> ..." (e.g. "PIRANGUT MH IN")
    words = re.findall(r"[A-Z]{2,}", up)
    for i, w in enumerate(words):
        if w in STATE_CODES and i > 0:
            prev = words[i - 1]
            if prev not in _NON_PLACE and prev not in STATE_CODES and len(prev) >= 3:
                city = _title(prev)
                state = STATE_CODES[w]
                # keep scanning: prefer the LAST such occurrence (ATM site)

    # Strategy B — compressed / dictionary: find a known city as a substring,
    # then read a glued state code right after it if present.
    glued = re.sub(r"[^A-Z]", "", up)
    best = None  # (position, city_key)
    for ck in CITY_STATE:
        idx = glued.rfind(ck)
        if idx != -1:
            if best is None or idx > best[0] or (idx == best[0] and len(ck) > len(best[1])):
                best = (idx, ck)
    if best is not None:
        ck = best[1]
        after = glued[best[0] + len(ck): best[0] + len(ck) + 2]
        b_state = STATE_CODES.get(after, CITY_STATE[ck])
        # Prefer the dictionary city (more reliable than an arbitrary token) when
        # strategy A didn't find an explicit spaced state code.
        if city is None or state is None:
            city, state = _title(ck), b_state

    if not city and not state:
        return {"location": {"city": "Unknown", "state": "Unknown", "country": "India"},
                "time": time}

    return {
        "location": {
            "city": city or "Unknown",
            "state": state or "Unknown",
            "country": "India",
        },
        "time": time,
    }


def is_cash_narration(narration):
    up = (narration or "").upper()
    return any(mk in up for mk in _CASH_MARKERS)
