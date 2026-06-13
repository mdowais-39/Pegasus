from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
def health():
    return {
        "service": "entity",
        "status": "healthy"
    }

@app.post("/entities")
def entities():
    return {
        "entities": []
    }

