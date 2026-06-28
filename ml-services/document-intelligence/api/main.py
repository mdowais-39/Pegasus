import sys
from pathlib import Path
import shutil
import os

# Add root folder of document-intelligence to sys.path
root_path = Path(__file__).parent.parent
if str(root_path) not in sys.path:
    sys.path.insert(0, str(root_path))

# Also add legay ocr folder
ocr_path = root_path.parent / "ocr"
if str(ocr_path) not in sys.path:
    sys.path.insert(0, str(ocr_path))

from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from orchestrator import DocumentIntelligenceOrchestrator
from schemas.document import CanonicalDocument

app = FastAPI(title="Backend-2.2 Hybrid Document Intelligence API")
orchestrator = DocumentIntelligenceOrchestrator()

class ExtractPathRequest(BaseModel):
    file_path: str

@app.post("/extract", response_model=CanonicalDocument)
def extract_from_path(request: ExtractPathRequest):
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="File path does not exist.")
    try:
        result = orchestrator.process_document(request.file_path)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

@app.post("/extract-file", response_model=CanonicalDocument)
def extract_from_file(file: UploadFile = File(...)):
    temp_dir = Path("temp_uploads")
    temp_dir.mkdir(exist_ok=True)
    temp_file_path = temp_dir / file.filename
    
    try:
        with temp_file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        result = orchestrator.process_document(str(temp_file_path))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")
    finally:
        if temp_file_path.exists():
            try:
                os.remove(temp_file_path)
            except Exception:
                pass
