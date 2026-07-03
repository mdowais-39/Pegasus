import os
import tempfile

from pdf2image import convert_from_path

from services.ocr_service import OCRService
from services.ocr_line_builder import boxes_to_page_text


class ScannedPDFParser:

    def __init__(self):
        self.ocr = OCRService()

    def parse(self, file_path: str):
        pages = convert_from_path(file_path)

        page_texts = []
        # Render each page to a temp PNG, OCR it, reconstruct reading-order text.
        # A TemporaryDirectory guarantees the intermediate images are cleaned up
        # (the old code left temp_page_*.png behind in the working directory).
        with tempfile.TemporaryDirectory() as tmp_dir:
            for index, page in enumerate(pages):
                image_path = os.path.join(tmp_dir, f"page_{index}.png")
                page.save(image_path, "PNG")

                boxes = self.ocr.extract_text(image_path)
                text = boxes_to_page_text(boxes)
                if text:
                    page_texts.append(text)

        return {
            "source_type": "scanned_pdf",
            "rows": page_texts,
            "extraction": "ocr",
        }
