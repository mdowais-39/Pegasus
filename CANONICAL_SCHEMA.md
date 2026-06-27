# FinIntel AI — Canonical Transaction Schema

---

## 1. Design Principles

1. **Bank-agnostic:** Every bank's output maps to this single schema
2. **Completeness:** All fields from any bank format are captured
3. **Optionality:** Fields not available from a source are `null`, never fabricated
4. **Traceability:** Raw source data preserved for audit
5. **Downstream-ready:** Schema supports all intelligence layers (graph, anomaly, temporal, risk)

---

## 2. Canonical Transaction Schema

```json
{
  "statement_id": "uuid",
  "transaction_id": "uuid",

  "transaction_date": "2025-01-15",
  "value_date": "2025-01-15",

  "description": "UPI/P2A/841789701195/Rahul@ybl/PAYMENT",
  "narration_normalized": "UPI payment to rahul@ybl",

  "debit_amount": null,
  "credit_amount": 5000.00,
  "amount": 5000.00,
  "debit_credit": "CREDIT",

  "balance": 45000.00,

  "reference_number": "841789701195",
  "transaction_type": "UPI",
  "platform": "UPI",

  "sender_account": null,
  "receiver_account": null,
  "counterparty_name": "RAHUL",
  "counterparty_vpa": "rahul@ybl",
  "counterparty_account": null,
  "counterparty_ifsc": null,

  "upi_id": "rahul@ybl",
  "upi_type": "P2A",

  "bank_name": "HDFC",
  "account_number": "50100012345678",
  "ifsc": "HDFC0001234",

  "is_duplicate": false,
  "is_failed": false,
  "is_valid": true,
  "confidence_score": 0.95,
  "validation_notes": [],

  "source_file": "statement.pdf",
  "source_format": "PDF",
  "parser_used": "pdfplumber",
  "raw_row": {}
}
```

---

## 3. Field Definitions

### Identity Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `statement_id` | UUID | Yes | Links to statements table |
| `transaction_id` | UUID | Yes | Unique transaction identifier |

### Date Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transaction_date` | ISO date | Yes | Date transaction was recorded (YYYY-MM-DD) |
| `value_date` | ISO date | No | Date transaction value was applied (may differ from txn date) |

**Normalization rules:**
- `DD-MM-YYYY` → `YYYY-MM-DD`
- `DD-MM-YY` → `YYYY-MM-DD` (assume 2000+)
- `DD-Mon-YY` → `YYYY-MM-DD`
- `DD/MM/YYYY` → `YYYY-MM-DD`
- `YYYY-MM-DD` → as-is
- Unparseable → `null` (flag in validation_notes)

### Amount Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `debit_amount` | float | No | Debit amount (money out) |
| `credit_amount` | float | No | Credit amount (money in) |
| `amount` | float | Yes | Transaction amount (always positive) |
| `debit_credit` | enum | Yes | `"DEBIT"` or `"CREDIT"` |
| `balance` | float | No | Running balance after transaction |

**Determination rules:**
1. If source has separate DR/CR columns: `debit_amount` from DR column, `credit_amount` from CR column
2. If source has single signed amount: negative → `debit_amount`, positive → `credit_amount`
3. `amount` = `max(debit_amount, credit_amount)` (always positive)
4. `debit_credit` = `"DEBIT"` if `debit_amount` is set, else `"CREDIT"`
5. Indian lakh commas (`1,50,212.00`) → `150212.00`
6. Parenthesized negatives `(500.00)` → `debit_amount = 500.00`
7. `Cr`/`Dr` suffix on balance → stripped, value preserved

### Description Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | Yes | Raw narration/description from source |
| `narration_normalized` | string | No | Cleaned/normalized narration |
| `reference_number` | string | No | UTR, cheque number, or transaction reference |
| `transaction_type` | enum | Yes | UPI, IMPS, NEFT, RTGS, ATM, CHEQUE, CASH, SALARY, EMI, TRANSFER, OTHER |
| `platform` | string | No | Payment platform (UPI, IMPS, NEFT, RTGS, etc.) |

