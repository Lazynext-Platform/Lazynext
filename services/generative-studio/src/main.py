from fastapi import FastAPI
from src.routes import router
from src.telemetry import init_telemetry

app = FastAPI(title="Lazynext Generative Studio")
init_telemetry(app)

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8001, reload=True)
