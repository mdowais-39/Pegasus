from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def health():
    return {
        "service": "temporal",
        "status": "healthy"
    }


@app.post("/temporal")
def temporal():
    return {
        "score": 0.0
    }