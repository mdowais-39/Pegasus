from pydantic import BaseModel
from typing import Optional


class CanonicalTransaction(
    BaseModel
):

    date: Optional[str] = None

    narration: Optional[str] = None

    transaction_id: Optional[str] = None

    debit: Optional[str] = None

    credit: Optional[str] = None

    balance: Optional[str] = None