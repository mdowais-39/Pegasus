# FinIntel AI — Statement Profile System Design

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Profile Registry                     │
│  {bank_name: Profile} + GenericProfile fallback      │
└──────────────────────┬──────────────────────────────┘
                       │
         ┌─────────────▼──────────────┐
         │     Profile Router          │
         │  1. Bank detection          │
         │  2. Profile lookup          │
         │  3. Fallback to Generic     │
         └─────────────┬──────────────┘
                       │
         ┌─────────────▼──────────────┐
         │     Statement Profile       │
         │  - parser_strategy          │
         │  - header_mapping           │
         │  - metadata_patterns        │
         │  - amount_format            │
         │  - date_format              │
         │  - delimiter                │
         │  - header_row_hint          │
         └─────────────┬──────────────┘
                       │
         ┌─────────────▼──────────────┐
         │     Extraction Pipeline      │
         │  (uses profile to guide)     │
         └────────────────────────────┘
```

---

## 2. StatementProfile Model

```python
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class StatementProfile:
    # Identity
    bank_name: str
    confidence: float  # 0.0-1.0 how confident we are in bank detection
    profile_name: str  # e.g., "sbi_excel", "generic_pdf"

    # Parser Configuration
    parser_strategy: str  # "pdf_text", "pdf_ocr", "csv", "excel", "fixed_width"
    delimiter: Optional[str]  # ",", "\t", None (fixed-width)
    encoding: str  # "utf-8", "latin-1", etc.

    # Header Detection
    header_row_hint: Optional[int]  # Known header row (None = auto-detect)
    header_keywords: list[str]  # Keywords to find header row
    header_min_matches: int  # Minimum keyword matches to confirm header

    # Column Mapping
    header_mapping: dict[str, list[str]]  # canonical_name -> [aliases]

    # Amount Configuration
    amount_format: str  # "plain", "indian_commas", "parenthesized_negative"
    currency_symbol: str  # "₹", "", etc.
    debit_column: Optional[str]  # Column name hint for debit
    credit_column: Optional[str]  # Column name hint for credit
    amount_column: Optional[str]  # Column name hint for single amount
    balance_column: Optional[str]  # Column name hint for balance

    # Date Configuration
    date_format: str  # "DD-MM-YYYY", "DD-MM-YY", "DD-Mon-YY", "auto"
    date_column: Optional[str]  # Column name hint for date
    value_date_column: Optional[str]  # Column name hint for value date

    # Metadata Patterns
    metadata_patterns: dict[str, str]  # field_name -> regex pattern
    account_number_pattern: Optional[str]  # regex for account number
    ifsc_pattern: Optional[str]  # regex for IFSC
    holder_name_position: str  # "filename", "header", "none"

    # Table Detection
    table_start_method: str  # "keyword_scan", "fixed_row", "first_data"
    table_end_method: str  # "eof", "summary_keyword", "balance_check"

    # OCR Configuration (for scanned PDFs)
    ocr_engine: str  # "paddleocr", "tesseract"
    ocr_language: str  # "en", "hi"
    scan_quality_threshold: float  # Minimum OCR confidence

    # Narration Parsing
    narration_patterns: dict[str, list[str]]  # txn_type -> [keywords]
    upi_pattern: Optional[str]  # regex for UPI ID extraction
    reference_pattern: Optional[str]  # regex for reference extraction
