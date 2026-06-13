from pydantic import BaseModel


class Transaction(BaseModel):

    date: str | None = None

    narration: str | None = None

    transaction_id: str | None = None

    debit: float | None = None

    credit: float | None = None

    balance: float | None = None