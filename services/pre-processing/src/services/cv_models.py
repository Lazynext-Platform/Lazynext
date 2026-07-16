"""
Computer Vision model services: SAM2 rotoscoping and NeRF 3D reconstruction.
 
Orchestrates ONNX inference pipelines for Segment Anything 2 (rotoscoping)
and Neural Radiance Fields (3D extraction), with TensorFlow Serving fallback
for SAM2 when ONNX is unavailable.
"""

import asyncio
import os
import httpx
from fastapi import HTTPException
from src.models import RotoscopeRequest, NeRFRequest
import sys
from src.services.pathsafe import safe_tmp_path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Gracefully degrade: CV pipelines need scipy/opencv/onnx which have no
# Python 3.13 wheel yet. When unavailable the /rotoscope and /nerf-extract
# endpoints respond 503 instead of crashing the service on import.
try:
    from nerf_pipeline import NerfPipeline, NerfConfig
    NERF_AVAILABLE = True
except ImportError:
    NerfPipeline = None  # type: ignore
    NerfConfig = None  # type: ignore
    NERF_AVAILABLE = False

try:
    from sam2_pipeline import Sam2Pipeline, Sam2Config
    SAM2_AVAILABLE = True
except ImportError:
    Sam2Pipeline = None  # type: ignore
    Sam2Config = None  # type: ignore
    SAM2_AVAILABLE = False

TF_SERVING_URL = os.getenv("TF_SERVING_URL", "http://tensorflow-serving:8501")

async def rotoscope_service(req: RotoscopeRequest):
    """Run SAM2 rotoscoping to segment an object across video frames.

    Executes the SAM2 ONNX pipeline in a thread pool, falling back to
    TensorFlow Serving if ONNX inference fails.

    Args:
        req: RotoscopeRequest with video_id, object_prompt, and frame range.

    Returns:
        dict with success, video_id, object, source (ONNX/TF), and mask_sequence_url.

    Raises:
        HTTPException: 503 if SAM2 is not installed or inference fails.
    """
    if not SAM2_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Rotoscoping unavailable: scipy/opencv/onnx are not installed (Python 3.13 wheel gap).",
        )

    video_path = safe_tmp_path(f"{req.video_id}.mp4")
    mask_dir = f"/tmp/masks_{req.video_id}"
    os.makedirs(mask_dir, exist_ok=True)
    
    config = Sam2Config()
    pipeline = Sam2Pipeline(config)
    
    # Run ONNX inference in a thread pool executor
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, pipeline.rotoscope, video_path, req.object_prompt, mask_dir)

    if not result.success:
        # Fallback to TensorFlow Serving if ONNX fails (e.g. model not found)
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{TF_SERVING_URL}/v1/models/sam2:predict",
                    json={"instances": [{"video_id": req.video_id, "prompt": req.object_prompt}]},
                    timeout=5.0
                )
                response.raise_for_status()
                result.success = True
                result.method = "tensorflow_serving_sam2"
                result.mask_sequence_path = mask_dir
        except httpx.RequestError:
            raise HTTPException(
                status_code=503,
                detail=f"Rotoscoping unavailable — ONNX inference failed ({result.error}) and TF Serving is unreachable."
            )

    return {
        "success": True,
        "video_id": req.video_id,
        "object": req.object_prompt,
        "source": result.method,
        "mask_sequence_url": f"file://{result.mask_sequence_path}" if result.mask_sequence_path else None,
    }

async def extract_nerf_service(req: NeRFRequest):
    """Extract a 3D NeRF model from video frames.

    Runs the NeRF pipeline (Nerfacto by default) in a thread pool executor
    to produce a 3D mesh and point cloud from input video.

    Args:
        req: NeRFRequest with video_id and method.

    Returns:
        dict with success, video_id, method, source, mesh_url, and point_cloud_url.

    Raises:
        HTTPException: 503 if NeRF extraction is unavailable.
    """
    if not NERF_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="NeRF extraction unavailable: scipy/opencv/onnx are not installed (Python 3.13 wheel gap).",
        )

    video_path = safe_tmp_path(f"{req.video_id}.mp4")
    output_dir = f"/tmp/nerf_{req.video_id}"

    config = NerfConfig(method=req.method)
    pipeline = NerfPipeline(config)

    # NeRF is inherently a long-running process
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, pipeline.extract_3d, video_path, output_dir)
    
    if not result.success:
        raise HTTPException(
            status_code=503,
            detail=f"NeRF extraction unavailable — {result.error}"
        )

    return {
        "success": True,
        "video_id": req.video_id,
        "method": req.method,
        "source": result.method,
        "mesh_url": f"file://{result.model_path}" if result.model_path else None,
        "point_cloud_url": f"file://{result.point_cloud_path}" if result.point_cloud_path else None,
    }
