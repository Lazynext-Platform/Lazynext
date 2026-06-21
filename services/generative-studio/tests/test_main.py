import pytest
from fastapi.testclient import TestClient
import os

from main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "generative-studio"}

def test_generate_video_fallback(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    response = client.post("/generate-video", json={
        "prompt": "a beautiful sunset",
        "width": 1024,
        "height": 576,
        "num_frames": 24
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["prompt"] == "a beautiful sunset"
    assert data["source"] == "dev-fallback"
    assert "asset_url" in data

def test_generate_video_production_no_key(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("REPLICATE_API_TOKEN", raising=False)
    response = client.post("/generate-video", json={
        "prompt": "a beautiful sunset",
        "width": 1024,
        "height": 576,
        "num_frames": 24
    })
    assert response.status_code == 503
    assert "Replicate API token not configured" in response.json()["detail"]

def test_dub_video_fallback(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    response = client.post("/dub", json={
        "clip_id": "clip_123",
        "target_language": "es",
        "text_to_dub": "Hola mundo"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["clip_id"] == "clip_123"
    assert data["language"] == "es"
    assert data["source"] == "dev-fallback"
    assert "audio_url" in data

def test_dub_video_production_no_key(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    response = client.post("/dub", json={
        "clip_id": "clip_123",
        "target_language": "es",
        "text_to_dub": "Hola mundo"
    })
    assert response.status_code == 503
    assert "ElevenLabs API key not configured" in response.json()["detail"]

def test_split_stems_fallback(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    response = client.post("/split-stems", json={
        "audio_id": "audio_999",
        "stems": 4
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["audio_id"] == "audio_999"
    assert data["source"] in ["demucs", "dev-fallback"]
    assert "stems" in data
    assert "vocals" in data["stems"]
    assert "drums" in data["stems"]

def test_upscale_video_fallback(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    response = client.post("/upscale", json={
        "video_id": "vid_lowres",
        "scale": 4
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["video_id"] == "vid_lowres"
    assert data["scale"] == 4
    assert data["source"] in ["realesrgan", "dev-fallback"]
    assert "output_url" in data

def test_nerf_extract_deprecated():
    response = client.post("/nerf-extract", json={
        "video_id": "vid_nerf_old"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "note" in data
    assert response.headers.get("Deprecation") == "true"
