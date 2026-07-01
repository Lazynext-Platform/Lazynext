# TensorFlow Serving — ML Model Configuration
#
# Models served via TensorFlow Serving for inference in pre-processing service.
# Source of truth for model metadata: services/pre-processing/tf_models/model_registry.yaml
#
# ── Models ─────────────────────────────────────────────────────────
# 1. whisper-large-v3   — Speech-to-text transcription
# 2. sam2_hiera_large   — Segment Anything 2 (rotoscoping)
# 3. realesrgan_x4plus  — Video upscaling (4x)
# 4. rife_v4.6          — Frame interpolation (optical flow)
#
# ── Quick Start ────────────────────────────────────────────────────
#   docker compose -f docker-compose.yml -f docker-compose.tensorflow.yml up -d
#   bash scripts/download-sam2-models.sh
#   bash scripts/tf-model-download.sh
#
# ── Model Verification ─────────────────────────────────────────────
#   curl http://localhost:8501/v1/models/whisper
#   curl http://localhost:8501/v1/models/sam2
#
# ── GPU Requirements ───────────────────────────────────────────────
#   whisper: 10 GB VRAM (fp16) or 6 GB (int8)
#   sam2:    12 GB VRAM (fp16)
#   rife:    8 GB VRAM
#   esrgan:  6 GB VRAM
#
# ── Deployment ─────────────────────────────────────────────────────
#   - K8s: model-warmup.yaml runs on GPU nodes at startup
#   - CI: ml-model-sync.yml downloads and verifies checksums
#   - Docker: services/pre-processing/Dockerfile.tensorflow
