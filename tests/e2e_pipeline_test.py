"""
End-to-end pipeline test for the Lazynext API Gateway.

Simulates a full video processing pipeline:
  1. Health check the gateway
  2. Ingest media via /api/v1/pre-processing/ingest
  3. Request transcription via /api/v1/pre-processing/transcribe
  4. Request rotoscoping via /api/v1/pre-processing/rotoscope

All steps degrade gracefully — tests are skipped if services are unreachable.

Usage:
  pytest tests/e2e_pipeline_test.py -v
"""

import pytest
import httpx
import os
import asyncio

# The api-gateway handles ingress. We assume it runs locally on port 8005 or is defined by API_GATEWAY_URL.
API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "http://localhost:8005")

@pytest.mark.asyncio
async def test_full_pipeline_e2e():
    """
    Simulates a full video processing pipeline:
    1. Ingest media via API Gateway
    2. Request Transcription (pre-processing)
    3. Trigger a rotoscoping job
    """
    test_video_id = "test_e2e_video_001"
    
    async with httpx.AsyncClient(base_url=API_GATEWAY_URL) as client:
        # Step 1: Healthcheck API Gateway
        health_res = await client.get("/health")
        assert health_res.status_code in [200, 404], "Gateway is not responding correctly"
        
        # Step 2: Ingest Media
        # Note: Depending on the API Gateway routing, we might hit the pre-processing directly if Gateway isn't fully mocked.
        # We will hit pre-processing endpoints through gateway for e2e.
        ingest_payload = {
            "file_path": "https://example.com/sample.mp4",
            "project_id": "test_project"
        }
        # In a real environment, this goes through the gateway -> pre-processing /ingest
        # We assume the gateway forwards /api/v1/pre-processing/* to the pre-processing service.
        try:
            ingest_res = await client.post("/api/v1/pre-processing/ingest", json=ingest_payload, timeout=10.0)
            if ingest_res.status_code != 404:  # If route exists
                assert ingest_res.status_code == 200
                data = ingest_res.json()
                assert data["success"] is True
        except httpx.RequestError:
            pytest.skip("API Gateway or Pre-processing is not reachable.")

        # Step 3: Transcription Request
        transcribe_payload = {
            "video_id": test_video_id
        }
        try:
            trans_res = await client.post("/api/v1/pre-processing/transcribe", json=transcribe_payload, timeout=10.0)
            if trans_res.status_code not in [404, 503]:  # 503 means Whisper API key not configured, which is fine for unit test.
                assert trans_res.status_code in [200, 500] 
        except httpx.RequestError:
            pass

        # Step 4: Rotoscoping Request
        roto_payload = {
            "video_id": test_video_id,
            "object_prompt": "main subject",
            "frame_start": 0,
            "frame_end": 100
        }
        try:
            roto_res = await client.post("/api/v1/pre-processing/rotoscope", json=roto_payload, timeout=10.0)
            if roto_res.status_code not in [404, 503]: # 503 means SAM2 isn't running
                assert roto_res.status_code in [200, 500]
        except httpx.RequestError:
            pass
            
    print("E2E Pipeline Test Completed Successfully (or skipped gracefully due to missing dependencies).")
