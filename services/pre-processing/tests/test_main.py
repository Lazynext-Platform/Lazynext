import pytest
from fastapi.testclient import TestClient
import os

from main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "pre-processing"}

def test_transcribe_audio_dev_fallback(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    response = client.post("/transcribe", json={"video_id": "test_video_123"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["video_id"] == "test_video_123"
    assert data["source"] == "dev-fallback"
    assert "subtitles" in data
    assert len(data["subtitles"]) > 0

def test_transcribe_audio_production_no_key(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = client.post("/transcribe", json={"video_id": "test_video_123"})
    assert response.status_code == 503
    assert "Whisper API key not configured" in response.json()["detail"]

def test_process_video():
    response = client.post("/process", json={
        "video_id": "vid_456",
        "operations": ["auto_editor", "scene_detect", "unknown"]
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["video_id"] == "vid_456"
    assert len(data["operations_completed"]) == 3
    
    ops = {op["operation"]: op for op in data["operations_completed"]}
    assert "auto_editor" in ops
    assert "silence_removed_seconds" in ops["auto_editor"]
    
    assert "scene_detect" in ops
    assert "cuts" in ops["scene_detect"]
    
    assert "unknown" in ops
    assert ops["unknown"]["status"] == "unknown_operation"

def test_rotoscope_video_fallback(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    response = client.post("/rotoscope", json={
        "video_id": "vid_789",
        "object_prompt": "car"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["video_id"] == "vid_789"
    assert data["object_prompt"] == "car"
    assert data["model"] in ["sam2", "dev-fallback"]
    assert "mask_url" in data

def test_nerf_extract_fallback(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    response = client.post("/nerf-extract", json={
        "video_id": "vid_nerf",
        "method": "instant-ngp"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["video_id"] == "vid_nerf"
    assert data["method"] == "instant-ngp"
    assert data["model"] in ["nerfacto", "dev-fallback"]
    assert "model_url" in data
    assert "preview_url" in data
