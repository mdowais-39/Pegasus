from pydantic import BaseModel
from typing import Optional

class AccountMetadata(BaseModel):
    customer_name: str
    account_number: str
    bank_name: str
    ifsc: Optional[str] = None
    branch: Optional[str] = None
    opening_balance: Optional[float] = None
    closing_balance: Optional[float] = None
