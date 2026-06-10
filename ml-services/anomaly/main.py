from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def health():
    return {
        "service": "anomaly",
        "status": "healthy"
    }


@app.post("/anomaly")
def anomaly():
    return {
        "score": 0.0,
        "patterns": []
    }