**Classification rules:**
- `transaction_type` determined from narration keywords (priority: UPI > IMPS > NEFT > RTGS > ATM > CHEQUE > CASH > SALARY > EMI > TRANSFER > OTHER)
- `platform` extracted from narration when structured format available
- `narration_normalized` = cleaned version (lowercase, whitespace normalized, special chars removed)

### Counterparty Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sender_account` | string | No | Source account (investigation data only) |
| `receiver_account` | string | No | Destination account (investigation data only) |
| `counterparty_name` | string | No | Name of other party |
| `counterparty_vpa` | string | No | UPI VPA of counterparty |
| `counterparty_account` | string | No | Account number of counterparty |
| `counterparty_ifsc` | string | No | IFSC of counterparty's bank |

### UPI Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `upi_id` | string | No | UPI ID from narration |
| `upi_type` | string | No | P2P, P2M, COLLECT, etc. |

### Source Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bank_name` | string | Yes | Bank name (detected or from metadata) |
| `account_number` | string | Yes | Account number (from metadata or filename) |
| `ifsc` | string | No | IFSC code |

### Validation Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `is_duplicate` | bool | Yes | Flagged by duplicate detector |
| `is_failed` | bool | Yes | Flagged as failed/reversed |
| `is_valid` | bool | Yes | Passed all validation checks |
| `confidence_score` | float | No | 0.0-1.0 confidence in extraction quality |
| `validation_notes` | list[str] | No | Human-readable validation notes |

### Audit Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source_file` | string | Yes | Original filename |
| `source_format` | string | Yes | PDF, CSV, Excel, TXT |
| `parser_used` | string | Yes | Which parser extracted this transaction |
| `raw_row` | object | No | Original unprocessed row data |

---

## 4. Database Mapping

### PostgreSQL `transactions` Table

| DB Column | Schema Field | Type |
|-----------|--------------|------|
| `id` | `transaction_id` | UUID |
| `statement_id` | `statement_id` | UUID FK |
| `date` | `transaction_date` | DATE |
| `sender_account` | `sender_account` | TEXT |
| `receiver_account` | `receiver_account` | TEXT |
| `amount` | `amount` | DECIMAL(15,2) |
| `txn_type` | `transaction_type` | TEXT |
| `upi_id` | `upi_id` | TEXT |
| `narration` | `description` | TEXT |
| `narration_normalized` | `narration_normalized` | TEXT |
| `balance` | `balance` | DECIMAL(15,2) |
| `bank_name` | `bank_name` | TEXT |
| `raw_row` | `raw_row` | JSONB |
| `reference_number` | `reference_number` | TEXT |
| `debit_credit` | `debit_credit` | TEXT |
| `platform` | `platform` | TEXT |
| `is_duplicate` | `is_duplicate` | BOOLEAN |
| `is_failed` | `is_failed` | BOOLEAN |
| `is_valid` | `is_valid` | BOOLEAN |
| `confidence_score` | `confidence_score` | FLOAT |
| `validation_notes` | `validation_notes` | JSONB |

### New Columns Needed

| Column | Type | Migration |
|--------|------|-----------|
| `value_date` | DATE | `ALTER TABLE transactions ADD COLUMN value_date DATE` |
| `debit_amount` | DECIMAL(15,2) | `ALTER TABLE transactions ADD COLUMN debit_amount DECIMAL(15,2)` |
| `credit_amount` | DECIMAL(15,2) | `ALTER TABLE transactions ADD COLUMN credit_amount DECIMAL(15,2)` |
| `counterparty_name` | TEXT | `ALTER TABLE transactions ADD COLUMN counterparty_name TEXT` |
| `counterparty_vpa` | TEXT | `ALTER TABLE transactions ADD COLUMN counterparty_vpa TEXT` |
| `counterparty_account` | TEXT | `ALTER TABLE transactions ADD COLUMN counterparty_account TEXT` |
| `counterparty_ifsc` | TEXT | `ALTER TABLE transactions ADD COLUMN counterparty_ifsc TEXT` |
| `upi_type` | TEXT | `ALTER TABLE transactions ADD COLUMN upi_type TEXT` |
| `source_file` | TEXT | `ALTER TABLE transactions ADD COLUMN source_file TEXT` |
| `source_format` | TEXT | `ALTER TABLE transactions ADD COLUMN source_format TEXT` |
| `parser_used` | TEXT | `ALTER TABLE transactions ADD COLUMN parser_used TEXT` |

