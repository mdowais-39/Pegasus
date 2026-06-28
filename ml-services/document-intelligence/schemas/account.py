from pydantic import BaseModel
from typing import Optional

class AccountMetadata(BaseModel):
    account_holder: str
    account_number: str
    customer_id: Optional[str] = None
    ifsc: Optional[str] = None
    branch: Optional[str] = None
    bank_name: str
    account_type: Optional[str] = None
    statement_start: Optional[str] = None
    statement_end: Optional[str] = None
    opening_balance: Optional[float] = None
    closing_balance: Optional[float] = None
    currency: Optional[str] = "INR"
