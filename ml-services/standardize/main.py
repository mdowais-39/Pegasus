from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def health():
    return {
        "service": "standardize",
        "status": "healthy"
    }

@app.post("/standardize")
def standardize():
    return {
        "transactions": []
    }