```

---

## 3. Profile Definitions

### GenericProfile (Default Fallback)

```python
GENERIC_PROFILE = StatementProfile(
    bank_name="Unknown",
    confidence=0.0,
    profile_name="generic",

    parser_strategy="auto",  # detect from extension
    delimiter=None,  # auto-detect
    encoding="utf-8",

    header_row_hint=None,  # auto-detect
    header_keywords=["date", "txn", "description", "narration", "particulars",
                     "remarks", "debit", "credit", "withdrawal", "deposit",
                     "balance", "ref", "amount"],
    header_min_matches=3,

    header_mapping={
        "date": ["date", "txn date", "transaction date", "value date",
                 "txn_date", "trans_date", "gl. date", "dat_txn_processing"],
        "narration": ["narration", "description", "remarks", "particulars",
                      "details", "txn_particular", "tran_particular",
                      "txt_txn_desc", "txt_tran_particular"],
        "transaction_id": ["transaction id", "txn id", "utr", "ref no",
                          "reference", "chq_no", "chq-no", "instrmnt number",
                          "ref_txn_no", "tran_id"],
        "debit": ["debit", "withdrawal", "withdraw", "dr", "dr_amt",
                  "transaction debit amount"],
        "credit": ["credit", "deposit", "cr", "cr_amt",
                   "transaction credit amount"],
        "balance": ["balance", "closing balance", "available balance", "bal"],
        "sender_account": ["sender", "from_account", "source_account"],
        "receiver_account": ["receiver", "to_account", "destination_account"],
        "amount": ["amount", "transaction_amount", "amt_txn_lcy"],
        "bank_name": ["bank", "bank_name"],
        "txn_type": ["txn_type", "transaction_type", "cod_txn_mnemonic"],
    },

    amount_format="auto",
    currency_symbol="₹",
    debit_column=None,  # auto-detect
    credit_column=None,
    amount_column=None,
    balance_column=None,

    date_format="auto",
    date_column=None,
    value_date_column=None,

    metadata_patterns={
        "account_number": r"\b\d{9,18}\b",
        "ifsc": r"[A-Z]{4}0[A-Z0-9]{6}",
        "holder_name": r"(?:name|account\s*name|customer\s*name)[:\s]+([A-Z\s]+)",
    },
    account_number_pattern=r"\b\d{9,18}\b",
    ifsc_pattern=r"[A-Z]{4}0[A-Z0-9]{6}",
    holder_name_position="header",

    table_start_method="keyword_scan",
    table_end_method="eof",

    ocr_engine="paddleocr",
    ocr_language="en",
    scan_quality_threshold=0.6,

    narration_patterns={
        "UPI": ["UPI"],
        "IMPS": ["IMPS"],
        "NEFT": ["NEFT"],
        "RTGS": ["RTGS"],
        "ATM": ["ATM", "CASH WDR", "CWDR"],
        "CHEQUE": ["CHEQUE", "CHQ", "CLG"],
        "CASH": ["CASH", "CASA"],
        "SALARY": ["SALARY"],
        "EMI": ["EMI"],
    },
    upi_pattern=r"([a-zA-Z0-9._-]+@[a-zA-Z]+)",
    reference_pattern=r"\b(\d{6,20})\b",
)
```

### SBI Profile

```python
SBI_PROFILE = StatementProfile(
    bank_name="SBI",
    confidence=0.9,
    profile_name="sbi",

    parser_strategy="excel",  # SBI primarily uses Excel exports
    delimiter=None,
    encoding="utf-8",

    header_row_hint=None,  # auto-detect (usually row 1)
    header_keywords=["ref_txn_no", "dat_txn_processing", "cod_drcr",
                     "amt_txn_lcy", "txt_txn_desc"],
    header_min_matches=3,

    header_mapping={
        "date": ["dat_txn_processing", "dat_txn_value", "dat_txn_posting"],
        "narration": ["txt_txn_desc", "txt_tran_particular", "txt_txn_narrative_to"],
        "transaction_id": ["ref_txn_no"],
        "debit": [],  # Use COD_DRCR column instead
        "credit": [],
        "amount": ["amt_txn_lcy"],
        "balance": [],  # Not in standard SBI export
        "txn_type": ["cod_txn_mnemonic"],
    },

    amount_format="plain",
    currency_symbol="",
    debit_column="cod_drcr",  # C or D indicator
    credit_column="cod_drcr",
    amount_column="amt_txn_lcy",
    balance_column=None,

    date_format="DD-Mon-YY",
    date_column="dat_txn_processing",
    value_date_column="dat_txn_value",

    metadata_patterns={
        "account_number": r"COD_ACCT_NO[:\s]+(\d+)",
        "ifsc": r"SBIN\d{7}",
    },
    account_number_pattern=r"COD_ACCT_NO",
    ifsc_pattern=r"SBIN\d{7}",
    holder_name_position="header",

    table_start_method="keyword_scan",
    table_end_method="eof",

    ocr_engine="paddleocr",
    ocr_language="en",
    scan_quality_threshold=0.7,

    narration_patterns={
        "UPI": ["UPI", "VPA"],
        "IMPS": ["IMPS"],
        "NEFT": ["NEFT"],
        "RTGS": ["RTGS"],
        "ATM": ["ATM", "CASH"],
        "CHEQUE": ["CHEQUE", "CHQ"],
        "CASH": ["CASA", "CASH"],
    },
    upi_pattern=r"VPA\s+([a-zA-Z0-9._-]+@[a-zA-Z]+)",
    reference_pattern=r"RRN\s+(\d+)",
)
```

### HDFC Profile

```python
HDFC_PROFILE = StatementProfile(
    bank_name="HDFC",
    confidence=0.9,
    profile_name="hdfc",

    parser_strategy="pdf_text",
    delimiter=None,
    encoding="utf-8",

    header_row_hint=None,
    header_keywords=["date", "narration", "chq", "withdrawal", "deposit", "balance"],
    header_min_matches=4,

    header_mapping={
        "date": ["date", "value date"],
        "narration": ["narration", "description"],
        "transaction_id": ["chq/ref no", "reference"],
        "debit": ["withdrawal"],
        "credit": ["deposit"],
        "balance": ["balance"],
    },

    amount_format="indian_commas",
    currency_symbol="₹",
    debit_column="withdrawal",
    credit_column="deposit",
    balance_column="balance",

    date_format="DD/MM/YYYY",
    date_column="date",
    value_date_column="value date",

    metadata_patterns={
        "account_number": r"A/c\s*No[:\s]+(\d+)",
        "ifsc": r"HDFC\d{7}",
        "holder_name": r"Name[:\s]+([A-Z\s]+)",
    },
    account_number_pattern=r"A/c\s*No",
    ifsc_pattern=r"HDFC\d{7}",
    holder_name_position="header",

    table_start_method="keyword_scan",
    table_end_method="eof",

    narration_patterns={
        "UPI": ["UPI", "VPA", "UPIIN"],
        "IMPS": ["IMPS", "MMT"],
        "NEFT": ["NEFT", "NFT"],
        "RTGS": ["RTGS"],
        "ATM": ["ATM"],
        "CHEQUE": ["CHQ", "CHEQUE"],
        "CASH": ["CASH"],
        "EMI": ["EMI", "LOAN"],
    },
    upi_pattern=r"VPA\s+([a-zA-Z0-9._-]+@[a-zA-Z]+)",
    reference_pattern=r"(?:RRN|UTR|Ref)\s*[:=]?\s*(\d{6,20})",
)
```

### ICICI Profile

```python
ICICI_PROFILE = StatementProfile(
    bank_name="ICICI",
    confidence=0.9,
    profile_name="icici",

    parser_strategy="csv",
    delimiter=",",
    encoding="utf-8",

    header_row_hint=1,  # Usually first row
    header_keywords=["ac_no", "tran_id", "tran_date", "dr_amt", "cr_amt", "narration"],
    header_min_matches=4,

    header_mapping={
        "date": ["tran_date"],
        "narration": ["narration"],
        "transaction_id": ["tran_id"],
        "debit": ["dr_amt"],
        "credit": ["cr_amt"],
        "balance": ["balance"],
    },

    amount_format="plain",
    currency_symbol="",
    debit_column="dr_amt",
    credit_column="cr_amt",
    balance_column="balance",

    date_format="DD-MM-YYYY",
    date_column="tran_date",

    metadata_patterns={
        "account_number": r"Ac_No[:\s]+(\d+)",
        "ifsc": r"ICIC\d{7}",
        "holder_name": r"AC_Name[:\s]+([A-Z\s]+)",
    },
    account_number_pattern=r"Ac_No",
    ifsc_pattern=r"ICIC\d{7}",
    holder_name_position="first_row",

    table_start_method="fixed_row",
    table_end_method="eof",

    narration_patterns={
        "UPI": ["UPI"],
        "IMPS": ["IMPS", "MMT"],
        "NEFT": ["NEFT", "NFT"],
        "RTGS": ["RTGS"],
        "ATM": ["ATM", "CASH WDL"],
        "CHEQUE": ["CLG", "BIL"],
        "CASH": ["CAM", "CASH"],
    },
    upi_pattern=r"([a-zA-Z0-9._-]+@[a-zA-Z]+)",
    reference_pattern=r"(?:UTR|Ref)\s*[:=]?\s*(\d{6,20})",
)
```

### Axis Profile

```python
AXIS_PROFILE = StatementProfile(
    bank_name="Axis",
    confidence=0.9,
    profile_name="axis",

    parser_strategy="csv",
    delimiter=",",
    encoding="utf-8",

    header_row_hint=None,  # Usually around row 7-10
    header_keywords=["tran_date", "chqno", "particulars", "dr", "cr", "bal"],
    header_min_matches=4,

    header_mapping={
        "date": ["tran_date"],
        "narration": ["particulars"],
        "transaction_id": ["chqno"],
        "debit": ["dr"],
        "credit": ["cr"],
        "balance": ["bal"],
    },

    amount_format="plain",
    currency_symbol="",
    debit_column="dr",
    credit_column="cr",
    balance_column="bal",

    date_format="DD-MM-YYYY",
    date_column="tran_date",

    metadata_patterns={
        "account_number": r"Account\s*Number[:\s]+(\d+)",
        "ifsc": r"UTIB\d{7}",
    },
    account_number_pattern=r"Account\s*Number",
    ifsc_pattern=r"UTIB\d{7}",
    holder_name_position="header",

    table_start_method="keyword_scan",
    table_end_method="summary_keyword",

    narration_patterns={
        "UPI": ["UPI"],
        "IMPS": ["IMPS"],
        "NEFT": ["NEFT"],
        "RTGS": ["RTGS"],
        "ATM": ["ATM", "CASH"],
        "CHEQUE": ["CHQ"],
        "CASH": ["CASH"],
    },
    upi_pattern=r"UPI/(?:P2A|P2P|REC|PAY)/\d+/([a-zA-Z0-9._-]+@[a-zA-Z]+)",
    reference_pattern=r"UPI/(?:P2A|P2P|REC|PAY)/(\d+)",
)
```

---

## 4. Profile Registry

```python
class ProfileRegistry:
    def __init__(self):
        self.profiles: dict[str, StatementProfile] = {}
        self.fallback = GENERIC_PROFILE
        self._register_defaults()

    def _register_defaults(self):
        self.register(SBI_PROFILE)
        self.register(HDFC_PROFILE)
        self.register(ICICI_PROFILE)
        self.register(AXIS_PROFILE)
        # Add more as discovered

    def register(self, profile: StatementProfile):
        self.profiles[profile.bank_name.lower()] = profile

    def get_profile(self, bank_name: str) -> StatementProfile:
        return self.profiles.get(bank_name.lower(), self.fallback)

    def detect_and_get(self, file_path: str, content: str = "") -> StatementProfile:
        bank = detect_bank(file_path, content)
        return self.get_profile(bank)
