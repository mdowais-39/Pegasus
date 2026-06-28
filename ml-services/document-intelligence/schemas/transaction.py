from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CanonicalTransaction(BaseModel):
    transaction_date: datetime
    value_date: Optional[datetime] = None
    narration: str
    reference_number: Optional[str] = None
    cheque_number: Optional[str] = None
    debit: Optional[float] = None
    credit: Optional[float] = None
    balance: float
    transaction_type: Optional[str] = None
    source_bank: Optional[str] = None
    source_file: Optional[str] = None
    confidence: float = 1.0
