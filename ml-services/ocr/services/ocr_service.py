import ssl
import certifi

_original_create_default_context = ssl.create_default_context


def fixed_context(*args, **kwargs):
    return _original_create_default_context(
        cafile=certifi.where()
    )


ssl.create_default_context = fixed_context


class OCRService:
    """
    Thin wrapper over PaddleOCR.

    The heavy PaddleOCR model is loaded lazily on first use so that merely
    importing this module (which happens at OCR-service boot, via the parser
    registry) never fails when paddleocr isn't installed — text PDF / CSV /
    XLSX / DOCX ingestion keeps working, and only the image / scanned-PDF paths
    require the OCR engine.
    """

    def __init__(self):
        self._ocr = None

    def _engine(self):
        if self._ocr is None:
            from paddleocr import PaddleOCR
            self._ocr = PaddleOCR(use_angle_cls=True, lang="en")
        return self._ocr

    def extract_text(self, image_path: str):
        result = self._engine().ocr(image_path, cls=True)

        extracted_lines = []
        for page in result:
            if page is None:
                continue
            for line in page:
                extracted_lines.append({
                    "text": line[1][0],
                    "bbox": line[0],
                    "confidence": float(line[1][1]),
                })
        return extracted_lines
