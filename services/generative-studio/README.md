# Generative Studio

**AI-powered video and audio generation service.**

## Port

`8001`

## Framework

Python — FastAPI + Uvicorn + PyTorch + Diffusers + Transformers

## Description

Generates and transforms video/audio content using diffusion models, neural style transfer, and audio synthesis. Endpoints include:

- `POST /generate-video` — Text-to-video generation via diffusion models
- `POST /style-transfer` — Neural style transfer on video frames
- `POST /generative-fill` — Inpainting / outpainting for video
- `POST /inpaint` — Object removal / scene completion
- `POST /dub` — AI voice dubbing for video clips
- `POST /overdub` — Audio overdubbing / voice cloning
- `POST /split-stems` — Source separation (vocals, drums, bass, other) via Demucs
- `POST /upscale` — Video super-resolution upscaling
- `POST /nerf-extract` — NeRF-based 3D scene reconstruction
- `POST /generate-avatar` — AI avatar / talking head generation

OpenTelemetry instrumentation included via `opentelemetry-instrumentation-fastapi`.

## How to Run

```bash
python -m uvicorn src.main:app --host 0.0.0.0 --port 8001 --reload
```

Or directly:

```bash
python src/main.py
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8001` | HTTP listen port |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | OpenTelemetry OTLP collector endpoint |
| `MODEL_CACHE_DIR` | — | Modal model cache directory |
| `TORCH_DEVICE` | `cpu` | PyTorch device (`cpu`, `cuda`) |

## Dependencies

- **PyTorch** (torch, torchaudio) — ML inference
- **Diffusers / Transformers / Accelerate** — Diffusion model pipelines
- **librosa / soundfile** — Audio processing
- **OpenTelemetry Collector** (optional) — Trace export
