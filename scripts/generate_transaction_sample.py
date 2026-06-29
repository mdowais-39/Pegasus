#!/usr/bin/env python3

"""
Generate a small transaction inspection report from standardized artifacts.

Usage:
    python scripts/generate_transaction_sample.py
    python scripts/generate_transaction_sample.py --limit 10
    python scripts/generate_transaction_sample.py --partition primary
    python scripts/generate_transaction_sample.py --partition secondary --limit 20
"""

import argparse
import json
from pathlib import Path
from datetime import datetime


def main():

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--root",
        default="artifacts/standardized",
        help="Standardized artifacts root",
    )

    parser.add_argument(
        "--partition",
        default=None,
        choices=["primary", "secondary"],
        help="Inspect only one partition",
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Number of documents to inspect",
    )

    args = parser.parse_args()

    root = Path(args.root)

    if args.partition:
        search_root = root / args.partition
    else:
        search_root = root

    report = {
        "generated_at": datetime.now().isoformat(),
        "partition": args.partition or "all",
        "documents": [],
    }

    count = 0

    for tx_file in sorted(search_root.rglob("transactions.json")):

        if count >= args.limit:
            break

        try:

            with open(tx_file, "r", encoding="utf-8") as f:
                transactions = json.load(f)

            doc_dir = tx_file.parent

            metadata_file = doc_dir / "metadata.json"

            metadata = {}

            if metadata_file.exists():
                with open(metadata_file, "r", encoding="utf-8") as f:
                    metadata = json.load(f)

            sample = transactions[:5]

            report["documents"].append({
                "document_name": doc_dir.name,
                "transaction_count": len(transactions),

                "metadata": {
                    "bank_name": metadata.get("bank_name"),
                    "account_holder": metadata.get("account_holder"),
                    "account_number": metadata.get("account_number"),
                },

                "sample_transactions": sample
            })

            count += 1

        except Exception as e:

            report["documents"].append({
                "document_name": tx_file.parent.name,
                "error": str(e)
            })

    output_file = root / "transaction_sample_report.json"

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(
            report,
            f,
            indent=4,
            ensure_ascii=False
        )

    print(f"[SUCCESS] Generated: {output_file}")
    print(f"Documents inspected: {len(report['documents'])}")


if __name__ == "__main__":
    main()