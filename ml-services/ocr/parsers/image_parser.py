from services.ocr_service import OCRService
from services.ocr_line_builder import boxes_to_page_text


class ImageParser:

    def __init__(self):
        self.ocr = OCRService()

    def parse(self, file_path: str):
        # OCR returns positioned boxes; reconstruct them into reading-order page
        # text so the downstream TextStatementReconstructor can recover rows —
        # exactly the path a text-based PDF takes.
        boxes = self.ocr.extract_text(file_path)
        page_text = boxes_to_page_text(boxes)

        return {
            "source_type": "image",
            "rows": [page_text] if page_text else [],
            "extraction": "ocr",
        }
