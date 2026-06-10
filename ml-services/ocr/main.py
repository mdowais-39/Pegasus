from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def health():
    return {
        "service": "ocr",
        "status": "healthy"
    }

@app.post("/extract")
def extract():
    return {
    "raw_rows": []
    }


