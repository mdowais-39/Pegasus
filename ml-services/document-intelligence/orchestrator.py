import os
from pathlib import Path
from providers.pdf_provider import PDFProvider
from providers.csv_provider import CSVProvider
from providers.excel_provider import ExcelProvider
from providers.txt_provider import TXTProvider
from providers.legacy_provider import LegacyProvider
from canonical_mapper import CanonicalMapper
from schemas.document import CanonicalDocument

class DocumentIntelligenceOrchestrator:
    def __init__(self):
        self.providers = {
            ".pdf": PDFProvider(),
            ".csv": CSVProvider(),
            ".xlsx": ExcelProvider(),
            ".xls": ExcelProvider(),
            ".txt": TXTProvider()
        }
        self.legacy_provider = LegacyProvider()
        self.mapper = CanonicalMapper()

    def process_document(self, file_path: str) -> CanonicalDocument:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
            
        suffix = Path(file_path).suffix.lower()
        provider = self.providers.get(suffix, self.legacy_provider)
        
        print(f"[ORCHESTRATOR] Routing {file_path} (suffix: {suffix}) to {provider.__class__.__name__}")
        
        try:
            ir = provider.extract(file_path)
            doc = self.mapper.map_document(ir)
            return doc
        except Exception as e:
            print(f"[ORCHESTRATOR] [WARNING] Provider {provider.__class__.__name__} failed with error: {e}. Falling back to LegacyProvider...")
            try:
                ir_legacy = self.legacy_provider.extract(file_path)
                doc_legacy = self.mapper.map_document(ir_legacy)
                doc_legacy.warnings.append(f"Primary provider failed. Fell back to legacy pipeline. Error: {str(e)}")
                return doc_legacy
            except Exception as fallback_err:
                print(f"[ORCHESTRATOR] [ERROR] Fallback LegacyProvider also failed: {fallback_err}")
                raise fallback_err
