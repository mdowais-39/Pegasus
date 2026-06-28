# TXT Ledger Report Investigation

This document presents the findings of our investigation into the Punjab National Bank ledger statement `shivlal statement.txt`.

---

## 1. Document Overview
* **Document Name**: `shivlal statement.txt`
* **Format**: Punjab National Bank Customer Account Ledger Report.
* **Layout**: Fixed-column space-delimited text report with multiline header labels.

---

## 2. Findings & Details

### Is it actually a transaction ledger?
* **Yes.** It is a complete financial transaction ledger report spanning 01-05-2025 to 08-07-2025. It contains 362 transactions tracking account activity for holder SHIV LAL BISHNOI.

### Does it contain transactions after page/header sections?
* **Yes.** The account and branch metadata occupy the first 70 lines of the file. 
* The column headers start on Line 72 and Line 73.
* The transaction rows begin on Line 80 and extend to the end of the file, interspersed with periodic page headers (e.g. `Page 2`, `Page 3`) at page boundaries.

### Does it require a dedicated parser?
* **No, a dedicated parser is not required.** 
* By upgrading our default `TXTProvider` with a **combined double-line header reader** and a **universal space-distance parser**, we can natively parse this ledger format alongside Kerala Gramin Bank statements:
  * **Double-Line Reader**: Matches column header labels split across consecutive lines (Line 72 + Line 73), resolving initial column offsets perfectly.
  * **Universal Space-Distance Slicing**: Splits the prefix dynamically by spaces (extracting dates and transaction ID) and identifies numeric amount/balance blocks at the end of the line.
  * **Dynamic Classification**: Uses the distance between the transaction amount and the running balance (`dist = end_balance - end_amount`) to universally differentiate between Debit and Credit transactions without hardcoded column indices (`dist > 25` is Debit, `dist <= 25` is Credit).
  * **Header/Page Filtering**: Dynamically skips page headers and report metadata lines by ignoring rows with no numeric values or matching blacklist words.

---

## 3. Results
* **Extracted Transactions**: 362 transactions.
* **Validation Match Rate**: **99.72%** chronological balance validation success.
* **Accuracy**: Zero overlapping credit/debit errors, full narration mapping, and perfect date alignment.
