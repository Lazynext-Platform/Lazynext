# Pre-Processing

**ML-powered media analysis and pre-processing pipeline.**

## Port

`8000`

## Framework

Python — FastAPI + Uvicorn + PyTorch + OpenCV + scikit-image

## Description

Performs AI-driven analysis and pre-processing on video/audio media before editing. Endpoints include:

- `POST /transcribe` — Whisper-based audio transcription
- `POST /process` — Scene detection, silence detection, clip analysis
- `POST /rotoscope` — SAM2-based foreground/background segmentation (rotoscoping)
- `POST /nerf-extract` — NeRF-based 3D reconstruction from video
- `POST /track` — Motion tracking and object following
- `POST /auto-reframe` — Intelligent aspect ratio reframing (e.g., 16:9 to 9:16)
- `POST /enhance-audio` — Audio cleanup (noise reduction, EQ, leveling)
- `POST /retouch` — AI-assisted video retouching
- `POST /extract-hook` — Viral hook / highlight extraction
- `POST /generate-proxies` — Low-res proxy generation for editing
- `POST /ingest` — Media ingestion and metadata extraction

## How to Run

```bash
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

Or directly:

```bash
python src/main.py
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8000` | HTTP listen port |
| `MODEL_CACHE_DIR` | — | Directory for downloaded ML models |
| `TORCH_DEVICE` | `cpu` | PyTorch device (`cpu`, `cuda`) |

## Dependencies

- **PyTorch / torchvision** — ML model inference
- **OpenCV** — Video frame processing
- **scikit-image / scipy** — Image and signal processing
- **rembg** — Background removal
- **soundfile** — Audio I/O
