from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class Transaction(BaseModel):
    transaction_id: str
    transaction_date: datetime
    value_date: Optional[datetime] = None
    description: str
    debit: Optional[float] = None
    credit: Optional[float] = None
    balance: float
    reference_number: Optional[str] = None
    transaction_channel: Optional[str] = None
