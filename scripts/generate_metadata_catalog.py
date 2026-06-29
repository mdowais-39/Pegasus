#!/usr/bin/env python3
"""
Generate a consolidated metadata catalog from all standardized artifacts.

Output:
    artifacts/standardized/metadata_full_dataset.json
"""

from pathlib import Path
import json
from datetime import datetime


ARTIFACTS_ROOT = Path(
    "artifacts/standardized"
)

OUTPUT_FILE = ARTIFACTS_ROOT / "metadata_full_dataset.json"


def load_json(path: Path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        return {
            "__load_error__": str(e)
        }


def main():

    dataset_metadata = {
        "generated_at": datetime.now().isoformat(),
        "artifacts_root": str(ARTIFACTS_ROOT.resolve()),
        "total_documents": 0,
        "documents": []
    }

    for metadata_file in ARTIFACTS_ROOT.rglob("metadata.json"):

        document_dir = metadata_file.parent

        try:

            metadata = load_json(metadata_file)

            relative_path = document_dir.relative_to(
                ARTIFACTS_ROOT
            )

            document_entry = {
                "document_name": document_dir.name,
                "artifact_path": str(relative_path),
                "dataset_partition": (
                    relative_path.parts[0]
                    if len(relative_path.parts) > 1
                    else "root"
                ),
                "metadata": metadata
            }

            dataset_metadata["documents"].append(
                document_entry
            )

        except Exception as e:

            dataset_metadata["documents"].append(
                {
                    "document_name": document_dir.name,
                    "artifact_path": str(document_dir),
                    "error": str(e)
                }
            )

    dataset_metadata["documents"].sort(
        key=lambda x: (
            x["dataset_partition"],
            x["document_name"]
        )
    )

    dataset_metadata["total_documents"] = len(
        dataset_metadata["documents"]
    )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            dataset_metadata,
            f,
            indent=4,
            ensure_ascii=False
        )

    print(
        f"[SUCCESS] Generated metadata catalog:\n"
        f"{OUTPUT_FILE}\n"
        f"Documents: {dataset_metadata['total_documents']}"
    )


if __name__ == "__main__":
    main()