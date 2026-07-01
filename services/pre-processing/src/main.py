"""
Lazynext Pre-Processing Service — FastAPI application entry point.

Provides media analysis endpoints: transcription, motion tracking,
rotoscoping, NeRF extraction, auto-reframing, audio enhancement,
retouching, hook extraction, proxy generation, and media ingestion.
"""

from fastapi import FastAPI
from src.routes import router

app = FastAPI(title="Lazynext Pre-Processing")

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)
