import pdfplumber
import re


class PDFParser:

    def parse(self, file_path: str):
        all_rows = []
        all_text = []

        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                # Extract text (fast)
                page_text = page.extract_text()
                if page_text:
                    all_text.append(page_text)

        # Parse text lines into structured dicts
        if all_text:
            parsed_lines = []
            for page_text in all_text:
                for line in page_text.split("\n"):
                    line = line.strip()
                    if line:
                        parsed_lines.append({"text": line})
            if parsed_lines:
                return {
                    "source_type": "pdf",
                    "rows": parsed_lines,
                    "ocr_required": False,
                }

        # No text at all — needs OCR
        return {
            "source_type": "pdf",
            "rows": [],
            "ocr_required": True,
        }