```

---

## 5. Bank Detection Strategy

```python
def detect_bank(file_path: str, content: str = "") -> str:
    """
    Multi-signal bank detection:
    1. IFSC code in content (most reliable)
    2. Bank name in filename
    3. Bank name in content
    4. Header pattern matching
    5. Unknown (falls back to generic)
    """
    content_upper = content.upper()
    filename_upper = os.path.basename(file_path).upper()

    # Priority 1: IFSC codes
    ifsc_map = {
        "SBIN": "SBI", "HDFC": "HDFC", "ICIC": "ICICI",
        "UTIB": "Axis", "KKBK": "Kotak", "PUNB": "PNB",
        "CNRB": "Canara", "MAHB": "Bank of Maharashtra",
        "IDBI": "IDBI", "INDB": "IndusInd", "YESB": "Yes Bank",
        "FDRL": "Federal Bank", "IDFB": "IDFC First",
        "BKID": "Bank of India", "UBIN": "Union Bank",
    }
    for prefix, bank in ifsc_map.items():
        if prefix in content_upper:
            return bank

    # Priority 2: Filename patterns
    filename_map = {
        "SBI": "SBI", "HDFC": "HDFC", "ICICI": "ICICI",
        "AXIS": "Axis", "KOTAK": "Kotak", "PNB": "PNB",
        "CANARA": "Canara", "BOM": "Bank of Maharashtra",
    }
    for keyword, bank in filename_map.items():
        if keyword in filename_upper:
            return bank

    # Priority 3: Content patterns
    content_map = {
        "STATE BANK": "SBI", "PUNJAB NATIONAL": "PNB",
        "BANK OF MAHARASHTRA": "Bank of Maharashtra",
        "INDUSIND": "IndusInd", "YES BANK": "Yes Bank",
        "BANK OF BARODA": "Bank of Baroda",
    }
    for keyword, bank in content_map.items():
        if keyword in content_upper:
            return bank

    return "Unknown"
