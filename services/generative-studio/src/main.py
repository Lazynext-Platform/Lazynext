"""
Lazynext Generative Studio — FastAPI application entry point.

Provides AI-powered media generation: video diffusion, dubbing,
overdubbing, style transfer, generative fill, avatar generation,
stem splitting, upscaling, and inpainting. Instruments with
OpenTelemetry via the telemetry module.
"""

from fastapi import FastAPI, Depends
from src.routes import router
from src.telemetry import init_telemetry
from src.auth import get_auth_claims

app = FastAPI(title="Lazynext Generative Studio")
init_telemetry(app)

# Health check — no auth required
@app.get("/health")
async def health():
    """Liveness probe — returns service status without requiring auth."""
    return {"status": "ok", "service": "generative-studio"}

app.include_router(router, dependencies=[Depends(get_auth_claims)])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8001, reload=True)
