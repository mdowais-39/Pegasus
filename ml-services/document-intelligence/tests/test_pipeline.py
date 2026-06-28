import sys
import os
from pathlib import Path
import pytest

# Add root folder of document-intelligence to sys.path
root_path = Path(__file__).parent.parent
if str(root_path) not in sys.path:
    sys.path.insert(0, str(root_path))

ocr_path = root_path.parent / "ocr"
if str(ocr_path) not in sys.path:
    sys.path.insert(0, str(ocr_path))

from orchestrator import DocumentIntelligenceOrchestrator

def test_pdf_extraction():
    orchestrator = DocumentIntelligenceOrchestrator()
    base_dir = Path(__file__).parent.parent.parent.parent
    pdf_path = base_dir / "datasets" / "bank-statements" / "Bank-statements-dataset" / "primary" / "00869354051.pdf"
    
    if pdf_path.exists():
        doc = orchestrator.process_document(str(pdf_path))
        assert doc is not None
        assert doc.metadata is not None
        assert len(doc.transactions) > 0
        assert doc.confidence >= 0.0

def test_csv_extraction():
    orchestrator = DocumentIntelligenceOrchestrator()
    base_dir = Path(__file__).parent.parent.parent.parent
    csv_path = base_dir / "datasets" / "bank-statements" / "Bank-statements-dataset" / "Secondary" / "138488664629235-23-11-2024to11-12-2025.csv"
    
    if csv_path.exists():
        doc = orchestrator.process_document(str(csv_path))
        assert doc is not None
        assert doc.metadata is not None
        assert len(doc.transactions) > 0

def test_excel_extraction():
    orchestrator = DocumentIntelligenceOrchestrator()
    base_dir = Path(__file__).parent.parent.parent.parent
    excel_path = base_dir / "datasets" / "bank-statements" / "Bank-statements-dataset" / "Secondary" / "112108374579 SOA.xlsx"
    
    if excel_path.exists():
        doc = orchestrator.process_document(str(excel_path))
        assert doc is not None
        assert doc.metadata is not None
        assert len(doc.transactions) > 0

def test_txt_extraction():
    orchestrator = DocumentIntelligenceOrchestrator()
    base_dir = Path(__file__).parent.parent.parent.parent
    txt_path = base_dir / "datasets" / "bank-statements" / "Bank-statements-dataset" / "Secondary" / "NITIN stat.txt"
    
    if txt_path.exists():
        doc = orchestrator.process_document(str(txt_path))
        assert doc is not None
        assert doc.metadata is not None
        assert len(doc.transactions) > 0