```

---

## 6. Integration Points

### With OCR Pipeline

```python
# In extraction_service.py
def extract(self, file_path: str) -> dict:
    profile = self.profile_registry.detect_and_get(file_path)

    if profile.parser_strategy == "pdf_text":
        parser = PDFParser()
    elif profile.parser_strategy == "csv":
        parser = CSVParser()
    elif profile.parser_strategy == "excel":
        parser = ExcelParser()
    elif profile.parser_strategy == "pdf_ocr":
        parser = ScannedPDFParser()
    elif profile.parser_strategy == "fixed_width":
        parser = FixedWidthParser()  # NEW
    else:
        parser = self.registry.get_parser(file_path)

    return parser.parse(file_path)
```

### With Standardization Service

```python
# In standardization_service.py
def process(self, rows: list[dict], profile: StatementProfile = None) -> list:
    if profile is None:
        profile = GENERIC_PROFILE

    headers = list(rows[0].keys()) if rows else []
    mapping = map_columns(headers, profile.header_mapping)
    # ... rest of pipeline
```

### With Worker (Rust Backend)

```python
# Worker sends profile along with file
@app.post("/extract")
def extract(request: ExtractRequest):
    profile = registry.detect_and_get(request.file_path)
    result = extractor.extract(request.file_path, profile)
    return {
        "rows": result["rows"],
        "profile": profile.profile_name,
        "bank": profile.bank_name
    }
