# Lazynext Neural Engine

AI-powered media analysis and tagging — on-device inference for face detection, smart clip tagging, and optical flow.

## Models

- **Face detection** — SCRFD/YOLO-face via ONNX Runtime, with skin-tone heuristic fallback
- **Clip tagging** — Filename-based heuristics with upgrade path to CLIP embeddings via ONNX
- **Optical flow** — WebGPU compute shader for dense motion estimation (foundation for AI slow-motion and retiming)

## Features

- `onnx` — Enables real ONNX Runtime inference for all models
- Default (no features) — Lightweight heuristic fallbacks that work without ML dependencies
