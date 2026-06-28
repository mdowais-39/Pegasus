from pydantic import BaseModel
from .account import AccountMetadata
from .transaction import Transaction

class CanonicalDocument(BaseModel):
    metadata: AccountMetadata
    transactions: list[Transaction]
