"""Test suite for pre-processing FastAPI endpoints."""

from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)

def test_read_root():
    """Health endpoint returns the service status payload."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "pre-processing"}

def test_transcribe_audio_missing_file(monkeypatch):
    """/transcribe returns 404 when the referenced video file is absent."""
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("GEMINI_API_KEY", "dummy")
    response = client.post("/transcribe", json={"video_id": "test_video_123"})
    assert response.status_code == 404
    assert "Video file not found" in response.json()["detail"]

def test_transcribe_audio_production_no_key(monkeypatch):
    """/transcribe returns 503 in production when no Gemini key is set."""
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    response = client.post("/transcribe", json={"video_id": "test_video_123"})
    assert response.status_code == 503
    assert "Transcription service unavailable" in response.json()["detail"]

def test_process_video():
    """/process runs the requested operations and reports each result,
    flagging unrecognized operations as `unknown_operation`."""
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
    """/rotoscope returns 503 when TF-serving and local SAM2 are both down."""
    monkeypatch.setenv("APP_ENV", "development")
    response = client.post("/rotoscope", json={
        "video_id": "vid_789",
        "object_prompt": "car"
    })
    # Will be 503 because TF serving is unreachable and local SAM2 fails
    assert response.status_code == 503
    assert "Rotoscoping unavailable" in response.json()["detail"]

def test_nerf_extract_unavailable(monkeypatch):
    """/nerf-extract returns 503 when nerfstudio is not installed."""
    monkeypatch.setenv("APP_ENV", "development")
    response = client.post("/nerf-extract", json={
        "video_id": "vid_nerf",
        "method": "instant-ngp"
    })
    # Will be 503 because nerfstudio is not installed
    assert response.status_code == 503
    assert "NeRF extraction unavailable" in response.json()["detail"]
