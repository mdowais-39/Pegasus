import sys
import logging
from pathlib import Path
from providers.base import DocumentProvider
from schemas.document import DocumentIR

logger = logging.getLogger(__name__)

class LegacyProvider(DocumentProvider):
    def extract(self, file_path: str) -> DocumentIR:
        # Graceful degradation check for optional fallback dependencies
        try:
            import pdfplumber
        except ImportError:
            logger.warning(
                "pdfplumber unavailable; skipping LegacyProvider fallback."
            )
            return None

        ocr_path = Path(__file__).parent.parent / "ocr"
        if str(ocr_path) not in sys.path:
            # Note: Path(__file__).parent.parent.parent points to ml-services, and / ocr points to ml-services/ocr
            actual_ocr_path = Path(__file__).parent.parent.parent / "ocr"
            sys.path.insert(0, str(actual_ocr_path))

        from services.extraction_service import ExtractionService
        from services.statement_understanding import StatementUnderstandingEngine

        extractor = ExtractionService()
        engine = StatementUnderstandingEngine()

        raw_result = extractor.extract(file_path)
        rows = raw_result.get("rows", [])

        # The legacy understanding engine process function expects raw text strings or dicts
        # Let's map it into strings if the process function expects strings
        # In RowGrouper/TableReconstructor it expects line strings.
        string_rows = []
        for r in rows:
            if isinstance(r, dict):
                string_rows.append(r.get("text", ""))
            else:
                string_rows.append(str(r))

        structured_rows = engine.process(string_rows)

        metadata = {
            "source_type": raw_result.get("source_type", "scanned_pdf"),
            "ocr_required": raw_result.get("ocr_required", False)
        }
        
        filename_lower = Path(file_path).name.lower()
        if "sbi" in filename_lower:
            metadata["bank_name"] = "State Bank of India"
        elif "hdfc" in filename_lower:
            metadata["bank_name"] = "HDFC Bank"
        elif "icici" in filename_lower:
            metadata["bank_name"] = "ICICI Bank"
        else:
            metadata["bank_name"] = "Unknown Bank"

        return DocumentIR(
            source_file=str(file_path),
            source_type=raw_result.get("source_type", "pdf"),
            extraction_method="legacy_ocr_pipeline",
            confidence=0.8 if raw_result.get("ocr_required", False) else 0.95,
            metadata=metadata,
            transactions=structured_rows
        )
