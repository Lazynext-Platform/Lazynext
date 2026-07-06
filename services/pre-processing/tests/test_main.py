"""Test suite for pre-processing FastAPI endpoints."""

import pytest
from fastapi.testclient import TestClient
import os

from src.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "pre-processing"}

def test_transcribe_audio_missing_file(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("OPENAI_API_KEY", "dummy")
    response = client.post("/transcribe", json={"video_id": "test_video_123"})
    assert response.status_code == 404
    assert "Video file not found" in response.json()["detail"]

def test_transcribe_audio_production_no_key(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = client.post("/transcribe", json={"video_id": "test_video_123"})
    assert response.status_code == 503
    assert "Transcription service unavailable" in response.json()["detail"]

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

def test_rotoscope_video_unavailable(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    response = client.post("/rotoscope", json={
        "video_id": "vid_789",
        "object_prompt": "car"
    })
    # Will be 503 because TF serving is unreachable and local SAM2 fails
    assert response.status_code == 503
    assert "Rotoscoping unavailable" in response.json()["detail"]

def test_nerf_extract_unavailable(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    response = client.post("/nerf-extract", json={
        "video_id": "vid_nerf",
        "method": "instant-ngp"
    })
    # Will be 503 because nerfstudio is not installed
    assert response.status_code == 503
    assert "NeRF extraction unavailable" in response.json()["detail"]
