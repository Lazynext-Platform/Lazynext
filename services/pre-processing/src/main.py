"""
Lazynext Pre-Processing Service — FastAPI application entry point.

Provides media analysis endpoints: transcription, motion tracking,
rotoscoping, NeRF extraction, auto-reframing, audio enhancement,
retouching, hook extraction, proxy generation, and media ingestion.
"""

from fastapi import FastAPI, Depends
from src.routes import router
from src.auth import get_auth_claims

app = FastAPI(title="Lazynext Pre-Processing")

# Health check — no auth required
@app.get("/health")
async def health():
    """Liveness probe — returns service status without requiring auth."""
    return {"status": "ok", "service": "pre-processing"}

app.include_router(router, dependencies=[Depends(get_auth_claims)])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=False)