---

## 5. Example Mappings

### Example 1: Axis Bank CSV

**Source:**
```
TRAN_DATE: 15-02-2025
PARTICULARS: UPI/P2A/841789701195/Rahul@ybl/PAYMENT
CHQNO: -
DR: 
CR: 5000.00
BAL: 45000.00
```

**Canonical:**
```json
{
  "transaction_date": "2025-02-15",
  "description": "UPI/P2A/841789701195/Rahul@ybl/PAYMENT",
  "debit_amount": null,
  "credit_amount": 5000.00,
  "amount": 5000.00,
  "debit_credit": "CREDIT",
  "balance": 45000.00,
  "reference_number": "841789701195",
  "transaction_type": "UPI",
  "platform": "UPI",
  "upi_id": "Rahul@ybl",
  "upi_type": "P2A",
  "bank_name": "Axis"
}
```

### Example 2: PNB Fixed-Width TXT

**Source:**
```
19-05-2025  19-05-2025  ATM WDR 2322 PNB \PNB SHASTRI NAGAR\JODHP  10000.00          140231.00Cr
```

**Canonical:**
```json
{
  "transaction_date": "2025-05-19",
  "value_date": "2025-05-19",
  "description": "ATM WDR 2322 PNB \\PNB SHASTRI NAGAR\\JODHP",
  "debit_amount": 10000.00,
  "credit_amount": null,
  "amount": 10000.00,
  "debit_credit": "DEBIT",
  "balance": 140231.00,
  "transaction_type": "ATM",
  "bank_name": "PNB"
}
```

### Example 3: SBI Excel

**Source:**
```
REF_TXN_NO: 501556555372
DAT_TXN_PROCESSING: 12-Oct-24
COD_DRCR: C
AMT_TXN_LCY: 4500
TXT_TXN_DESC: CASA:Payment received via UPI from VPA 7987698273@ptaxis from RRN 501556555372
```

**Canonical:**
```json
{
  "transaction_date": "2024-10-12",
  "description": "CASA:Payment received via UPI from VPA 7987698273@ptaxis from RRN 501556555372",
  "narration_normalized": "payment received via upi from vpa 7987698273@ptaxis",
  "debit_amount": null,
  "credit_amount": 4500.00,
  "amount": 4500.00,
  "debit_credit": "CREDIT",
  "reference_number": "501556555372",
  "transaction_type": "UPI",
  "platform": "UPI",
  "upi_id": "7987698273@ptaxis",
  "bank_name": "SBI"
}
```

---

## 6. Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `transaction_date` not null | ERROR | Must have a date |
| `amount` > 0 | ERROR | Amount must be positive |
| `debit_credit` in ["DEBIT", "CREDIT"] | ERROR | Must be one of the two |
| Exactly one of `debit_amount`/`credit_amount` is non-null | WARNING | Should be exclusively debit or credit |
| `balance` is not null | WARNING | Balance should be present |
| `reference_number` is not null | INFO | Reference preferred |
| `transaction_type` != "OTHER" | INFO | Should be classified |
| `confidence_score` >= 0.7 | WARNING | Low confidence extraction |
| Date within statement period | WARNING | Date outside expected range |
| Balance continuity check | INFO | Consecutive balances should reconcile |