```

---

## 7. Extensibility

Adding a new bank requires:

1. **Create profile definition** (copy GenericProfile, customize fields)
2. **Register in ProfileRegistry** (one line: `self.register(NEW_BANK_PROFILE)`)
3. **Test against sample statements** from that bank
4. **No code changes** to extraction or standardization pipeline

Example:
```python
KOTAK_PROFILE = StatementProfile(
    bank_name="Kotak",
    parser_strategy="csv",
    delimiter="\t",  # Kotak uses tab-delimited
    header_keywords=["tran-date", "tran_particular", "withdrawal", "deposit"],
    # ... customize as needed
)
registry.register(KOTAK_PROFILE)
```

---

## 8. Migration Path

### Phase 1: Generic Profile Only
- Use GENERIC_PROFILE for all banks
- Auto-detect delimiter, headers, formats
- Validate against all 162 files

### Phase 2: Add Top 5 Bank Profiles
- SBI, HDFC, ICICI, Axis, PNB
- Known header patterns, date formats, amount formats
- Test against files from these banks

### Phase 3: Expand to All Discovered Banks
- Canara, Federal Bank, Bank of Maharashtra, Kotak, etc.
- Add profiles as new files are processed
- Community contributions welcome

### Phase 4: Auto-Profile Learning
- Analyze failed files
- Suggest profile customizations
- Auto-generate profile from sample files
