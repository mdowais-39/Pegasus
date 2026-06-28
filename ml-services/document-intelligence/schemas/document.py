from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from .account import AccountMetadata
from .transaction import CanonicalTransaction

class DocumentIR(BaseModel):
    source_file: str
    source_type: str
    extraction_method: str
    confidence: float
    metadata: Dict[str, Any]
    transactions: List[Dict[str, Any]]

class CanonicalDocument(BaseModel):
    metadata: AccountMetadata
    transactions: List[CanonicalTransaction]
    confidence: float
    warnings: List[str] = []
