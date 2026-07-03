"""Test suite for generative-studio FastAPI endpoints."""

import pytest
from fastapi.testclient import TestClient
import os

from main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "generative-studio"}

def test_generate_video_no_key(monkeypatch):
    monkeypatch.delenv("REPLICATE_API_TOKEN", raising=False)
    response = client.post("/generate-video", json={
        "prompt": "a beautiful sunset",
        "width": 1024,
        "height": 576,
        "num_frames": 24
    })
    assert response.status_code == 503
    assert "Replicate API token not configured" in response.json()["detail"]

def test_dub_video_no_key(monkeypatch):
    response = client.post("/dub", json={
        "clip_id": "clip_123",
        "target_language": "es",
        "text_to_dub": "Hola mundo"
    })
    assert response.status_code == 503
    assert "ElevenLabs API key not configured" in response.json()["detail"]

def test_split_stems_unavailable(monkeypatch):
    # This will fail unless demucs/spleeter is installed locally in the testing environment
    response = client.post("/split-stems", json={
        "audio_id": "audio_999",
        "stems": 4
    })
    # We expect 503 since we don't have the backends installed in CI by default
    assert response.status_code == 503
    assert "Stem separation unavailable" in response.json()["detail"]

def test_upscale_video_unavailable(monkeypatch):
    response = client.post("/upscale", json={
        "video_id": "vid_lowres",
        "scale": 4
    })
    # Should be 503 since the video won't exist or backends are missing
    assert response.status_code == 503
    assert "Upscaling unavailable" in response.json()["detail"]

def test_nerf_extract_deprecated():
    response = client.post("/nerf-extract", json={
        "video_id": "vid_nerf_old"
    })
    # Endpoint was removed — returns 410 Gone per Sunset header
    assert response.status_code == 410
    data = response.json()
    assert data["success"] is False
    assert "pre-processing" in data.get("error", "")
    assert response.headers.get("Deprecation") == "true"
