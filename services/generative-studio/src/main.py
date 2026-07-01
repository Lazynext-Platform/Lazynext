"""
Lazynext Generative Studio — FastAPI application entry point.

Provides AI-powered media generation: video diffusion, dubbing,
overdubbing, style transfer, generative fill, avatar generation,
stem splitting, upscaling, and inpainting. Instruments with
OpenTelemetry via the telemetry module.
"""

from fastapi import FastAPI
from src.routes import router
from src.telemetry import init_telemetry

app = FastAPI(title="Lazynext Generative Studio")
init_telemetry(app)

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8001, reload=True)
