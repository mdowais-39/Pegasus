from fastapi import FastAPI
from pydantic import BaseModel

from services.standardization_service import (
    StandardizationService
)

app = FastAPI()

service = StandardizationService()


class StandardizeRequest(BaseModel):
    rows: list


@app.get("/health")
def health():
    return {
        "service": "standardize",
        "status": "healthy"
    }


@app.post("/standardize")
def standardize(
    request: StandardizeRequest
):

    result = service.process(
        request.rows
    )

    return {
        "transactions": [
            row.model_dump()
            for row in result
        ]
    }